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

    const clientId = Deno.env.get("GITHUB_CLIENT_ID");
    const clientSecret = Deno.env.get("GITHUB_CLIENT_SECRET");
    if (!clientId || !clientSecret) throw new Error("GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET not configured");

    const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);
    const userId = auth.user_id!;

    // 1. Verify state (CSRF protection)
    const { data: stateData } = await supabase
      .from("connector_configs")
      .select("config")
      .eq("user_id", userId)
      .eq("provider", "github_oauth_state")
      .single();

    if (!stateData || (stateData.config as any).state !== state) {
      throw new Error("Invalid or expired OAuth state");
    }

    // 2. Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: (stateData.config as any).redirect_url,
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      throw new Error(`GitHub token exchange failed: ${tokenData.error_description || tokenData.error}`);
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) throw new Error("No access_token in GitHub response");

    // 3. Get user info
    const userRes = await fetch("https://api.github.com/user", {
      headers: { "Authorization": `Bearer ${accessToken}`, "Accept": "application/vnd.github+json" },
    });
    const ghUser = await userRes.json();

    // 4. Encrypt and store token
    if (!config.CONNECTOR_SECRET_KEY) throw new Error("CONNECTOR_SECRET_KEY missing for encryption");
    const { ciphertextB64, ivB64 } = await encryptString(accessToken, config.CONNECTOR_SECRET_KEY);

    await supabase.from("connector_secrets").upsert({
      user_id: userId,
      provider: "github",
      secret_ciphertext: ciphertextB64,
      secret_iv: ivB64,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id, provider" });

    // 5. Store user info in connector_configs
    await supabase.from("connector_configs").upsert({
      user_id: userId,
      provider: "github",
      config: {
        username: ghUser.login || "",
        avatar_url: ghUser.avatar_url || "",
        connected_via: "oauth",
        scopes: tokenData.scope || "",
        repos: "",
        index_prs: true,
        index_issues: true,
        index_commits: true,
      },
      updated_at: new Date().toISOString(),
    });

    // 6. Update connector health and connections
    await supabase.from("connector_connections").upsert({
      user_id: userId,
      provider: "github",
      status: "active",
      last_sync_at: new Date().toISOString(),
    });

    await supabase.from("connector_health").upsert({
      user_id: userId,
      provider: "github",
      connected: true,
      status: "active",
      last_success_at: new Date().toISOString(),
    });

    // 7. Clean up temporary state
    await supabase.from("connector_configs").delete()
      .eq("user_id", userId)
      .eq("provider", "github_oauth_state");

    return new Response(JSON.stringify({ ok: true, username: ghUser.login }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
