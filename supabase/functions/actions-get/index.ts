import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authorizeRequest(req, config);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const userId = auth.user_id!;

  try {
    // Support both GET ?action_id=xxx and POST { action_id }
    let actionId: string | null = null;
    if (req.method === "GET") {
      const url = new URL(req.url);
      actionId = url.searchParams.get("action_id");
    } else {
      const body = await req.json();
      actionId = body.action_id;
    }

    if (!actionId) {
      return new Response(JSON.stringify({ error: "action_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: action, error } = await supabase
      .from("actions")
      .select("id, briefing_script_id, segment_id, provider, action_type, status, payload, evidence_source_ids, provider_result, error_code, error_message, created_at, updated_at")
      .eq("id", actionId)
      .eq("user_id", userId)
      .single();

    if (error || !action) {
      return new Response(JSON.stringify({ error: "Action not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify(action), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("actions-get error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
