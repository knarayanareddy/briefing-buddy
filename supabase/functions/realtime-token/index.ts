import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const auth = await authorizeRequest(req, config);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), {
      status: auth.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse optional body for context/instructions
    let instructions = "You are a helpful briefing assistant. Answer questions about the user's morning briefing. Always cite evidence when available. If you don't have enough evidence, say 'Not enough evidence to answer that.'";
    let context = "";

    try {
      const body = await req.json();
      if (body.instructions) instructions = body.instructions;
      if (body.context) context = body.context;
    } catch {
      // No body is fine
    }

    // We use Lovable AI gateway instead of OpenAI Realtime.
    // Return a session config that the frontend will use for text-based Q&A.
    // The frontend will call the briefing-voice-chat edge function for actual Q&A.
    return new Response(
      JSON.stringify({
        session: {
          mode: "lovable_ai",
          instructions,
          context,
          user_id: auth.user_id,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("realtime-token error:", e?.message);
    return new Response(
      JSON.stringify({ error: "Failed to create session" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
