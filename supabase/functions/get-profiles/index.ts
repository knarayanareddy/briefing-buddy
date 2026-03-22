import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";
import { migrateProfileIfNeeded } from "../_shared/profileMigration.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE, PUT",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  
  const auth = await authorizeRequest(req, config);
  if (!auth.ok || !auth.user_id) {
    return new Response(JSON.stringify({ error: "Session required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  
  const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data, error } = await supabase
    .from("briefing_profiles")
    .select("id, name, persona, timezone, enabled_modules, module_settings, module_catalog_version, updated_at")
    .eq("user_id", auth.user_id)
    .order("updated_at", { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Migrate each profile on read to ensure UI sees the latest valid manifest version
  const migrated = (data || []).map(p => migrateProfileIfNeeded(p as any));

  return new Response(JSON.stringify(migrated), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
