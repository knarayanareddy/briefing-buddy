import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptString } from "../_shared/crypto.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authorizeRequest(req, config);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const { code, state } = await req.json().catch(() => ({}));
    if (!code || !state) throw new Error("Missing code or state");

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID") || "YOUR_GOOGLE_CLIENT_ID";
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") || "YOUR_GOOGLE_CLIENT_SECRET";
    
    const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);
    const userId = auth.user_id!;

    // 1. Verify State
    const { data: stateData } = await supabase
      .from("connector_configs")
      .select("config")
      .eq("user_id", userId)
      .eq("provider", "google_oauth_state")
      .single();

    if (!stateData || stateData.config.state !== state) {
      throw new Error("Invalid or expired OAuth state");
    }

    const redirectUri = stateData.config.redirect_url;

    // 2. Exchange Code for Tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri
      })
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokens = await tokenRes.json();
    
    // 3. Store the Refresh Token in connector_secrets securely
    if (tokens.refresh_token) {
      if (!config.CONNECTOR_SECRET_KEY) throw new Error("CONNECTOR_SECRET_KEY missing for encryption");
      const { ciphertextB64, ivB64 } = await encryptString(tokens.refresh_token, config.CONNECTOR_SECRET_KEY);
      await supabase.from("connector_secrets").upsert({
        user_id: userId,
        provider: "google",
        secret_ciphertext: ciphertextB64,
        secret_iv: ivB64,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id, provider" });
    } else {
      // If we didn't get a refresh token, it means the user already granted access previously.
      // We might need to handle this by forcing the prompt, but since we passed prompt=consent in start, usually we get it.
      console.warn("No refresh token received. May need to revoke access and try again.");
    }

    // Also store the access_token in connector_configs (temporarily, or just rely on refresh)
    // Actually best to just store tokens globally in secrets, but let's put access token in configs with an expiry
    await supabase.from("connector_configs").upsert({
      user_id: userId,
      provider: "google",
      config: { 
        access_token: tokens.access_token, 
        expires_at: Date.now() + (tokens.expires_in * 1000)
      }
    });

    // 4. Update Connector Health and Connections
    await supabase.from("connector_connections").upsert({
      user_id: userId,
      provider: "google",
      status: "active",
      last_sync_at: new Date().toISOString()
    });

    await supabase.from("connector_health").upsert({
      user_id: userId,
      provider: "google",
      connected: true,
      status: "active",
      last_success_at: new Date().toISOString()
    });

    // Clean up temporary state
    await supabase.from("connector_configs").delete().eq("user_id", userId).eq("provider", "google_oauth_state");

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
