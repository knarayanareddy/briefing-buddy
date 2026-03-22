import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const token = url.searchParams.get("t");

  if (!token) {
    return new Response(JSON.stringify({ error: "Missing token" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);
  
  try {
    // 1. Verify share token
    const { data: share, error: shError } = await supabase
      .from("briefing_shares")
      .select("*")
      .eq("id", token) // Using ID as token for simplicity
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (shError || !share) throw new Error("Invalid or expired share link.");

    // 2. Fetch script
    const { data: script, error: sError } = await supabase
      .from("briefing_scripts")
      .select("id, script_json, persona, title, created_at")
      .eq("id", share.script_id)
      .single();

    if (sError) throw sError;

    // 3. Fetch job status (only if share scope permits)
    const { data: job, error: jError } = await supabase
      .from("render_jobs")
      .select("id, status, updated_at, segments")
      .eq("script_id", share.script_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Increment view count
    await supabase.rpc('increment_share_view', { share_id: token }).catch(() => {});

    return new Response(JSON.stringify({ 
      script, 
      latest_job: job || null,
      shared_at: share.created_at
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
