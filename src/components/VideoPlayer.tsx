import { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  videoUrl: string | null;
  bRollUrl: string | null;
  segmentLabel: string;
  dialogue?: string;
  onEnded: () => void;
  isPlaying: boolean;
}

/**
 * VideoPlayer — plays avatar video when available, otherwise
 * renders a cinematic b-roll visual briefing with Ken Burns effect
 * and auto-advances after a set duration.
 */
export function VideoPlayer({ videoUrl, bRollUrl, segmentLabel, dialogue, onEnded, isPlaying }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [bRollActive, setBRollActive] = useState(false);

  // Handle real video playback
  useEffect(() => {
    if (videoRef.current && videoUrl) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, videoUrl]);

  // Handle b-roll-only auto-advance (when no video exists)
  useEffect(() => {
    if (!videoUrl && bRollUrl && isPlaying) {
      setBRollActive(true);
      // Auto-advance after 8 seconds for b-roll segments
      timerRef.current = setTimeout(() => {
        setBRollActive(false);
        onEnded();
      }, 8000);
    } else {
      setBRollActive(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [videoUrl, bRollUrl, isPlaying, onEnded]);

  const hasBRollOnly = !videoUrl && bRollUrl;

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black">
      {/* B-Roll Background — full opacity when it's the main visual */}
      {bRollUrl && (
        <div
          className={`absolute inset-0 bg-cover bg-center transition-transform duration-[8000ms] ease-linear ${
            bRollActive ? "scale-110" : "scale-100"
          } ${videoUrl ? "opacity-30" : "opacity-100"}`}
          style={{ backgroundImage: `url(${bRollUrl})` }}
        />
      )}

      {/* Cinematic overlay for b-roll mode */}
      {hasBRollOnly && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40 z-10" />
      )}

      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          className="relative z-10 w-full h-full object-contain"
          onEnded={onEnded}
          controls
          playsInline
        />
      ) : bRollUrl ? (
        // B-roll visual briefing mode — no "not rendered" message
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-8">
          {dialogue && (
            <div className={`max-w-[80%] transition-opacity duration-700 ${bRollActive ? "opacity-100" : "opacity-0"}`}>
              <p className="text-white text-base leading-relaxed font-medium drop-shadow-lg">
                "{dialogue}"
              </p>
            </div>
          )}
        </div>
      ) : (
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
