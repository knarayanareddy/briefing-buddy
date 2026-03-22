import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const server_env = {
      OPENAI_API_KEY: { present: !!Deno.env.get("OPENAI_API_KEY") },
      FAL_KEY: { present: !!Deno.env.get("FAL_KEY") },
      RUNWARE_API_KEY: { present: !!Deno.env.get("RUNWARE_API_KEY") },
      CONNECTOR_SECRET_KEY: { present: !!Deno.env.get("CONNECTOR_SECRET_KEY") },
      INTERNAL_API_KEY: { present: !!Deno.env.get("INTERNAL_API_KEY") },
    };

    const overall_ok = Object.values(server_env).every(v => v.present);

    return new Response(JSON.stringify({ 
      overall: { ok: overall_ok },
      server_env,
      provider_checks: {
        openai: { ok: server_env.OPENAI_API_KEY.present, detail: server_env.OPENAI_API_KEY.present ? "Ready" : "Missing Key" },
        fal: { ok: server_env.FAL_KEY.present, detail: server_env.FAL_KEY.present ? "Ready" : "Missing Key" },
        runware: { ok: server_env.RUNWARE_API_KEY.present, detail: server_env.RUNWARE_API_KEY.present ? "Ready" : "Missing Key" }
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, message: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
