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
 * Generate a b-roll image using Lovable AI Gateway (image generation model).
 * Returns a data URL or null on failure.
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
        messages: [
          {
            role: "user",
            content: `Generate a cinematic, professional b-roll image for a morning briefing video segment. The image should be: ${prompt}. Make it high quality, photorealistic, with cinematic lighting. Output only the image.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`B-roll generation failed (${response.status}): ${errText.slice(0, 200)}`);
      return null;
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    
    // Check if the response contains an image (inline_data)
    if (result.choices?.[0]?.message?.parts) {
      for (const part of result.choices[0].message.parts) {
        if (part.inline_data?.data) {
          return `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
        }
      }
    }

    // Fallback: use a high-quality stock placeholder
    return null;
  } catch (e: any) {
    console.warn(`B-roll generation error: ${e.message}`);
    return null;
  }
}

/**
 * Generate a TTS-style dialogue summary using Lovable AI.
 * Returns a text description that could be used for audio generation.
 */
async function generateDialogueSummary(dialogue: string, persona: string): Promise<string> {
  return dialogue; // Pass-through for now; actual TTS would need an audio provider
}

/**
 * The core rendering pipeline.
 * Processes a limited number of segments for a given job.
 * Uses Lovable AI for b-roll when external providers aren't available.
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
    // Mark as rendering
    await supabase
      .from("rendered_segments")
      .update({ status: "rendering" })
      .match({ job_id: jobId, segment_id: seg.segment_id });

    try {
      let bRollUrl: string | null = null;

      // B-Roll generation
      const brollPrompt = seg.runware_b_roll_prompt || seg.dialogue;
      if (config.ENABLE_RUNWARE && config.RUNWARE_API_KEY && brollPrompt) {
        // Use Runware if configured
        try {
          const { runwareProvider } = await import("./providers/runware.ts");
          const res = await runwareProvider.generateImage({
            prompt: brollPrompt,
            aspectRatio: "16:9",
          });
          bRollUrl = res.url;
        } catch (e: any) {
          console.warn(`Runware b-roll failed: ${e.message}, trying AI fallback`);
        }
      }

      // Fallback: Lovable AI for b-roll
      if (!bRollUrl && brollPrompt) {
        bRollUrl = await generateBrollImage(brollPrompt);
      }

      // Final fallback: use a contextual placeholder
      if (!bRollUrl) {
        bRollUrl = `https://picsum.photos/seed/seg${seg.segment_id}/1280/720`;
      }

      // Avatar video generation
      let avatarUrl: string | null = null;

      if (config.FAL_KEY) {
        try {
          const { falAvatarProvider } = await import("./providers/falAvatar.ts");
          const avatarRes = await falAvatarProvider.generateVideo({
            dialogue: seg.dialogue || "",
            personaTitle,
          });
          avatarUrl = avatarRes.url;
        } catch (e: any) {
          console.warn(`Fal avatar failed: ${e.message}`);
        }
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
