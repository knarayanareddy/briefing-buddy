import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
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

  const userId = auth.user_id;
  const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const { share_id } = await req.json();
    if (!share_id) return json({ error: "Missing share_id" }, 400);

    // Scope the update by owner so users cannot revoke other users' shares.
    const { data, error } = await supabase
      .from("briefing_shares")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", share_id)
      .eq("user_id", userId)
      .is("revoked_at", null)
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0) return json({ error: "Share link not found" }, 404);

    return json({ status: "revoked" });
  } catch (e: any) {
    console.error("revoke-share-link error:", e.message);
    return json({ error: e.message || "Failed to revoke share link" }, 500);
  }
});
