import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authorizeRequest(req, config);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const userId = auth.user_id!;
  const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);
  
  const url = new URL(req.url);
  const scriptId = url.searchParams.get("script_id");

  if (!scriptId) {
    return new Response(JSON.stringify({ error: "Missing script_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const { data: script, error: sError } = await supabase
      .from("briefing_scripts")
      .select("*")
      .eq("id", scriptId)
      .eq("user_id", userId)
      .single();

    if (sError) throw sError;

    const { data: job, error: jError } = await supabase
      .from("render_jobs")
      .select("*")
      .eq("script_id", scriptId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return new Response(JSON.stringify({ 
      script, 
      latest_job: job || null
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, message: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
