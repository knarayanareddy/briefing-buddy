import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE, PUT",
};

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

    const { data: job, error: jobErr } = await supabase
      .from("render_jobs")
      .select("status, error")
      .eq("id", jobId)
      .eq("user_id", auth.user_id)
      .single();

    if (jobErr) throw new Error("Job not found or access denied");

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
