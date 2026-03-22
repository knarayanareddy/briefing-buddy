import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";
import { getModule, ModuleId } from "../_shared/moduleManifest.ts";
import { syncRssForUser } from "../_shared/syncers/rss.ts";
import { syncGithubForUser } from "../_shared/syncers/github.ts";
import { syncGmailForUser } from "../_shared/syncers/gmail.ts";
import { syncSlackForUser } from "../_shared/syncers/slack.ts";
import { shouldSkipSyncNow } from "../_shared/connectorHealth.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE, PUT",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authorizeRequest(req, config);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const userId = auth.user_id!;
  const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const { profile_id, mode = "best_effort" } = await req.json().catch(() => ({}));
    if (!profile_id) throw new Error("profile_id is required.");

    // 1. Load Profile
    const { data: profile, error: profErr } = await supabase
      .from("briefing_profiles")
      .select("enabled_modules")
      .eq("id", profile_id)
      .eq("user_id", userId)
      .single();

    if (profErr || !profile) throw new Error("Profile not found or access denied.");

    // 2. Resolve Required Connectors
    const enabledModules = (profile.enabled_modules || []) as ModuleId[];
    const requiredProviders = new Set<string>();
    enabledModules.forEach(modId => {
      const mod = getModule(modId);
      if (mod) mod.requiredConnectors.forEach(c => requiredProviders.add(c.provider));
    });

    const results: any[] = [];
    const syncPromises: Promise<void>[] = [];

    // 3. Orchestrate Syncs
    for (const provider of requiredProviders) {
      if (provider === "weather") continue; // Public/Direct fetch, no connector sync needed

      syncPromises.push((async () => {
        try {
          // A. Check skip logic (backoff/cooldown)
          const { skip, reason } = await shouldSkipSyncNow(supabase, { userId, provider });
          if (skip && mode !== "force") {
            results.push({ provider, outcome: "skipped", reason });
            return;
          }

          // B. Atomic Lock attempt
          // Set cooldown_until to +30s to act as a lock
          const { data: updated, error: lockErr } = await supabase
            .from("connector_health")
            .update({ cooldown_until: new Date(Date.now() + 30000).toISOString() })
            .eq("user_id", userId)
            .eq("provider", provider)
            .or(`cooldown_until.is.null,cooldown_until.lt.${new Date().toISOString()}`)
            .select("connected, status");

          if (lockErr || !updated || updated.length === 0) {
            results.push({ provider, outcome: "skipped_locked", reason: "Sync already in progress or cooldown active." });
            return;
          }

          const health = updated[0];
          if (!health.connected || health.status === "missing") {
            // Unlock immediately since we won't sync
            await supabase.from("connector_health").update({ cooldown_until: null }).eq("user_id", userId).eq("provider", provider);
            results.push({ provider, outcome: "missing", reason: "Connector not configured." });
            return;
          }

          // C. Call Syncer
          let syncRes: any;
          if (provider === "rss") {
            syncRes = await syncRssForUser(supabase, { userId });
          } else if (provider === "github") {
            syncRes = await syncGithubForUser(supabase, { userId, secretKey: config.CONNECTOR_SECRET_KEY! });
          } else if (provider === "google") {
            syncRes = await syncGmailForUser(supabase, { userId });
          } else if (provider === "slack") {
            syncRes = await syncSlackForUser(supabase, { userId, secretKey: config.CONNECTOR_SECRET_KEY! });
          }

          results.push({ provider, outcome: "success", items_synced: syncRes?.items_synced || 0 });

          // D. Unlock after success (or let it expire naturally if we want to enforce a hard cooldown)
          await supabase.from("connector_health").update({ cooldown_until: null }).eq("user_id", userId).eq("provider", provider);

        } catch (e: any) {
          console.error(`Sync failed for ${provider}:`, e.message);
          results.push({ provider, outcome: "failed", error: e.message });
          // Note: recordSyncFailure is already called inside the syncers, so health is updated there.
          // We don't unlock here to respect the backoff set by recordSyncFailure.
        }
      })());
    }

    await Promise.all(syncPromises);

    return new Response(JSON.stringify({
      profile_id,
      required_providers: Array.from(requiredProviders),
      results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e: any) {
    console.error("sync-required-connectors error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
