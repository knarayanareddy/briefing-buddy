import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";
import { getExecutor } from "../_shared/actionExecutors/registry.ts";
import { redactSecrets } from "../_shared/sanitize.ts";

const corsHeaders = {
  // OWASP A05: Removed wildcard '*' and restricted to specific allowed origins
  // In production, these should be configured via environment variables or database
  "Access-Control-Allow-Origin": config.SUPABASE_URL || "https://*.e2b.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  // OWASP A05: Security Headers
  "Cross-Origin-Resource-Policy": "same-origin",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
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
    const { action_id } = body;

    if (!action_id || typeof action_id !== "string") {
      return new Response(JSON.stringify({ error: "action_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch action
    const { data: action, error: fetchErr } = await supabase
      .from("actions")
      .select("*")
      .eq("id", action_id)
      .single();

    if (fetchErr || !action) {
      return new Response(JSON.stringify({ error: "Action not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (action.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Idempotency: already completed
    if (action.status === "completed" && action.provider_result) {
      return new Response(JSON.stringify({
        action_id,
        status: "completed",
        provider_result: action.provider_result,
        idempotent: true,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Already executing — prevent double-fire
    if (action.status === "executing") {
      return new Response(JSON.stringify({ error: "Action is already executing", action_id, status: "executing" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Must be approved
    if (action.status !== "approved") {
      return new Response(JSON.stringify({ error: `Cannot execute action in status '${action.status}'. Must be 'approved'.` }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Defense-in-depth: verify evidence still belongs to user
    const evidenceIds: string[] = action.evidence_source_ids || [];
    if (evidenceIds.length > 0) {
      const { data: items } = await supabase
        .from("synced_items")
        .select("source_id")
        .eq("user_id", userId)
        .in("source_id", evidenceIds);
      const foundIds = new Set((items || []).map((i: any) => i.source_id));
      const missing = evidenceIds.filter((id: string) => !foundIds.has(id));
      if (missing.length > 0) {
        return new Response(JSON.stringify({ error: "evidence_source_ids no longer valid", missing }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Get executor
    const executor = getExecutor(action.action_type);
    if (!executor) {
      return new Response(JSON.stringify({ error: `No executor for action_type '${action.action_type}'` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Transition to executing — conditional on status so concurrent
    // double-fires serialize: only the request that flips approved→executing
    // proceeds; losers get 0 affected rows and must bail out.
    const { data: claimed, error: claimErr } = await supabase
      .from("actions")
      .update({ status: "executing", updated_at: new Date().toISOString() })
      .eq("id", action_id)
      .eq("status", "approved")
      .select("id");
    if (claimErr) throw claimErr;
    if (!claimed || claimed.length === 0) {
      return new Response(JSON.stringify({ error: "Action was claimed by another request", action_id, status: "conflict" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Execute
    const result = await executor(
      {
        action_type: action.action_type,
        payload: action.payload || {},
        user_id: userId,
        evidence_source_ids: evidenceIds,
      },
      {
        supabase,
        connectorSecretKey: config.CONNECTOR_SECRET_KEY || "",
      }
    );

    // Update final status
    const finalStatus = result.ok ? "completed" : "failed";
    await supabase.from("actions").update({
      status: finalStatus,
      provider_result: result.provider_result,
      error_code: result.error_code || null,
      error_message: result.error_message ? redactSecrets(result.error_message) : null,
      updated_at: new Date().toISOString(),
    }).eq("id", action_id);

    return new Response(JSON.stringify({
      action_id,
      status: finalStatus,
      provider_result: result.provider_result,
      error_code: result.error_code || null,
    }), { status: result.ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("actions-execute error:", redactSecrets(e.message));
    return new Response(JSON.stringify({ error: redactSecrets(e.message) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
