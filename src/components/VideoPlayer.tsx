import { useEffect, useRef } from "react";

interface VideoPlayerProps {
  videoUrl: string | null;
  bRollUrl: string | null;
  segmentLabel: string;
  onEnded: () => void;
  isPlaying: boolean;
}

export function VideoPlayer({ videoUrl, bRollUrl, segmentLabel, onEnded, isPlaying }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && videoUrl) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, videoUrl]);

  return (
    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted border border-border">
      {bRollUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${bRollUrl})` }}
        />
      )}
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          className="relative z-10 w-full h-full object-contain"
          onEnded={onEnded}
          controls
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-secondary flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-muted-foreground text-sm">{segmentLabel}</p>
            <p className="text-muted-foreground/60 text-xs">Video not yet rendered</p>
          </div>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-background/80 to-transparent p-3">
        <p className="text-xs text-muted-foreground font-mono truncate">{segmentLabel}</p>
      </div>
    </div>
  );
}
