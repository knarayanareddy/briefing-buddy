import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authorizeRequest(req, config);
  if (!auth.ok) return json(auth.body, auth.status);
  if (!auth.user_id) return json({ error: "unauthorized" }, 401);

  const url = new URL(req.url);
  const provider = url.searchParams.get("provider");

  if (!provider) return json({ error: "Missing provider" }, 400);

  try {
    const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);

    // Owner-scoped (service role would otherwise bypass RLS).
    const { data, error } = await supabase
      .from("connector_configs")
      .select("config")
      .eq("user_id", auth.user_id)
      .eq("provider", provider)
      .maybeSingle();

    if (error) throw error;

    return json({ config: data?.config || null });
  } catch (e: any) {
    console.error("get-connector-config error:", e.message);
    return json({ error: e.message || "Failed to load connector config" }, 500);
  }
});
