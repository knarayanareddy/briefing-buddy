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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await authorizeRequest(req, config);
  if (!auth.ok || !auth.user_id) {
    return new Response(JSON.stringify({ error: auth.body?.error || "Unauthorized" }), {
      status: auth.status || 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { share_id } = await req.json();
    if (!share_id) throw new Error("share_id is required");

    const supabaseUrl = config.SUPABASE_URL!;
    const supabaseServiceKey = config.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const userId = auth.user_id;

    // Verify ownership and update
    const { data: share, error: fetchErr } = await supabase
      .from("briefing_shares")
      .select("id")
      .eq("id", share_id)
      .eq("user_id", userId)
      .single();

    if (fetchErr) throw new Error("Share not found or access denied");

    const { error: revErr } = await supabase
      .from("briefing_shares")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", share_id);

    if (revErr) throw revErr;

    return new Response(JSON.stringify({ status: "revoked" }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (e: any) {
    console.error("revoke-share-link error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
