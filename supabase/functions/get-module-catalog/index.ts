import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";
import { getPublicCatalogView } from "../_shared/moduleManifest.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  
  // Auth is optional for the catalog itself (it's public metadata), 
  // but we still authorize to keep audit logs or restrict if needed.
  // For now, let's allow it but check JWT if present.
  const auth = await authorizeRequest(req, config);
  
  // Return the public view of the manifest (no secrets, no internal logic)
  const catalog = getPublicCatalogView();

  return new Response(JSON.stringify(catalog), { 
    headers: { 
      ...corsHeaders, 
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300" // Cache for 5 mins
    } 
  });
});
