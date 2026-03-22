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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await authorizeRequest(req, config);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (!auth.user_id) {
    return new Response(JSON.stringify({ error: "Unauthorized: missing user context" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const url = new URL(req.url);
    const scriptId = url.searchParams.get("script_id");
    
    if (!scriptId) throw new Error("script_id query parameter is required");

    const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);
    const userId = auth.user_id;

    const { data: script, error: scriptErr } = await supabase
      .from("briefing_scripts")
      .select("id, created_at, persona, profile_id, trigger, scheduled_for, script_json")
      .eq("id", scriptId)
      .eq("user_id", userId)
      .single();

    if (scriptErr) throw new Error("Script not found or access denied");

    const { data: latestJob, error: jobErr } = await supabase
      .from("render_jobs")
      .select("id, status, error, created_at")
      .eq("script_id", scriptId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (jobErr && jobErr.code !== 'PGRST116') {
      console.warn("Error fetching latest job:", jobErr.message);
    }

    return new Response(JSON.stringify({ 
      script, 
      latest_job: latestJob || null 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e: any) {
    console.error("get-briefing error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
