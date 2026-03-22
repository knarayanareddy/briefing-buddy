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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authorizeRequest(req, config);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const userId = auth.user_id!;
  const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);
  
  try {
    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      // Initialize defaults
      const defaults = {
        user_id: userId,
        display_name: "Agent User",
        timezone: "UTC",
        notification_prefs: {
          genComplete: true,
          genError: true,
          edgeFailures: true,
          newLogin: true,
          vaultRotation: true,
          dailyDigest: false
        }
      };
      
      const { data: newData, error: iError } = await supabase
        .from("user_settings")
        .insert(defaults)
        .select("*")
        .single();
        
      if (iError) throw iError;
      return new Response(JSON.stringify(newData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, message: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
