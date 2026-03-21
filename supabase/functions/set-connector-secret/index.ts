import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";
import { encryptString } from "../_shared/crypto.ts";
import { redactSecrets } from "../_shared/sanitize.ts";
import { logAudit } from "../_shared/usage.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await authorizeRequest(req, config);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  
  if (auth.mode === "internal_key" || !auth.user_id) {
    return new Response(JSON.stringify({ error: "Valid JWT session required to set personal secrets." }), { 
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  const userId = auth.user_id;

  try {
    if (!config.CONNECTOR_SECRET_KEY) {
      throw new Error("Server not configured to securely store connector secrets.");
    }

    const payload = await req.json();
    const provider = payload.provider;
    const secret = payload.secret;

    if (!provider || !secret) {
      throw new Error("Missing provider or secret block entirely in payload.");
    }

    const { ciphertextB64, ivB64 } = await encryptString(secret, config.CONNECTOR_SECRET_KEY);
    const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);

    const { error: secretErr } = await supabase
      .from("connector_secrets")
      .upsert({ 
        user_id: userId, 
        provider, 
        secret_ciphertext: ciphertextB64, 
        secret_iv: ivB64,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id, provider" });

    if (secretErr) throw secretErr;

    const { error: connErr } = await supabase
      .from("connector_connections")
      .upsert({
        user_id: userId,
        provider,
        status: "active",
        metadata: {} 
      }, { onConflict: "user_id, provider" });

    if (connErr) throw connErr;

    // ── Update Connector Health (Telemetry)
    const { initOrUpsertHealthOnConnect } = await import("../_shared/connectorHealth.ts");
    await initOrUpsertHealthOnConnect(supabase, { userId, provider, connected: true, status: "active" });

    // ── Audit Logging
    await logAudit(supabase, userId, "set_connector_secret", { provider });

    return new Response(JSON.stringify({ ok: true, message: "Token strongly encrypted & protected." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e: any) {
    console.error(`set-connector-secret execution constraint failure for ${auth.user_id}:`, redactSecrets(e.message));
    return new Response(JSON.stringify({ error: redactSecrets(e.message) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
