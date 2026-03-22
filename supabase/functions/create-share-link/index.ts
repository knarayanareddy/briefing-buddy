import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";
import { signSharePayload } from "../_shared/shareToken.ts";

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
    const { 
      script_id, 
      job_id, 
      expires_in_hours = 24, 
      scope = 'render',
      allow_transcript = true,
      allow_action_cards = false 
    } = await req.json();

    if (!script_id) throw new Error("script_id is required");
    if (!config.SHARE_LINK_SECRET) throw new Error("Server misconfigured: Missing SHARE_LINK_SECRET");

    const supabaseUrl = config.SUPABASE_URL!;
    const supabaseServiceKey = config.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const userId = auth.user_id;

    // Verify script ownership
    const { data: script, error: scriptErr } = await supabase
      .from("briefing_scripts")
      .select("id")
      .eq("id", script_id)
      .eq("user_id", userId)
      .single();

    if (scriptErr) throw new Error("Script not found or access denied");

    // Verify job ownership if provided
    if (job_id) {
      const { data: job, error: jobErr } = await supabase
        .from("render_jobs")
        .select("id")
        .eq("id", job_id)
        .eq("script_id", script_id)
        .eq("user_id", userId)
        .single();
      
      if (jobErr) throw new Error("Job not found or access denied");
    }

    // Insert share
    const expiresAt = new Date(Date.now() + (expires_in_hours * 60 * 60 * 1000)).toISOString();
    
    const { data: share, error: shareErr } = await supabase
      .from("briefing_shares")
      .insert({
        user_id: userId,
        script_id,
        job_id: job_id || null,
        expires_at: expiresAt,
        scope,
        allow_transcript,
        allow_action_cards
      })
      .select()
      .single();

    if (shareErr) throw new Error(`Failed to create share: ${shareErr.message}`);

    // Generate signed token
    const payload = {
      v: 1,
      share_id: share.id,
      exp: Math.floor(new Date(expiresAt).getTime() / 1000)
    };

    const token = await signSharePayload(payload, config.SHARE_LINK_SECRET);
    
    // Construct public share URL (we don't know the exact domain here typically, so return relative or token)
    // The frontend can construct the full URL, but we return a standard format just in case.
    const share_url = `/share/${token}`;

    return new Response(JSON.stringify({ 
      share_id: share.id, 
      token, 
      share_url 
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("create-share-link error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
