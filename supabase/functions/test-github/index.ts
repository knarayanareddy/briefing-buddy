import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

  try {
    const { p_a_t } = await req.json();
    if (!p_a_t) throw new Error("Missing GitHub Personal Access Token");

    const res = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `Bearer ${p_a_t}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Morning-Briefing-Bot/1.0"
      }
    });
    
    if (!res.ok) throw new Error(`GitHub validation failed: ${res.status}`);
    const data = await res.json();

    return new Response(JSON.stringify({ 
      ok: true, 
      username: data.login
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, message: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
