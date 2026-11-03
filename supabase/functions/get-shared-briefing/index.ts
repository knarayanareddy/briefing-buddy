import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";

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

  const url = new URL(req.url);
  const token = url.searchParams.get("t");

  if (!token) return json({ error: "Missing token" }, 400);

  const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    // 1. Verify share token (revoked_at / expires_at exist via migration 20261103120000)
    const { data: share, error: shError } = await supabase
      .from("briefing_shares")
      .select("*")
      .eq("id", token)
      .is("revoked_at", null)
      .single();

    if (shError || !share) return json({ error: "Invalid share link." }, 404);
    if (share.expires_at && new Date(share.expires_at).getTime() <= Date.now()) {
      return json({ error: "This share link has expired." }, 410);
    }

    // 2. Fetch script (strip grounding ids — public share must not leak internals)
    const { data: script, error: sError } = await supabase
      .from("briefing_scripts")
      .select("id, script_json, persona, title, created_at")
      .eq("id", share.script_id)
      .single();

    if (sError || !script) return json({ error: "Shared briefing not found." }, 404);

    const timeline: any[] = script.script_json?.timeline_segments ?? [];
    const transcriptAllowed = share.include_transcript !== false;

    // 3. Latest render job + its rendered segments.
    //    (render_jobs.segments is never written by the pipeline — the per-segment
    //    rows live in rendered_segments, keyed by job_id.)
    const { data: job, error: jError } = await supabase
      .from("render_jobs")
      .select("id, status, updated_at, created_at")
      .eq("script_id", share.script_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (jError) throw jError;

    let render: any = null;
    if (job) {
      const { data: rows, error: rErr } = await supabase
        .from("rendered_segments")
        .select("segment_id, status, avatar_video_url, b_roll_image_url, dialogue, ui_action_card")
        .eq("job_id", job.id)
        .order("segment_id", { ascending: true });

      if (rErr) throw rErr;

      render = {
        id: job.id,
        status: job.status,
        updated_at: job.updated_at,
        segments: (rows ?? []).map((row: any) => {
          const tl = timeline[row.segment_id] ?? null;
          return {
            segment_id: row.segment_id,
            status: row.status,
            video_url: row.avatar_video_url,
            broll_url: row.b_roll_image_url,
            dialogue: transcriptAllowed ? row.dialogue : null,
            segment_type: tl?.segment_type ?? null,
          };
        }),
      };
    }

    // 4. Public script payload: timeline without grounding ids, transcript honours share scope
    const publicTimeline = timeline.map((seg, i) => ({
      segment_id: seg.segment_id ?? i,
      segment_type: seg.segment_type ?? null,
      dialogue: transcriptAllowed ? seg.dialogue : null,
      ui_action_card: share.allow_action_cards ? seg.ui_action_card ?? null : null,
      runware_b_roll_prompt: null, // keep prompt/cost data out of the public payload
    }));

    // Increment view count (best-effort; must not break the share)
    await supabase.rpc("increment_share_view", { share_id: token }).catch(() => {});

    return json({
      script: {
        id: script.id,
        title: script.title,
        persona: script.persona,
        created_at: script.created_at,
        script_json: { ...script.script_json, timeline_segments: publicTimeline },
      },
      render,
      share: {
        expires_at: share.expires_at,
        scope: share.scope,
        created_at: share.created_at,
        view_count: share.view_count ?? 0,
      },
    });
  } catch (e: any) {
    console.error("get-shared-briefing error:", e.message);
    return json({ error: e.message || "Failed to load shared briefing" }, 500);
  }
});
