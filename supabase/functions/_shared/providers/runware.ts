import { config } from "../config.ts";

export interface ImageGenerationParams {
  prompt: string;
  aspectRatio?: string;
}

export interface ImageGenerationResult {
  url: string;
}

/**
 * Runware Provider Adapter
 * Implements official imageInference task with retries and timeouts
 */
export const runwareProvider = {
  async generateImage(params: ImageGenerationParams, retryCount = 0): Promise<ImageGenerationResult> {
    if (!config.RUNWARE_API_KEY) {
      throw new Error("RUNWARE_API_KEY is not configured");
    }

    const maxRetries = 2;
    const timeoutMs = 15000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch("https://api.runware.ai/v1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify([
          {
            taskType: "imageInference",
            taskUUID: crypto.randomUUID(),
            outputType: "URL",
            apiKey: config.RUNWARE_API_KEY,
            prompt: params.prompt,
            positivePrompt: "High quality, professional photography, cinematic lighting",
            width: 1280,
            height: 720,
            numberResults: 1,
          },
        ]),
      });

      const result = await response.json();
      clearTimeout(timeoutId);

      if (!response.ok || !result.data || !result.data[0] || result.data[0].error) {
        throw new Error(`Runware Error: ${result.data?.[0]?.error || response.statusText}`);
      }

      return {
        url: result.data[0].imageURL,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (retryCount < maxRetries && error.name !== "AbortError") {
        const delay = Math.pow(2, retryCount) * 1000;
        console.warn(`Runware retry ${retryCount + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.generateImage(params, retryCount + 1);
      }
      
      throw error;
    }
  },
};
