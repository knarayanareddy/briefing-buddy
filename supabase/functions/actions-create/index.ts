import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";
import { computeIdempotencyKey } from "../_shared/actionExecutors/idempotency.ts";
import { listSupportedActions } from "../_shared/actionExecutors/registry.ts";

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
    const { briefing_script_id, segment_id, provider, action_type, title, payload, evidence_source_ids } = body;

    // Validate required fields
    if (!provider || typeof provider !== "string") {
      return new Response(JSON.stringify({ error: "provider is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!action_type || typeof action_type !== "string") {
      return new Response(JSON.stringify({ error: "action_type is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const actionPayload = payload && typeof payload === "object" ? payload : {};
    const evidenceIds: string[] = Array.isArray(evidence_source_ids) ? evidence_source_ids.filter((s: any) => typeof s === "string") : [];

    const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);

    // Validate briefing_script_id ownership if provided
    if (briefing_script_id) {
      const { data: script } = await supabase
        .from("briefing_scripts")
        .select("id")
        .eq("id", briefing_script_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!script) {
        return new Response(JSON.stringify({ error: "briefing_script_id not found or not owned by user" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Validate evidence_source_ids exist for user
    if (evidenceIds.length > 0) {
      const { data: items } = await supabase
        .from("synced_items")
        .select("source_id")
        .eq("user_id", userId)
        .in("source_id", evidenceIds);
      const foundIds = new Set((items || []).map((i: any) => i.source_id));
      const missing = evidenceIds.filter(id => !foundIds.has(id));
      if (missing.length > 0) {
        return new Response(JSON.stringify({ error: "evidence_source_ids not found", missing }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Compute idempotency key
    const idempotencyKey = await computeIdempotencyKey(userId, provider, action_type, actionPayload);

    // Check for existing action with same idempotency key
    const { data: existing } = await supabase
      .from("actions")
      .select("id, status, idempotency_key")
      .eq("user_id", userId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({
        action_id: existing.id,
        status: existing.status,
        idempotency_key: existing.idempotency_key,
        existing: true,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insert new action
    const { data: action, error: insertErr } = await supabase
      .from("actions")
      .insert({
        user_id: userId,
        briefing_script_id: briefing_script_id || null,
        segment_id: segment_id || null,
        provider,
        action_type,
        status: "proposed",
        idempotency_key: idempotencyKey,
        payload: actionPayload,
        evidence_source_ids: evidenceIds,
      })
      .select("id, status, idempotency_key")
      .single();

    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({
      action_id: action.id,
      status: action.status,
      idempotency_key: action.idempotency_key,
      existing: false,
    }), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("actions-create error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
