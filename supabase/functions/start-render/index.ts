import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";
import { processNextSegments } from "../_shared/renderPipeline.ts";
import { logAudit, checkLimitExceeded } from "../_shared/usage.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE, PUT",
};

/**
 * Start-Render Edge Function
 * - Fast path: Initializes the job and returns job_id immediately.
 * - Background path: Kicks off rendering via EdgeRuntime.waitUntil if available.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Unified authorization check
  const auth = await authorizeRequest(req, config);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), {
      status: auth.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { script_id } = await req.json();
    if (!script_id) throw new Error("script_id is required");

    const supabase = createClient(
      config.SUPABASE_URL!,
      config.SUPABASE_SERVICE_ROLE_KEY!
    );
    if (!auth.user_id) {
      return new Response(JSON.stringify({ error: "Unauthorized: missing user context" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const userId = auth.user_id;

    // ── PHASE 0: Usage Limits ────────────────────────────────────────────────
    const RENDER_LIMIT = parseInt(Deno.env.get("DAILY_RENDER_LIMIT") || "10");
    const { exceeded, current } = await checkLimitExceeded(supabase, userId, "render", RENDER_LIMIT);
    
    if (exceeded) {
      return new Response(JSON.stringify({ 
        error: "rate_limit_exceeded", 
        message: `Daily rendering limit reached (${current}/${RENDER_LIMIT}). Please try again tomorrow.` 
      }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 1. Fetch script and segments, enforcing ownership
    const { data: scriptData, error: scriptErr } = await supabase
      .from("briefing_scripts")
      .select("script_json")
      .eq("id", script_id)
      .eq("user_id", userId)
      .single();

    if (scriptErr) throw new Error("Script not found or access denied");
    const script = scriptData.script_json;
    const segments = script.timeline_segments;

    // 1b. Check for existing active job (Idempotency)
    const { data: existingJob } = await supabase
      .from("render_jobs")
      .select("id, status")
      .eq("script_id", script_id)
      .eq("user_id", userId)
      .in("status", ["queued", "rendering", "complete"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingJob) {
      console.log(`Reusing existing job ${existingJob.id} for script ${script_id}`);
      return new Response(JSON.stringify({ job_id: existingJob.id, status: existingJob.status, reused: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Create/Initialize render job (Atomic)
    const { data: job, error: jobErr } = await supabase
      .from("render_jobs")
      .insert({ script_id, user_id: userId, status: "queued" }) // Initialized as queued
      .select()
      .single();

    if (jobErr) throw jobErr;

    // 3. Initialize segments in DB
    const initialSegments = segments.map((s: any) => ({
      job_id: job.id,
      segment_id: s.segment_id,
      dialogue: s.dialogue,
      grounding_source_id: s.grounding_source_id,
      ui_action_card: s.ui_action_card,
      status: "queued",
    }));

    const { error: insErr } = await supabase
      .from("rendered_segments")
      .insert(initialSegments);

    if (insErr) throw insErr;

    // 4. Background Rendering Loop
    const runBackgroundRender = async () => {
      console.log(`Phase 2: Starting background render for job ${job.id}`);
      try {
        let isDone = false;
        while (!isDone) {
          const progress = await processNextSegments(supabase, job.id, config, 1);
          isDone = progress.isDone;
          if (isDone) break;
          // small pause between segments to be nice to providers
          await new Promise(r => setTimeout(r, 500));
        }
        console.log(`Phase 2: Background render complete for job ${job.id}`);
      } catch (err: any) {
        console.error(`Phase 2: Background render failed for job ${job.id}:`, err.message);
      }
    };

    // Kick off background work
    // Deno/Supabase Edge Functions support waitUntil
    if ((globalThis as any).EdgeRuntime?.waitUntil) {
      (globalThis as any).EdgeRuntime.waitUntil(runBackgroundRender());
    } else {
      // Best effort if not on EdgeRuntime
      runBackgroundRender();
    }

    // 4b. Audit Logging
    await logAudit(supabase, userId, "start_render", { job_id: job.id, script_id });

    // 5. Fast Return
    return new Response(JSON.stringify({ job_id: job.id, status: "started" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("start-render error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
