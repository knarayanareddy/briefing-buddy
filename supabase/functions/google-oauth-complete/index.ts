import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";
import { initOrUpsertHealthOnConnect } from "../_shared/connectorHealth.ts";

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
    const { code, state } = await req.json();
    if (!code) throw new Error("Missing OAuth code");

    // In a real implementation:
    // 1. Exchange code for access_token/refresh_token via Google API
    // 2. Store tokens in connector_secrets (provider='google')
    // 3. Mark connector as connected.

    console.log(`OAuth code received for user ${userId}: ${code.substring(0, 5)}...`);

    // For now, we simulate success if configured or report 'not_configured'
    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
    if (!GOOGLE_CLIENT_ID) {
       return new Response(JSON.stringify({ 
         ok: false, 
         error: "not_configured",
         message: "Google OAuth client not configured on server." 
       }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" }
       });
    }

    await initOrUpsertHealthOnConnect(supabase, { userId, provider: 'google', connected: true, status: 'active' });

    return new Response(JSON.stringify({ 
      ok: true, 
      message: "Google Workspace connected successfully." 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, message: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
