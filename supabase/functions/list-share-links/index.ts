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
    const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);
    
    // List user's shares
    const { data: shares, error } = await supabase
      .from("briefing_shares")
      .select(`
        id, created_at, expires_at, revoked_at, scope, view_count, last_viewed_at,
        script_id, job_id,
        briefing_scripts (title, script_json->>segments_count)
      `)
      .eq("user_id", auth.user_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return new Response(JSON.stringify({ shares: shares || [] }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (e: any) {
    console.error("list-share-links error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
