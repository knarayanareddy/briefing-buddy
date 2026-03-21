import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";
import { planSegments } from "../_shared/planner.ts";
import { AssembledUserData } from "../_shared/userData.ts";
import { ModuleId } from "../_shared/moduleManifest.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authorizeRequest(req, config);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);
  const userId = auth.user_id!;

  try {
    const { profile_id } = await req.json().catch(() => ({}));
    if (!profile_id) throw new Error("Missing profile_id");

    // 1. Fetch profile
    const { data: profile } = await supabase
      .from("briefing_profiles")
      .select("enabled_modules, module_settings, module_catalog_version")
      .eq("id", profile_id)
      .eq("user_id", userId)
      .single();

    if (!profile) throw new Error("Profile not found");

    // 2. Trigger background sync (Best effort)
    const triggerSync = async () => {
      try {
        const syncUrl = `${config.SUPABASE_URL}/functions/v1/sync-required-connectors`;
        await fetch(syncUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`,
            "apikey": config.SUPABASE_SERVICE_ROLE_KEY!,
          },
          body: JSON.stringify({ profile_id, mode: "best_effort" })
        });
      } catch (err) {
        console.warn("Background sync failed during preview:", err);
      }
    };

    if ((globalThis as any).EdgeRuntime?.waitUntil) {
      (globalThis as any).EdgeRuntime.waitUntil(triggerSync());
    } else {
      triggerSync();
    }

    // 3. Call assemble-user-data internally
    const assembleUrl = `${config.SUPABASE_URL}/functions/v1/assemble-user-data`;
    const assembleRes = await fetch(assembleUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`,
        "apikey": config.SUPABASE_SERVICE_ROLE_KEY!,
      },
      body: JSON.stringify({ profile_id }),
    });

    if (!assembleRes.ok) throw new Error("Data assembly failed for preview");

    const assembled = await assembleRes.json();
    const userData = assembled.user_data as AssembledUserData;
    const enabledModules = (assembled.meta?.enabled_modules || profile.enabled_modules) as ModuleId[];
    const moduleSettings = profile.module_settings || {};
    const connectorStatus = assembled.meta?.connector_status_summary || [];

    // 4. Run Planner (Pure logic)
    const segmentPlans = planSegments({ enabledModules, moduleSettings, userData });

    // 5. Build Safe Summary
    const by_module: Record<string, number> = {};
    const ordered = segmentPlans.map((p, idx) => {
      // Track counts
      const modId = p.grounding_source_ids[0]?.split(":")[0] || "unknown";
      by_module[modId] = (by_module[modId] || 0) + 1;

      return {
        order_index: idx + 1,
        segment_kind: p.segment_kind,
        title: p.title.slice(0, 60), // Truncate for safety
        grounding_source_ids: p.grounding_source_ids,
        action: p.ui_action_suggestion ? {
          is_active: p.ui_action_suggestion.is_active,
          card_type: p.ui_action_suggestion.card_type,
          title: p.ui_action_suggestion.title,
          action_button_text: p.ui_action_suggestion.action_button_text
        } : null
      };
    });

    return new Response(JSON.stringify({
      profile_id,
      module_catalog_version: profile.module_catalog_version,
      enabled_modules: enabledModules,
      connector_status: connectorStatus,
      plan_summary: {
        total_segments: ordered.length,
        by_module: Object.entries(by_module).map(([module_id, segments]) => ({ module_id, segments })),
        ordered
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("preview-plan error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
