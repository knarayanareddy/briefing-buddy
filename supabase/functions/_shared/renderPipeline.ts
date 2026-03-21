import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Config } from "./config.ts";
import { falAvatarProvider } from "./providers/falAvatar.ts";
import { runwareProvider } from "./providers/runware.ts";
import { veedAvatarProvider } from "./providers/veedAvatar.ts";
import { computeAvatarAssetKey, computeBrollAssetKey } from "./assetKey.ts";

export interface RenderProgress {
  total: number;
  complete: number;
  failed: number;
  isDone: boolean;
}

/**
 * The core rendering pipeline.
 * Processes a limited number of segments for a given job.
 */
export async function processNextSegments(
  supabase: SupabaseClient,
  jobId: string,
  config: Config,
  maxSegments: number = 1
): Promise<RenderProgress> {
  // 1. Fetch job metadata
  const { data: job, error: jobErr } = await supabase
    .from("render_jobs")
    .select("*, briefing_scripts(script_json)")
    .eq("id", jobId)
    .single();

  if (jobErr || !job) throw new Error("Job not found");
  const script = job.briefing_scripts.script_json;
  const personaTitle = script.script_metadata.persona_applied;

  // 2. Fetch pending segments
  const { data: segments, error: segErr } = await supabase
    .from("rendered_segments")
    .select("*")
    .eq("job_id", jobId)
    .in("status", ["queued"])
    .order("segment_id", { ascending: true })
    .limit(maxSegments);

  if (segErr) throw segErr;

  // 3. Process each segment
  const avatarProvider = config.AVATAR_PROVIDER === "veed" ? veedAvatarProvider : falAvatarProvider;

  for (const seg of (segments || [])) {
    // Optimistic lock for this segment
    await supabase
      .from("rendered_segments")
      .update({ status: "rendering" })
      .match({ job_id: jobId, segment_id: seg.segment_id });

    try {
      let bRollUrl = null;
      let brollKey = "";

      // 1. B-Roll Cache Path
      if (config.ENABLE_RUNWARE && seg.runware_b_roll_prompt && seg.segment_id <= config.MAX_BROLL_SEGMENTS) {
        brollKey = await computeBrollAssetKey({
          prompt: seg.runware_b_roll_prompt, 
          aspectRatio: "16:9",
          provider: "runware"
        });

        const { data: cachedBroll } = await supabase
          .from("rendered_asset_cache")
          .select("url")
          .eq("user_id", job.user_id)
          .eq("asset_key", brollKey)
          .eq("asset_type", "b_roll_image")
          .single();

        if (cachedBroll) {
          console.log(`B-roll cache hit for segment ${seg.segment_id}`);
          bRollUrl = cachedBroll.url;
          await supabase.from("rendered_asset_cache").update({ last_used_at: new Date().toISOString() })
            .match({ user_id: job.user_id, asset_key: brollKey, asset_type: 'b_roll_image' });
        } else {
          try {
            const res = await runwareProvider.generateImage({
              prompt: seg.runware_b_roll_prompt,
              aspectRatio: "16:9",
            });
            bRollUrl = res.url;
            // Store in cache
            await supabase.from("rendered_asset_cache").upsert({
              user_id: job.user_id,
              asset_key: brollKey,
              asset_type: "b_roll_image",
              provider: "runware",
              url: bRollUrl
            });
          } catch (e: any) {
            console.error(`B-roll failed for segment ${seg.segment_id}:`, e.message);
          }
        }
      }

      // 2. Avatar Cache Path
      const avatarProviderName = config.AVATAR_PROVIDER;
      const avatarKey = await computeAvatarAssetKey({
        dialogue: seg.dialogue,
        personaTitle: personaTitle,
        provider: avatarProviderName
      });

      let avatarUrl = null;
      const { data: cachedAvatar } = await supabase
        .from("rendered_asset_cache")
        .select("url")
        .eq("user_id", job.user_id)
        .eq("asset_key", avatarKey)
        .eq("asset_type", "avatar_video")
        .single();

      if (cachedAvatar) {
        console.log(`Avatar cache hit for segment ${seg.segment_id}`);
        avatarUrl = cachedAvatar.url;
        await supabase.from("rendered_asset_cache").update({ last_used_at: new Date().toISOString() })
          .match({ user_id: job.user_id, asset_key: avatarKey, asset_type: 'avatar_video' });
      } else {
        const avatarRes = await avatarProvider.generateVideo({
          dialogue: seg.dialogue,
          personaTitle: personaTitle,
        });
        avatarUrl = avatarRes.url;
        // Store in cache
        await supabase.from("rendered_asset_cache").upsert({
          user_id: job.user_id,
          asset_key: avatarKey,
          asset_type: "avatar_video",
          provider: avatarProviderName,
          url: avatarUrl
        });
      }

      await supabase
        .from("rendered_segments")
        .update({
          status: "complete",
          avatar_video_url: avatarUrl,
          b_roll_image_url: bRollUrl,
        })
        .match({ job_id: jobId, segment_id: seg.segment_id });

    } catch (e: any) {
      console.error(`Rendering failed for segment ${seg.segment_id}:`, e.message);
      await supabase
        .from("rendered_segments")
        .update({ status: "failed", error: e.message.slice(0, 200) })
        .match({ job_id: jobId, segment_id: seg.segment_id });
    }
  }

  // 4. Update overall job status
  const { data: allSegments } = await supabase
    .from("rendered_segments")
    .select("status")
    .eq("job_id", jobId);

  const stats = {
    total: allSegments?.length || 0,
    queued: allSegments?.filter(s => s.status === "queued").length || 0,
    rendering: allSegments?.filter(s => s.status === "rendering").length || 0,
    complete: allSegments?.filter(s => s.status === "complete").length || 0,
    failed: allSegments?.filter(s => s.status === "failed").length || 0,
  };

  const isDone = stats.queued === 0 && stats.rendering === 0;
  if (isDone) {
    const finalStatus = stats.complete > 0 ? "complete" : "failed";
    await supabase
      .from("render_jobs")
      .update({ status: finalStatus })
      .eq("id", jobId);
  } else {
    await supabase
      .from("render_jobs")
      .update({ status: "rendering", heartbeat_at: new Date().toISOString() })
      .eq("id", jobId);
  }

  return {
    total: stats.total,
    complete: stats.complete,
    failed: stats.failed,
    isDone
  };
}
