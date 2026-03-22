import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";
import { processNextSegments } from "../_shared/renderPipeline.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key",
};

/**
 * Render-Worker Edge Function
 * - Methodical + race-safe segment processing
 * - Handles manual resume and background "ticks"
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
    const { job_id, max_segments = 1 } = await req.json();
    if (!job_id) throw new Error("job_id is required");

    const supabase = createClient(
      config.SUPABASE_URL!,
      config.SUPABASE_SERVICE_ROLE_KEY!
    );

    const requestId = crypto.randomUUID();

    // 1. Acquire Atomic Lock
    // Allows takeover if lock is older than 5 minutes
    const { data: lockResult, error: lockErr } = await supabase.rpc("acquire_job_lock", {
      p_job_id: job_id,
      p_request_id: requestId,
      p_stale_interval: '5 minutes'
    });

    if (lockErr) throw lockErr;
    
    // Fallback if RPC isn't available: manual UPDATE
    if (lockResult === undefined) {
      const { data: updateRes, error: updateErr } = await supabase
        .from("render_jobs")
        .update({
          locked_at: new Date().toISOString(),
          locked_by: requestId,
          heartbeat_at: new Date().toISOString()
        })
        .match({ id: job_id })
        .or(`locked_at.is.null,locked_at.lt.${new Date(Date.now() - 300000).toISOString()}`)
        .select();

      if (updateErr || !updateRes || updateRes.length === 0) {
        return new Response(JSON.stringify({ ok: true, status: "locked", job_id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (lockResult === false) {
       return new Response(JSON.stringify({ ok: true, status: "locked", job_id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // 2. Process Next Segments
    const progress = await processNextSegments(supabase, job_id, config, max_segments);

    // 3. Release Lock
    await supabase
      .from("render_jobs")
      .update({ locked_at: null, locked_by: null, heartbeat_at: null })
      .match({ id: job_id, locked_by: requestId });

    return new Response(JSON.stringify({ ok: true, progress, job_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("render-worker error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
