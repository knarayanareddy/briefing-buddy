import { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  videoUrl: string | null;
  bRollUrl: string | null;
  segmentLabel: string;
  dialogue?: string;
  onEnded: () => void;
  isPlaying: boolean;
}

function isVideoUrl(url: string): boolean {
  return url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".mov") || url.includes("/broll-");
}

export function VideoPlayer({ videoUrl, bRollUrl, segmentLabel, dialogue, onEnded, isPlaying }: VideoPlayerProps) {
  const avatarRef = useRef<HTMLVideoElement>(null);
  const brollVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [bRollActive, setBRollActive] = useState(false);

  const hasBRollVideo = bRollUrl && isVideoUrl(bRollUrl);
  const hasBRollImage = bRollUrl && !isVideoUrl(bRollUrl);
  const hasAvatarVideo = !!videoUrl;

  // Handle avatar video playback
  useEffect(() => {
    if (avatarRef.current && videoUrl) {
      if (isPlaying) {
        avatarRef.current.play().catch(() => {});
      } else {
        avatarRef.current.pause();
      }
    }
  }, [isPlaying, videoUrl]);

  // Handle b-roll video playback (when no avatar video)
  useEffect(() => {
    if (brollVideoRef.current && hasBRollVideo && !hasAvatarVideo) {
      if (isPlaying) {
        brollVideoRef.current.currentTime = 0;
        brollVideoRef.current.play().catch(() => {});
        setBRollActive(true);
      } else {
        brollVideoRef.current.pause();
        setBRollActive(false);
      }
    }
  }, [isPlaying, hasBRollVideo, hasAvatarVideo]);

  // Handle b-roll image auto-advance (when no video at all)
  useEffect(() => {
    if (!hasAvatarVideo && !hasBRollVideo && hasBRollImage && isPlaying) {
      setBRollActive(true);
      timerRef.current = setTimeout(() => {
        setBRollActive(false);
        onEnded();
      }, 8000);
    } else if (!isPlaying) {
      setBRollActive(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hasAvatarVideo, hasBRollVideo, hasBRollImage, isPlaying, onEnded]);

  // When b-roll video ends (and no avatar), advance segment
  const handleBRollVideoEnd = () => {
    if (!hasAvatarVideo) {
      setBRollActive(false);
      onEnded();
    }
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black">
      {/* B-Roll Layer — video or image */}
      {hasBRollVideo && (
        <video
          ref={brollVideoRef}
          src={bRollUrl}
          className={`absolute inset-0 w-full h-full object-cover ${hasAvatarVideo ? "opacity-30" : "opacity-100"}`}
          muted
          playsInline
          onEnded={handleBRollVideoEnd}
        />
      )}
      {hasBRollImage && (
        <div
          className={`absolute inset-0 bg-cover bg-center transition-transform duration-[8000ms] ease-linear ${
            bRollActive ? "scale-110" : "scale-100"
          } ${hasAvatarVideo ? "opacity-30" : "opacity-100"}`}
          style={{ backgroundImage: `url(${bRollUrl})` }}
        />
      )}

      {/* Cinematic gradient overlay */}
      {!hasAvatarVideo && (bRollUrl) && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40 z-10" />
      )}

      {/* Avatar video (primary) */}
      {hasAvatarVideo ? (
        <video
          ref={avatarRef}
          src={videoUrl}
          className="relative z-10 w-full h-full object-contain"
          onEnded={onEnded}
          controls
          playsInline
        />
      ) : bRollUrl ? (
        /* Dialogue overlay for b-roll mode */
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-8">
          {dialogue && (
            <div className={`max-w-[80%] transition-opacity duration-700 ${isPlaying ? "opacity-100" : "opacity-0"}`}>
              <p className="text-white text-base leading-relaxed font-medium drop-shadow-lg">
                "{dialogue}"
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Empty state */
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-white/40 text-sm">{segmentLabel}</p>
            <p className="text-white/20 text-xs">Awaiting render</p>
          </div>
        </div>
      )}
    </div>
  );
}
