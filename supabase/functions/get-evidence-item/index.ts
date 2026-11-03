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
  const sourceId = url.searchParams.get("source_id");

  if (!sourceId) return json({ error: "Missing source_id" }, 400);

  try {
    const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);

    // Explicit owner scoping — this runs with the service role, so the query
    // must filter by user_id (the old client-side query leaned on RLS alone).
    const { data, error } = await supabase
      .from("synced_items")
      .select("*")
      .eq("source_id", sourceId)
      .eq("user_id", auth.user_id)
      .maybeSingle();

    if (error) throw error;

    return json({ item: data || null });
  } catch (e: any) {
    console.error("get-evidence-item error:", e.message);
    return json({ error: e.message || "Failed to load evidence item" }, 500);
  }
});
