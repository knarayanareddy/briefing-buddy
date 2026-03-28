import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";
import { processNextSegments } from "../_shared/renderPipeline.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE, PUT",
};

/**
 * Job-Status Edge Function
 * Returns current render job status + segments.
 * Also drives rendering: if there are queued/stalled segments, processes the next one.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await authorizeRequest(req, config);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), {
      status: auth.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const jobId = url.searchParams.get("job_id");
    if (!jobId) throw new Error("job_id is required");

    if (!auth.user_id) {
      return new Response(JSON.stringify({ error: "Unauthorized: missing user context" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(
      config.SUPABASE_URL!,
      config.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify job ownership
    const { data: job, error: jobErr } = await supabase
      .from("render_jobs")
      .select("status, error")
      .eq("id", jobId)
      .eq("user_id", auth.user_id)
      .single();

    if (jobErr) throw new Error("Job not found or access denied");

    // Fetch segments
    const { data: segments, error: segErr } = await supabase
      .from("rendered_segments")
      .select("segment_id, avatar_video_url, b_roll_image_url, ui_action_card, dialogue, grounding_source_id, status, error")
      .eq("job_id", jobId)
      .order("segment_id", { ascending: true });

    if (segErr) throw segErr;

    const stats = {
      total: segments?.length || 0,
      queued: segments?.filter((s: any) => s.status === "queued").length || 0,
      rendering: segments?.filter((s: any) => s.status === "rendering").length || 0,
      complete: segments?.filter((s: any) => s.status === "complete").length || 0,
      failed: segments?.filter((s: any) => s.status === "failed").length || 0,
    };

    const percent_complete = stats.total > 0 
      ? Math.floor((stats.complete / stats.total) * 100) 
      : 0;

    // ── Client-Driven Rendering ─────────────────────────────────────────
    // If the job isn't done yet, unstall any "rendering" segments that have
    // been stuck for >60s and process the next queued segment.
    const jobNotDone = job.status !== "complete" && job.status !== "failed";
    const hasWork = stats.queued > 0 || stats.rendering > 0;

    if (jobNotDone && hasWork) {
      // Unstall segments stuck in "rendering" for >60 seconds
      const staleThreshold = new Date(Date.now() - 60_000).toISOString();
      await supabase
        .from("rendered_segments")
        .update({ status: "queued" })
        .eq("job_id", jobId)
        .eq("status", "rendering")
        .lt("updated_at", staleThreshold);

      // Process next segment in background (fire-and-forget within this request)
      // Using waitUntil if available, otherwise inline
      const renderWork = async () => {
        try {
          await processNextSegments(supabase, jobId, config, 1);
        } catch (e: any) {
          console.warn(`Background render tick failed: ${e.message}`);
        }
      };

      if ((globalThis as any).EdgeRuntime?.waitUntil) {
        (globalThis as any).EdgeRuntime.waitUntil(renderWork());
      } else {
        // Fire and don't await — let it run while response is sent
        renderWork();
      }
    }

    return new Response(
      JSON.stringify({ 
        status: job.status, 
        progress: { ...stats, percent_complete },
        segments: segments || [] 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("job-status error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
