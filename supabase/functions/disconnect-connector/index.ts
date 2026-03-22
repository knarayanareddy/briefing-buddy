import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE, PUT",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authorizeRequest(req, config);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const userId = auth.user_id!;
  const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);
  const { provider } = await req.json();

  if (!provider) {
    return new Response(JSON.stringify({ error: "Missing provider" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    // 1. Delete config
    await supabase.from("connector_configs").delete().eq("user_id", userId).eq("provider", provider);
    
    // 2. Clear health row (or reset it)
    await supabase.from("connector_health").update({
      status: "missing",
      connected: false,
      last_success_at: null,
      consecutive_failures: 0,
      items_synced_last_run: 0,
      last_error_message: "User disconnected connector."
    }).eq("user_id", userId).eq("provider", provider);

    // 3. Optional: Revoke OAuth tokens from connector_secrets if it were implemented
    await supabase.from("connector_secrets").delete().eq("user_id", userId).eq("provider", provider);

    return new Response(JSON.stringify({ ok: true, message: `Disconnected ${provider} successfully.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e: any) {
    console.error("disconnect-connector error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
