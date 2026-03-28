import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";
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

    const clientId = Deno.env.get("SLACK_CLIENT_ID");
    const clientSecret = Deno.env.get("SLACK_CLIENT_SECRET");
    if (!clientId || !clientSecret) throw new Error("SLACK_CLIENT_ID or SLACK_CLIENT_SECRET not configured");

    const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);
    const userId = auth.user_id!;

    // 1. Verify state (CSRF protection)
    const { data: stateData } = await supabase
      .from("connector_configs")
      .select("config")
      .eq("user_id", userId)
      .eq("provider", "slack_oauth_state")
      .single();

    if (!stateData || (stateData.config as any).state !== state) {
      throw new Error("Invalid or expired OAuth state");
    }

    // 2. Exchange code for access token
    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: (stateData.config as any).redirect_url,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.ok) {
      throw new Error(`Slack token exchange failed: ${tokenData.error}`);
    }

    const botToken = tokenData.access_token;
    const teamName = tokenData.team?.name || "Unknown";
    const teamId = tokenData.team?.id || "";
    const botUserId = tokenData.bot_user_id || "";

    // 3. Encrypt and store bot token
    if (!config.CONNECTOR_SECRET_KEY) throw new Error("CONNECTOR_SECRET_KEY missing for encryption");
    const { ciphertextB64, ivB64 } = await encryptString(botToken, config.CONNECTOR_SECRET_KEY);

    await supabase.from("connector_secrets").upsert({
      user_id: userId,
      provider: "slack",
      secret_ciphertext: ciphertextB64,
      secret_iv: ivB64,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id, provider" });

    // 4. Store team info in connector_configs
    await supabase.from("connector_configs").upsert({
      user_id: userId,
      provider: "slack",
      config: {
        team_name: teamName,
        team_id: teamId,
        bot_user_id: botUserId,
        connected_via: "oauth",
        channels: "",
      },
      updated_at: new Date().toISOString(),
    });

    // 5. Update connector health and connections
    await supabase.from("connector_connections").upsert({
      user_id: userId,
      provider: "slack",
      status: "active",
      last_sync_at: new Date().toISOString(),
    });

    await supabase.from("connector_health").upsert({
      user_id: userId,
      provider: "slack",
      connected: true,
      status: "active",
      last_success_at: new Date().toISOString(),
    });

    // 6. Clean up temporary state
    await supabase.from("connector_configs").delete()
      .eq("user_id", userId)
      .eq("provider", "slack_oauth_state");

    return new Response(JSON.stringify({ ok: true, team: teamName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
