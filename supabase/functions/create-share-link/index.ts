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
    const { script_id, job_id, expires_in_days = 7 } = await req.json();
    if (!script_id) throw new Error("Missing script_id");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expires_in_days);

    const { data, error } = await supabase
      .from("briefing_shares")
      .insert({
        user_id: userId,
        script_id,
        job_id: job_id || null,
        expires_at: expiresAt.toISOString(),
        scope: 'render'
      })
      .select("id")
      .single();

    if (error) throw error;

    // In a real implementation: Sign a JWT or return the ID as the token
    const token = data.id; 
    const shareUrl = `${config.SUPABASE_URL?.replace('.supabase.co', '.lovable.app')}/today?t=${token}`; // Mocking the frontend URL

    return new Response(JSON.stringify({ 
      share_id: data.id,
      token: token,
      share_url: shareUrl
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, message: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
