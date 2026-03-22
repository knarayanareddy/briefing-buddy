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
 * Triggered by cron (e.g., every 1 hour).
 * Requires x-internal-api-key.
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // 1. Auth: Internal Key ONLY
  const internalKey = req.headers.get("x-internal-api-key");
  if (!internalKey || internalKey !== config.INTERNAL_API_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { 
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const { provider, max_users = 20 } = await req.json().catch(() => ({}));

    // 2. Identify active users (those who have at least one profile)
    // In a larger system, we'd filter for "active in last 7 days" or similar.
    const { data: activeUsers, error: userErr } = await supabase
      .from("briefing_profiles")
      .select("user_id")
      .order("updated_at", { ascending: false })
      .limit(max_users);

    if (userErr) throw userErr;

    const uniqueUserIds = [...new Set(activeUsers.map(u => u.user_id))];
    const results = [];

    // 3. Trigger sync-required-connectors for each user
    // Note: We use the Edge Function endpoint so it respects the per-user locking/cooldown logic.
    for (const userId of uniqueUserIds) {
      try {
        // Fetch first profile to use as a representative for required connectors
        const { data: profile } = await supabase
          .from("briefing_profiles")
          .select("id")
          .eq("user_id", userId)
          .limit(1)
          .single();

        if (!profile) continue;

        const syncUrl = `${config.SUPABASE_URL}/functions/v1/sync-required-connectors`;
        const res = await fetch(syncUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-api-key": config.INTERNAL_API_KEY!,
            "x-user-id": String(userId),
          },
          body: JSON.stringify({ profile_id: profile.id, mode: "best_effort" })
        });

        const outcome = res.ok ? await res.json() : { error: await res.text() };
        results.push({ user_id: userId, outcome });

      } catch (e: any) {
        results.push({ user_id: userId, error: e.message });
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
