import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { verifyShareToken } from "../_shared/shareToken.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE, PUT", // PUBLIC Endpoint
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("t");
    
    if (!token) throw new Error("Missing token (t param)");
    if (!config.SHARE_LINK_SECRET) throw new Error("Server configuration error");
    
    // 1. Verify token mathematically
    const verifyResult = await verifyShareToken(token, config.SHARE_LINK_SECRET);
    if (!verifyResult.ok) {
      return new Response(JSON.stringify({ error: `Invalid token: ${verifyResult.reason}` }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const payload = verifyResult.payload;
    if (Date.now() / 1000 > payload.exp) {
      return new Response(JSON.stringify({ error: "Token expired" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const share_id = payload.share_id;
    const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);

    // 2. Load DB Share Record using service role (bypassing RLS)
    const { data: share, error: shareErr } = await supabase
      .from("briefing_shares")
      .select("*")
      .eq("id", share_id)
      .single();

    if (shareErr || !share) {
      return new Response(JSON.stringify({ error: "Share not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (share.revoked_at) {
      return new Response(JSON.stringify({ error: "Access revoked" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (new Date() > new Date(share.expires_at)) {
      return new Response(JSON.stringify({ error: "Share link expired" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3. Fetch script & sanitize
    const { data: scriptRow, error: scriptErr } = await supabase
      .from("briefing_scripts")
      .select("script_json, created_at, persona, title")
      .eq("id", share.script_id)
      .single();

    if (scriptErr) throw new Error("Script not found");

    // Deep copy for sanitization
    const scriptJson = JSON.parse(JSON.stringify(scriptRow.script_json));
    
    // Remove internals
    delete scriptJson.connectors;
    delete scriptJson.user_data;
    
    if (scriptJson.timeline_segments) {
      scriptJson.timeline_segments.forEach((seg: any) => {
        if (!share.allow_action_cards) {
          if (seg.ui_action_card) {
            seg.ui_action_card = { disabled: true, title: "Action hidden in public view" };
          }
        }
        if (!share.allow_transcript) {
          seg.dialogue = "Transcript disabled for this public briefing.";
        }
        delete seg.grounding_source_id; // Never expose source IDs
      });
    }

    // 4. Fetch Render Job (if scoped)
    let jobStatus: string | null = null;
    let segmentsResponse: any[] = [];
    
    if (share.scope === 'render' || share.scope === 'script_and_render') {
      let activeJobId = share.job_id;
      
      // If no specific job_id linked, find smartest latest job associated with script
      if (!activeJobId) {
        const { data: latestJob } = await supabase
          .from("render_jobs")
          .select("id")
          .eq("script_id", share.script_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latestJob) activeJobId = latestJob.id;
      }

      if (activeJobId) {
        const { data: jobRow } = await supabase
          .from("render_jobs")
          .select("status")
          .eq("id", activeJobId)
          .single();
          
        if (jobRow) {
          jobStatus = jobRow.status;
          
          const { data: segRows } = await supabase
            .from("rendered_segments")
            .select("segment_id, avatar_video_url, b_roll_image_url, ui_action_card, dialogue, status")
            .eq("job_id", activeJobId)
            .order("segment_id", { ascending: true });
            
          if (segRows) {
            segmentsResponse = segRows.map((seg) => {
              if (!share.allow_action_cards && seg.ui_action_card) seg.ui_action_card = { disabled: true, title: "Hidden" };
              if (!share.allow_transcript) seg.dialogue = "";
              return seg;
            });
          }
        }
      }
    }

    // 5. Fire & Forget View count increment + last_viewed_at
    supabase.rpc('increment_share_view', { row_id: share.id })
      .then(() => {}) // ignores RPC absence, we can do a standard update instead
      .catch(() => {});
      
    supabase.from("briefing_shares")
      .update({ view_count: share.view_count + 1, last_viewed_at: new Date().toISOString() })
      .eq("id", share.id)
      .then(() => {})
      .catch(() => {});

    // 6. Return standard structured payload for frontend
    return new Response(JSON.stringify({ 
      share: {
        created_at: share.created_at,
        expires_at: share.expires_at,
        scope: share.scope,
        allow_action_cards: share.allow_action_cards,
      },
      script: {
        title: scriptRow.title,
        persona: scriptRow.persona,
        created_at: scriptRow.created_at,
        script_json: scriptJson
      },
      render: jobStatus ? {
        status: jobStatus,
        segments: segmentsResponse
      } : null
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("get-shared-briefing error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
