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

  try {
    const { redirect_url } = await req.json();
    if (!redirect_url) throw new Error("Missing redirect_url");

    const SLACK_CLIENT_ID = Deno.env.get("SLACK_CLIENT_ID");
    if (!SLACK_CLIENT_ID) {
      return new Response(JSON.stringify({
        url: `https://example.com/mock-slack-auth?state=${userId}&redirect=${encodeURIComponent(redirect_url)}`,
        message: "Slack OAuth client not configured. Using mock redirect."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Store state for CSRF protection
    const state = crypto.randomUUID();
    const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);

    await supabase.from("connector_configs").upsert({
      user_id: userId,
      provider: "slack_oauth_state",
      config: { state, redirect_url },
      updated_at: new Date().toISOString(),
    });

    // Slack OAuth scopes for bot: read channels, post messages, identify
    const scopes = [
      "channels:history",
      "channels:read",
      "chat:write",
      "users:read",
      "team:read",
    ].join(",");

    const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirect_url)}&state=${state}`;

    return new Response(JSON.stringify({ url: authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, message: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
