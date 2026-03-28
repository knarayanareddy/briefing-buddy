import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE, PUT",
};

/**
 * Scheduled Sync Orchestrator
 * Triggered by cron (pg_cron + pg_net) or manually.
 * Auth: accepts x-internal-api-key OR apikey header with a special x-cron-token.
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth: Internal Key (from Edge Functions or cron)
  const internalKey = req.headers.get("x-internal-api-key");
  const isAuthed = internalKey && internalKey === config.INTERNAL_API_KEY;

  if (!isAuthed) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { 
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const { provider, max_users = 20 } = await req.json().catch(() => ({}));

    const { data: activeUsers, error: userErr } = await supabase
      .from("briefing_profiles")
      .select("user_id")
      .order("updated_at", { ascending: false })
      .limit(max_users);

    if (userErr) throw userErr;

    const uniqueUserIds = [...new Set(activeUsers.map(u => u.user_id))];
    const results = [];

    for (const userId of uniqueUserIds) {
      try {
        const { data: profile } = await supabase
          .from("briefing_profiles")
          .select("id")
          .eq("user_id", userId)
          .limit(1)
          .single();

        if (!profile) continue;

        const syncUrl = `${config.SUPABASE_URL}/functions/v1/sync-required-connectors`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25_000);

        const res = await fetch(syncUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-api-key": config.INTERNAL_API_KEY!,
            "x-user-id": String(userId),
          },
          body: JSON.stringify({ profile_id: profile.id, mode: "best_effort" }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const outcome = res.ok ? await res.json() : { error: (await res.text()).slice(0, 200) };
        results.push({ user_id: userId, outcome });

      } catch (e: any) {
        results.push({ user_id: userId, error: (e.message || "timeout").slice(0, 100) });
      }
    }

    return new Response(JSON.stringify({
      processed_users: uniqueUserIds.length,
      results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e: any) {
    console.error("scheduled-sync error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
