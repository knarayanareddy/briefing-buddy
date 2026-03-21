import { config } from "../config.ts";

export interface VideoGenerationParams {
  dialogue: string;
  personaTitle: string;
}

export interface VideoGenerationResult {
  url: string;
}

/**
 * VEED.io Provider Adapter (Stub)
 * Currently behind a feature flag as official endpoints are not yet verified.
 */
export const veedAvatarProvider = {
  async generateVideo(params: VideoGenerationParams): Promise<VideoGenerationResult> {
    if (!config.VEED_API_KEY) {
      throw new Error("VEED_API_KEY is not configured");
    }

    // Official VEED API integration would go here.
    // For now, we throw as per expert instructions to avoid shipping guessed endpoints.
    throw new Error("VEED.io provider is currently a stub. Use fal.ai as the default avatar provider.");
  },
};
