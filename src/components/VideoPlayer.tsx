import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX } from "lucide-react";

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

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

// Simple in-memory cache so we don't re-generate TTS for the same dialogue
const ttsCache = new Map<string, string>();

export function VideoPlayer({ videoUrl, bRollUrl, segmentLabel, dialogue, onEnded, isPlaying }: VideoPlayerProps) {
  const avatarRef = useRef<HTMLVideoElement>(null);
  const brollVideoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [bRollActive, setBRollActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsReady, setTtsReady] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const prevDialogueRef = useRef<string | null>(null);

  const hasBRollVideo = bRollUrl && isVideoUrl(bRollUrl);
  const hasBRollImage = bRollUrl && !isVideoUrl(bRollUrl);
  const hasAvatarVideo = !!videoUrl;

  // Cleanup audio when dialogue changes or component unmounts
  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current = null;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setTtsReady(false);
    setShowSubtitle(false);
  }, []);

  // Fetch TTS audio for current dialogue
  useEffect(() => {
    if (!dialogue || dialogue === prevDialogueRef.current) return;
    prevDialogueRef.current = dialogue;
    cleanupAudio();

    const cacheKey = dialogue.slice(0, 200);
    if (ttsCache.has(cacheKey)) {
      const audio = new Audio(ttsCache.get(cacheKey)!);
      audioRef.current = audio;
      audio.muted = isMuted;
      setTtsReady(true);
      return;
    }

    let cancelled = false;
    setTtsLoading(true);

    (async () => {
      try {
        const resp = await fetch(TTS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: dialogue }),
        });

        if (!resp.ok) throw new Error(`TTS ${resp.status}`);
        const data = await resp.json();
        if (cancelled || !data.audioContent) return;

        const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
        ttsCache.set(cacheKey, audioUrl);

        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.muted = isMuted;
        setTtsReady(true);
      } catch (err) {
        console.warn("TTS fetch failed:", err);
        // Still allow segment to play without audio
        setTtsReady(true);
      } finally {
        if (!cancelled) setTtsLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogue]);

  // Play/pause TTS audio in sync with playback state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying && ttsReady) {
      audio.currentTime = 0;
      audio.muted = isMuted;
      setShowSubtitle(true);

      audio.play().catch(() => {});

      // When audio ends, advance the segment
      const handleEnd = () => {
        setShowSubtitle(false);
        // Give a brief pause after narration before advancing
        timerRef.current = setTimeout(() => {
          onEnded();
        }, 800);
      };
      audio.addEventListener("ended", handleEnd);
      return () => {
        audio.removeEventListener("ended", handleEnd);
      };
    } else {
      audio.pause();
      setShowSubtitle(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, ttsReady, isMuted]);

  // Update mute state on existing audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Cleanup on unmount
  useEffect(() => cleanupAudio, [cleanupAudio]);

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
        brollVideoRef.current.loop = true; // Loop b-roll while TTS plays
        brollVideoRef.current.play().catch(() => {});
        setBRollActive(true);
      } else {
        brollVideoRef.current.pause();
        setBRollActive(false);
      }
    }
  }, [isPlaying, hasBRollVideo, hasAvatarVideo]);

  // Handle b-roll image (Ken Burns effect while TTS plays)
  useEffect(() => {
    if (!hasAvatarVideo && !hasBRollVideo && hasBRollImage && isPlaying) {
      setBRollActive(true);
      // If no TTS audio available, fall back to timer
      if (!audioRef.current) {
        timerRef.current = setTimeout(() => {
          setBRollActive(false);
          onEnded();
        }, 8000);
      }
    } else if (!isPlaying) {
      setBRollActive(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hasAvatarVideo, hasBRollVideo, hasBRollImage, isPlaying, onEnded]);

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
          loop
        />
      )}
      {hasBRollImage && (
        <div
          className={`absolute inset-0 bg-cover bg-center transition-transform duration-[12000ms] ease-linear ${
            bRollActive ? "scale-110" : "scale-100"
          } ${hasAvatarVideo ? "opacity-30" : "opacity-100"}`}
          style={{ backgroundImage: `url(${bRollUrl})` }}
        />
      )}

      {/* Cinematic gradient overlay */}
      {!hasAvatarVideo && bRollUrl && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 z-10" />
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
        /* Dialogue subtitle overlay for b-roll mode */
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-8">
          {dialogue && (
            <div className={`max-w-[85%] transition-all duration-700 ${showSubtitle && isPlaying ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <div className="bg-black/60 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/10">
                <p className="text-white text-sm leading-relaxed font-medium">
                  {dialogue}
                </p>
              </div>
            </div>
          )}
          
          {/* TTS Loading indicator */}
          {ttsLoading && isPlaying && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                <div className="w-2 h-2 bg-[#5789FF] rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Synthesizing Voice...</span>
              </div>
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

      {/* Mute/Unmute control */}
      {isPlaying && (
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-white/60" />
          ) : (
            <Volume2 className="w-4 h-4 text-white/60" />
          )}
        </button>
      )}
    </div>
  );
}
