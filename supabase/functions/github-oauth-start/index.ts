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

    const GITHUB_CLIENT_ID = Deno.env.get("GITHUB_CLIENT_ID");
    if (!GITHUB_CLIENT_ID) {
      return new Response(JSON.stringify({
        url: `https://example.com/mock-github-auth?state=${userId}&redirect=${encodeURIComponent(redirect_url)}`,
        message: "GitHub OAuth client not configured. Using mock redirect."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Store state for CSRF protection
    const state = crypto.randomUUID();
    const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);

    await supabase.from("connector_configs").upsert({
      user_id: userId,
      provider: "github_oauth_state",
      config: { state, redirect_url },
      updated_at: new Date().toISOString(),
    });

    const scope = "repo read:user read:org notifications";
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirect_url)}&scope=${encodeURIComponent(scope)}&state=${state}`;

    return new Response(JSON.stringify({ url: authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, message: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
