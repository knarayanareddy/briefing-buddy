import { config } from "../config.ts";

export interface VideoGenerationParams {
  dialogue: string;
  personaTitle: string;
}

export interface VideoGenerationResult {
  url: string;
}

/**
 * Fal.ai Provider Adapter
 * Implements the official 2-step pipeline: TTS then AI-Avatar
 */
export const falAvatarProvider = {
  async generateVideo(params: VideoGenerationParams): Promise<VideoGenerationResult> {
    if (!config.FAL_KEY) {
      throw new Error("FAL_KEY is not configured");
    }

    // Step 1: TTS (Text-to-Speech)
    // Using fal-ai/chatterbox/text-to-speech
    const ttsResponse = await fetch("https://fal.run/fal-ai/chatterbox/text-to-speech", {
      method: "POST",
      headers: {
        "Authorization": `Key ${config.FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: params.dialogue,
      }),
    });

    const ttsData = await ttsResponse.json();
    if (!ttsResponse.ok) throw new Error(`Fal TTS Error: ${ttsData.detail || ttsResponse.statusText}`);
    
    const audioUrl = ttsData.audio.url;

    // Step 2: AI-Avatar
    // Using fal-ai/ai-avatar
    const avatarResponse = await fetch("https://fal.run/fal-ai/ai-avatar", {
      method: "POST",
      headers: {
        "Authorization": `Key ${config.FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: config.DEFAULT_AVATAR_IMAGE_URL,
        audio_url: audioUrl,
        prompt: `Professional studio headshot presenter giving a morning briefing, ${params.personaTitle} style.`,
        resolution: "480p",
      }),
    });

    const avatarData = await avatarResponse.json();
    if (!avatarResponse.ok) throw new Error(`Fal Avatar Error: ${avatarData.detail || avatarResponse.statusText}`);

    return {
      url: avatarData.video.url,
    };
  },
};
