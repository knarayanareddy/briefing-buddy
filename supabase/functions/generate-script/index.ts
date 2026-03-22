import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";
import { sanitizeDeep, redactSecrets, sanitizeUserData } from "../_shared/sanitize.ts";
import { buildAllowedIds, validateGroundingIds } from "../_shared/grounding.ts";
import { planSegments, planBriefing } from "../_shared/planner.ts";
import { realizeSegment, repairSegment } from "../_shared/realizer.ts";
import { BriefingSegmentSchema, validateBriefingScript } from "../_shared/briefingSchema.ts";
import { AssembledUserData } from "../_shared/userData.ts";
import { ModuleId } from "../_shared/moduleManifest.ts";
import { migrateProfileIfNeeded } from "../_shared/profileMigration.ts";
import { logAudit, checkLimitExceeded } from "../_shared/usage.ts";
import { computePlanHash } from "../_shared/planHash.ts";

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

  const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);
  const userId = auth.user_id!;

  // ── PHASE 0: Usage Limits ────────────────────────────────────────────────
  const GEN_LIMIT = parseInt(Deno.env.get("DAILY_GENERATE_LIMIT") || "10");
  const { exceeded, current } = await checkLimitExceeded(supabase, userId, "generate", GEN_LIMIT);
  
  if (exceeded) {
    return new Response(JSON.stringify({ 
      error: "rate_limit_exceeded", 
      message: `Daily generation limit reached (${current}/${GEN_LIMIT}). Please try again tomorrow.` 
    }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { profile_id, user_preferences, user_data: callerUserData, trigger = "manual", scheduled_for, title } = body;

    let sanitizedData: AssembledUserData;
    let persona = "Professional Executive";
    let enabledModules: ModuleId[] = [];
    let moduleSettings: Record<string, any> = {};

    // ── UTILITIES ───────────────────────────────────────────────────────────
    const checkStaleAndSyncRss = async () => {
      if (!profile_id) return;
      try {
        const { data: latestState } = await supabase
          .from("rss_feed_state")
          .select("last_success_at")
          .eq("user_id", userId)
          .order("last_success_at", { ascending: false })
          .limit(1);

        const lastSuccess = latestState?.[0]?.last_success_at;
        const isStale = !lastSuccess || (Date.now() - new Date(lastSuccess).getTime() > 2 * 60 * 60 * 1000);

        if (isStale) {
          const syncUrl = `${config.SUPABASE_URL}/functions/v1/sync-news`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 800);

          await fetch(syncUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": config.SUPABASE_PUBLISHABLE_KEY!,
              "x-internal-api-key": Deno.env.get("INTERNAL_API_KEY") || "",
              "x-user-id": userId
            },
            signal: controller.signal
          }).catch(() => {});
          clearTimeout(timeoutId);
        }
      } catch (err) {
        console.warn("Foreground stale RSS sync failed:", err);
      }
    };

    const triggerSync = async () => {
      if (!profile_id) return;
      try {
        const syncUrl = `${config.SUPABASE_URL}/functions/v1/sync-required-connectors`;
        await fetch(syncUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": config.SUPABASE_PUBLISHABLE_KEY!,
            "x-internal-api-key": Deno.env.get("INTERNAL_API_KEY") || "",
            "x-user-id": userId
          },
          body: JSON.stringify({ profile_id, mode: "best_effort" })
        });
      } catch (err) {
        console.warn("Background sync-required-connectors failed:", err);
      }
    };

    // ── PHASE 1: Profile-driven path ─────────────────────────────────────────
    if (profile_id) {
      // Load profile
      const { data: profile } = await supabase
        .from("briefing_profiles")
        .select("persona, enabled_modules, module_settings, module_catalog_version")
        .eq("id", profile_id)
        .eq("user_id", userId)
        .single();

      if (profile) {
        const migrated = migrateProfileIfNeeded(profile as any);
        persona = migrated.persona || "Professional Executive";
        enabledModules = (migrated.enabled_modules || []) as ModuleId[];
        moduleSettings = migrated.module_settings || {};
      }

      // 1b: Optional Stale RSS Refresh (800ms limit)
      await checkStaleAndSyncRss();

      // 1c: Call assemble-user-data internally
      const assembleUrl = `${config.SUPABASE_URL}/functions/v1/assemble-user-data`;
      const assembleRes = await fetch(assembleUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": config.SUPABASE_PUBLISHABLE_KEY!,
          "x-internal-api-key": Deno.env.get("INTERNAL_API_KEY") || "",
          "x-user-id": userId
        },
        body: JSON.stringify({ profile_id }),
      });

      if (!assembleRes.ok) {
        const err = await assembleRes.text();
        throw new Error(`assemble-user-data failed: ${err.slice(0, 200)}`);
      }

      const assembled = await assembleRes.json();
      sanitizedData = sanitizeUserData(assembled.user_data) as AssembledUserData;

      // Extract resolved modules from assembly for consistency
      if (assembled.meta?.enabled_modules?.length > 0) {
        enabledModules = assembled.meta.enabled_modules;
      }
    } else {
      // ── Fallback: caller-supplied user_data (mock mode) ────────────────────
      if (!callerUserData) {
        return new Response(JSON.stringify({ error: "missing_data", message: "Provide profile_id or user_data" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      sanitizedData = sanitizeUserData(callerUserData) as AssembledUserData;
      if (user_preferences?.persona) persona = user_preferences.persona;
      enabledModules = ["weather", "calendar_today", "ai_news_delta", "github_prs", "inbox_triage", "focus_plan"] as ModuleId[];
    }

    // ── PHASE 1 cont: Build allowed IDs ──────────────────────────────────────
    const allowedSourceIds = buildAllowedIds(sanitizedData);

    // ── PHASE 2: Deterministic planner ────────────────────────────────────────
    const segmentPlans = planSegments({ enabledModules, moduleSettings, userData: sanitizedData });

    if (segmentPlans.length === 0) {
      return new Response(JSON.stringify({
        error: "no_content",
        message: "No briefing content available. Please sync your connectors first.",
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── PHASE 2b: Plan Hash Check ──────────────────────────────────────────
    const planHash = await computePlanHash(segmentPlans);
    const TTL_HOURS = 12;

    const { data: cachedScript } = await supabase
      .from("briefing_scripts")
      .select("id, script_json")
      .eq("user_id", userId)
      .eq("plan_hash", planHash)
      .gt("created_at", new Date(Date.now() - TTL_HOURS * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (cachedScript) {
      console.log(`Cache Hit for plan ${planHash}. Reusing script ${cachedScript.id}`);
      
      // Still trigger background sync
      if ((globalThis as any).EdgeRuntime?.waitUntil) {
        (globalThis as any).EdgeRuntime.waitUntil(triggerSync());
      } else {
        triggerSync();
      }

      // Skip REALIZER (Phase 3) and Module State Update (Phase 5) to save cost/latency
      return new Response(JSON.stringify({ 
        script_id: cachedScript.id, 
        script_json: cachedScript.script_json,
        cached: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── PHASE 3: LLM Realizer ───────────────────────────────────────────────
    const timeline_segments = [];
    for (let i = 0; i < segmentPlans.length; i++) {
        const plan = segmentPlans[i];
        let segment = null;
        let lastRawOutput = "";
        let lastError = "";

        // Attempt 1: initial realize
        try {
            const realized = await realizeSegment(i + 1, plan, persona, config.OPENAI_API_KEY!);
            lastRawOutput = JSON.stringify(realized);
            const parsed = BriefingSegmentSchema.parse(realized);
            validateSegmentGrounding(parsed, plan.grounding_source_ids);
            segment = { ...parsed, dialogue: redactSecrets(parsed.dialogue) };
        } catch (err: any) {
            lastError = err.message;
            console.warn(`Segment ${i + 1} attempt 1 failed: ${err.message}`);
        }

        // Attempt 2: repair
        if (!segment) {
            try {
                const repaired = await repairSegment(i + 1, plan, lastRawOutput, lastError, persona, config.OPENAI_API_KEY!);
                const parsed = BriefingSegmentSchema.parse(repaired);
                validateSegmentGrounding(parsed, plan.grounding_source_ids);
                segment = { ...parsed, dialogue: redactSecrets(parsed.dialogue) };
            } catch (repairErr: any) {
                console.warn(`Segment ${i + 1} repair failed: ${repairErr.message}. Fallback.`);
            }
        }

        // Fallback
        if (!segment) {
            const factValues = Object.values(plan.facts).filter(v => typeof v === "string" || typeof v === "number");
            segment = {
                segment_id: i + 1,
                dialogue: redactSecrets(`${plan.title}. ${factValues.slice(0, 2).join(". ")}.`),
                grounding_source_id: plan.grounding_source_ids[0],
                runware_b_roll_prompt: null,
                ui_action_card: plan.ui_action_suggestion,
            };
        }
        timeline_segments.push(segment);
    }

    // ── PHASE 4: Persistence ────────────────────────────────────────────────
    const scriptJson = {
      script_metadata: { persona_applied: persona, total_estimated_segments: timeline_segments.length },
      timeline_segments,
    };

    try {
      const validated = validateBriefingScript(scriptJson);
      validateGroundingIds(validated.timeline_segments, allowedSourceIds);
    } catch (validErr: any) {
      return new Response(JSON.stringify({ error: "invalid_script", message: validErr.message }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const insertPayload: any = { user_id: userId, persona, script_json: scriptJson, plan_hash: planHash, trigger };
    if (profile_id) insertPayload.profile_id = profile_id;
    if (scheduled_for) insertPayload.scheduled_for = scheduled_for;
    if (title) insertPayload.title = title;

    const { data: scriptData, error: dbErr } = await supabase
      .from("briefing_scripts")
      .insert(insertPayload)
      .select().single();

    if (dbErr) throw dbErr;

    // 4b: Audit
    await logAudit(supabase, userId, "generate_script", { 
      script_id: scriptData.id, 
      profile_id,
      segments_count: timeline_segments.length 
    });

    // 4c: Background Sync
    if ((globalThis as any).EdgeRuntime?.waitUntil) {
      (globalThis as any).EdgeRuntime.waitUntil(triggerSync());
    } else {
      triggerSync();
    }

    // ── PHASE 5: Module State Update ────────────────────────────────────────
    if (profile_id && enabledModules.length > 0) {
      const now = new Date().toISOString();
      let newsDeltaTs = now;
      if (sanitizedData.news_items && sanitizedData.news_items.length > 0) {
        const newest = sanitizedData.news_items
          .map(n => n.published_time_iso)
          .sort().reverse()[0];
        if (newest) newsDeltaTs = newest;
      }

      const moduleStateRows = enabledModules.map(modId => ({
        user_id: userId,
        module_id: modId,
        last_seen_at: modId === "ai_news_delta" ? newsDeltaTs : now,
        updated_at: now,
      }));

      await supabase.from("briefing_module_state").upsert(moduleStateRows, { onConflict: "user_id,module_id" });
    }

    return new Response(JSON.stringify({ script_id: scriptData.id, script_json: scriptJson }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("generate-script error:", e.message);
    return new Response(JSON.stringify({ error: redactSecrets(e.message).slice(0, 200) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/** Validate that the realized segment's grounding IDs are a subset of the plan's allowed IDs. */
function validateSegmentGrounding(parsed: any, allowedIds: string[]): void {
  const ids = String(parsed.grounding_source_id || "")
    .split(",").map((s: string) => s.trim()).filter(Boolean);
  if (ids.length === 0) throw new Error("Missing grounding_source_id");
  const invalid = ids.filter((id: string) => !allowedIds.includes(id));
  if (invalid.length > 0) throw new Error(`Invalid grounding IDs: ${invalid.join(", ")}`);
}
