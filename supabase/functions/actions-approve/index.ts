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
    const body = await req.json();
    const { action_id, approve } = body;

    if (!action_id || typeof action_id !== "string") {
      return new Response(JSON.stringify({ error: "action_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (typeof approve !== "boolean") {
      return new Response(JSON.stringify({ error: "approve (boolean) is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch action and verify ownership
    const { data: action, error: fetchErr } = await supabase
      .from("actions")
      .select("id, status, user_id")
      .eq("id", action_id)
      .single();

    if (fetchErr || !action) {
      return new Response(JSON.stringify({ error: "Action not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (action.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (action.status !== "proposed") {
      return new Response(JSON.stringify({ error: `Cannot approve/cancel action in status '${action.status}'` }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const newStatus = approve ? "approved" : "canceled";
    const { error: updateErr } = await supabase
      .from("actions")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", action_id);

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ action_id, status: newStatus }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("actions-approve error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
