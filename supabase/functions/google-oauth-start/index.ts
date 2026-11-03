import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";
// import { cryptoRandom } from "../_shared/crypto.ts"; // Removed unused import causing test harness mismatch

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Helper to generate random state (Base64URL)
const generateState = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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

    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
    
    // SECURITY FIX: Generate random state and store in DB instead of using userId directly (prevents CSRF/Predictable State)
    const state = generateState();
    const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);
    
    // Store state in connector_configs temporarily (matching callback logic)
    await supabase.from("connector_configs").upsert({
      user_id: userId,
      provider: "google_oauth_state",
      config: { state, redirect_url, created_at: new Date().toISOString() },
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id, provider" });

    if (!GOOGLE_CLIENT_ID) {
       // Return a dummy link for hackathon mode or an error (using the NEW random state)
       return new Response(JSON.stringify({ 
         url: `https://example.com/mock-google-auth?state=${state}&redirect=${encodeURIComponent(redirect_url)}`,
         message: "Google OAuth client not configured. Using mock redirect."
       }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" }
       });
    }

    const scope = encodeURIComponent("https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email");
    // SECURITY FIX: Use random state instead of userId
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirect_url)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;

    return new Response(JSON.stringify({ url: authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, message: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});