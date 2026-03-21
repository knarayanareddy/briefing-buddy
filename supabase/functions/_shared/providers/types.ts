export interface ImageGenerationParams {
  prompt: string;
  size?: { width: number; height: number };
  seed?: number;
}

export interface ImageGenerationResult {
  imageUrl: string | null;
  error?: string;
}

export interface VideoGenerationParams {
  dialogue: string;
  persona?: string;
}

export interface VideoGenerationResult {
  videoUrl: string | null;
  error?: string;
}

export interface AvatarProvider {
  generateAvatarVideo(params: VideoGenerationParams): Promise<VideoGenerationResult>;
}
