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
 * Render-Worker Edge Function
 * Processes segments for a given render job.
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

    // Process next segments
    const progress = await processNextSegments(supabase, job_id, config, max_segments);

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
