import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";
import { MODULE_CATALOG_VERSION } from "../_shared/moduleManifest.ts";
import { migrateProfileIfNeeded } from "../_shared/profileMigration.ts";
import { logAudit } from "../_shared/usage.ts";
import { sanitizeDeep } from "../_shared/sanitize.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await authorizeRequest(req, config);
  if (!auth.ok || !auth.user_id) {
    return new Response(JSON.stringify({ error: "Authenticated Session required for Profile configuration" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const payload = await req.json();
    const sanitized = sanitizeDeep(payload);
    
    // 1. Migrate and validate profile according to canonical manifest
    const migrated = migrateProfileIfNeeded(sanitized);

    if (!migrated.name) throw new Error("Profile name is required");

    // Secure boundary against payload size abuse
    const settingsStr = JSON.stringify(migrated.module_settings || {});
    if (new Blob([settingsStr]).size > 20480) { 
      throw new Error("Module settings exceed 20KB payload limit.");
    }

    const dataObj = {
      user_id: auth.user_id,
      name: migrated.name,
      persona: migrated.persona || null,
      timezone: migrated.timezone || null,
      enabled_modules: migrated.enabled_modules,
      module_settings: migrated.module_settings,
      module_catalog_version: MODULE_CATALOG_VERSION,
      updated_at: new Date().toISOString()
    };

    let result;
    if (migrated.id) {
      result = await supabase.from("briefing_profiles").update(dataObj).eq("id", migrated.id).eq("user_id", auth.user_id).select().single();
    } else {
      result = await supabase.from("briefing_profiles").insert(dataObj).select().single();
    }

    if (result.error) throw result.error;

    await logAudit(supabase, auth.user_id, "set_profile", { 
      profile_id: result.data.id,
      modules: migrated.enabled_modules.length,
      version: MODULE_CATALOG_VERSION
    });

    return new Response(JSON.stringify(result.data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Profile upsert error:", error);
    const status = error.message?.includes("validation") ? 422 : 400;
    return new Response(JSON.stringify({ error: error.message }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
