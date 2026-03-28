import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Config } from "./config.ts";

export interface RenderProgress {
  total: number;
  complete: number;
  failed: number;
  isDone: boolean;
}

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

/**
 * Use AI to generate a vivid, specific visual description prompt
 * from the segment's dialogue text, so b-roll images match the content.
 */
async function generateBrollPrompt(dialogue: string, segmentLabel: string): Promise<string> {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) return dialogue; // fallback to raw dialogue

  try {
    const response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a cinematographer creating visual descriptions for executive briefing video segments. Given a segment's narration and topic, output a single concise visual description (1-2 sentences) of the ideal b-roll image. Be SPECIFIC to the actual content — reference concrete objects, settings, or metaphors that match the narration. Never include text overlays. Output ONLY the visual description, nothing else.`
          },
          {
            role: "user",
            content: `Segment topic: ${segmentLabel}\nNarration: ${dialogue.slice(0, 500)}`
          }
        ],
      }),
    });

    if (!response.ok) return dialogue;
    const result = await response.json();
    const prompt = result.choices?.[0]?.message?.content?.trim();
    return prompt || dialogue;
  } catch {
    return dialogue;
  }
}

/**
 * Generate a themed b-roll image using Lovable AI Gateway.
 */
async function generateBrollImage(prompt: string): Promise<string | null> {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) {
    console.warn("LOVABLE_API_KEY not set, skipping b-roll generation");
    return null;
  }

  try {
    const response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        modalities: ["image", "text"],
        messages: [
          {
            role: "user",
            content: `Generate a cinematic, wide-angle 16:9 b-roll photograph for a professional morning briefing video. The image should vividly depict: "${prompt}". Style: photorealistic, editorial lighting, shallow depth-of-field, rich color grading. No text overlays, no UI elements.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`B-roll generation failed (${response.status}): ${errText.slice(0, 300)}`);
      return null;
    }

    const result = await response.json();

    const images = result.choices?.[0]?.message?.images;
    if (images && images.length > 0) {
      const imageUrl = images[0]?.image_url?.url;
      if (imageUrl) {
        console.log(`B-roll generated successfully`);
        return imageUrl;
      }
    }

    const parts = result.choices?.[0]?.message?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inline_data?.data) {
          return `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
        }
      }
    }

    console.warn("B-roll generation returned no image data");
    return null;
  } catch (e: any) {
    console.warn(`B-roll generation error: ${e.message}`);
    return null;
  }
}

/**
 * The core rendering pipeline.
 * Processes segments for a given job.
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
  const personaTitle = script.script_metadata?.persona_applied || "Professional";
  const timelineSegments = script.timeline_segments || [];

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
  for (const seg of (segments || [])) {
    await supabase
      .from("rendered_segments")
      .update({ status: "rendering" })
      .match({ job_id: jobId, segment_id: seg.segment_id });

    try {
      let bRollUrl: string | null = null;

      // Build a themed prompt from dialogue + any explicit b-roll prompt
      const brollPrompt = seg.runware_b_roll_prompt || seg.dialogue;

      // Try Runware first if configured
      if (config.ENABLE_RUNWARE && config.RUNWARE_API_KEY && brollPrompt) {
        try {
          const { runwareProvider } = await import("./providers/runware.ts");
          const res = await runwareProvider.generateImage({
            prompt: brollPrompt,
            aspectRatio: "16:9",
          });
          bRollUrl = res.url;
        } catch (e: any) {
          console.warn(`Runware b-roll failed: ${e.message}`);
        }
      }

      // Lovable AI b-roll generation (themed to content)
      if (!bRollUrl && brollPrompt) {
        bRollUrl = await generateBrollImage(brollPrompt);
      }

      // Final fallback: themed placeholder based on segment content
      if (!bRollUrl) {
        // Use a deterministic seed from the dialogue for consistency
        const seed = encodeURIComponent((brollPrompt || "briefing").slice(0, 30));
        bRollUrl = `https://picsum.photos/seed/${seed}/1280/720`;
      }

      // Avatar video generation via Fal.ai (with 30s timeout)
      let avatarUrl: string | null = null;
      if (config.FAL_KEY) {
        try {
          const avatarPromise = (async () => {
            const { falAvatarProvider } = await import("./providers/falAvatar.ts");
            return await falAvatarProvider.generateVideo({
              dialogue: seg.dialogue || "",
              personaTitle,
            });
          })();
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error("Avatar generation timed out (30s)")), 30_000)
          );
          const avatarRes = await Promise.race([avatarPromise, timeoutPromise]);
          avatarUrl = avatarRes.url;
          console.log(`Avatar video generated for segment ${seg.segment_id}`);
        } catch (e: any) {
          console.warn(`Fal avatar skipped for segment ${seg.segment_id}: ${e.message}`);
        }
      } else {
        console.warn("FAL_KEY not configured, skipping avatar video generation");
      }

      // Mark segment complete
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
      .update({ status: "rendering" })
      .eq("id", jobId);
  }

  return {
    total: stats.total,
    complete: stats.complete,
    failed: stats.failed,
    isDone,
  };
}
