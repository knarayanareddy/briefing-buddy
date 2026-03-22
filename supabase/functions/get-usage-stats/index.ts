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
  
  try {
    const { data: usage, error: uError } = await supabase
      .from("briefing_usage_limits")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (uError) throw uError;

    // Fallbacks if usage row doesn't exist yet
    const generate_count = usage?.generate_count || 0;
    const render_count = usage?.render_count || 0;
    const generate_limit = usage?.generate_limit || 10;
    const render_limit = usage?.render_limit || 5;

    return new Response(JSON.stringify({ 
      generate_count,
      render_count,
      generate_limit,
      render_limit,
      generate_percent: Math.round((generate_count / generate_limit) * 100),
      render_percent: Math.round((render_count / render_limit) * 100)
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, message: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
