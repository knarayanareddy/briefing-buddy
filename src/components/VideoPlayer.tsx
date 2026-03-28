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

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-scene`;
const ttsCache = new Map<string, string>();

async function getTtsHeaders() {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
  if (data.session) {
    headers["Authorization"] = `Bearer ${data.session.access_token}`;
  } else {
    headers["x-internal-api-key"] = "hackathon_unlocked_preview_2024";
    headers["x-preview-user-id"] = "00000000-0000-0000-0000-000000000000";
  }
  return headers;
}

export function VideoPlayer({ videoUrl, bRollUrl, segmentLabel, dialogue, onEnded, isPlaying }: VideoPlayerProps) {
  const avatarRef = useRef<HTMLVideoElement>(null);
  const brollVideoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [bRollActive, setBRollActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [ttsMode, setTtsMode] = useState<"elevenlabs" | "browser">("elevenlabs");
  const prevDialogueRef = useRef<string | null>(null);

  const hasBRollVideo = bRollUrl && isVideoUrl(bRollUrl);
  const hasBRollImage = bRollUrl && !isVideoUrl(bRollUrl);
  const hasAvatarVideo = !!videoUrl;

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current = null;
    }
    if (utteranceRef.current) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setShowSubtitle(false);
  }, []);

  // Speak using browser TTS
  const speakBrowser = useCallback((text: string, onEnd: () => void) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 0.95;
    utterance.volume = isMuted ? 0 : 1;

    // Pick a good voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes("Google") && v.lang.startsWith("en")
    ) || voices.find(v => v.lang.startsWith("en") && v.localService === false)
      || voices.find(v => v.lang.startsWith("en"));
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => {
      timerRef.current = setTimeout(onEnd, 800);
    };
    utterance.onerror = () => {
      timerRef.current = setTimeout(onEnd, 800);
    };

    utteranceRef.current = utterance;
    setShowSubtitle(true);
    window.speechSynthesis.speak(utterance);
  }, [isMuted]);

  // Fetch ElevenLabs TTS
  useEffect(() => {
    if (!dialogue || dialogue === prevDialogueRef.current) return;
    prevDialogueRef.current = dialogue;
    cleanupAudio();

    if (ttsMode === "browser") return; // Browser TTS is played on-demand, no prefetch

    const cacheKey = dialogue.slice(0, 200);
    if (ttsCache.has(cacheKey)) {
      audioRef.current = new Audio(ttsCache.get(cacheKey)!);
      audioRef.current.muted = isMuted;
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

        if (!resp.ok) {
          console.warn(`ElevenLabs TTS failed (${resp.status}), falling back to browser TTS`);
          if (!cancelled) setTtsMode("browser");
          return;
        }

        const data = await resp.json();
        if (cancelled || !data.audioContent) return;

        const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
        ttsCache.set(cacheKey, audioUrl);
        audioRef.current = new Audio(audioUrl);
        audioRef.current.muted = isMuted;
      } catch {
        console.warn("ElevenLabs TTS error, falling back to browser TTS");
        if (!cancelled) setTtsMode("browser");
      } finally {
        if (!cancelled) setTtsLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogue, ttsMode]);

  // Play/pause audio in sync with playback
  useEffect(() => {
    if (!isPlaying || !dialogue) return;

    if (ttsMode === "browser") {
      if (!isMuted) {
        speakBrowser(dialogue, onEnded);
      } else {
        setShowSubtitle(true);
        // Even when muted, auto-advance based on reading time
        const readTimeMs = Math.max(3000, dialogue.length * 55);
        timerRef.current = setTimeout(() => {
          setShowSubtitle(false);
          onEnded();
        }, readTimeMs);
      }
      return () => {
        window.speechSynthesis.cancel();
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    // ElevenLabs audio mode
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.muted = isMuted;
      setShowSubtitle(true);
      audio.play().catch(() => {});

      const handleEnd = () => {
        setShowSubtitle(false);
        timerRef.current = setTimeout(onEnded, 800);
      };
      audio.addEventListener("ended", handleEnd);
      return () => {
        audio.removeEventListener("ended", handleEnd);
        audio.pause();
      };
    } else if (!ttsLoading) {
      // No audio available at all — use reading-time timer
      setShowSubtitle(true);
      const readTimeMs = Math.max(3000, (dialogue?.length || 50) * 55);
      timerRef.current = setTimeout(() => {
        setShowSubtitle(false);
        onEnded();
      }, readTimeMs);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, dialogue, ttsMode, ttsLoading, isMuted]);

  // Update mute on existing audio
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
    if (utteranceRef.current) {
      // Can't change volume mid-speech, but next utterance will use it
    }
  }, [isMuted]);

  useEffect(() => cleanupAudio, [cleanupAudio]);

  // Handle avatar video playback
  useEffect(() => {
    if (avatarRef.current && videoUrl) {
      if (isPlaying) avatarRef.current.play().catch(() => {});
      else avatarRef.current.pause();
    }
  }, [isPlaying, videoUrl]);

  // Handle b-roll video playback
  useEffect(() => {
    if (brollVideoRef.current && hasBRollVideo && !hasAvatarVideo) {
      if (isPlaying) {
        brollVideoRef.current.currentTime = 0;
        brollVideoRef.current.loop = true;
        brollVideoRef.current.play().catch(() => {});
        setBRollActive(true);
      } else {
        brollVideoRef.current.pause();
        setBRollActive(false);
      }
    }
  }, [isPlaying, hasBRollVideo, hasAvatarVideo]);

  // Handle b-roll image Ken Burns
  useEffect(() => {
    if (!hasAvatarVideo && !hasBRollVideo && hasBRollImage && isPlaying) {
      setBRollActive(true);
    } else if (!isPlaying) {
      setBRollActive(false);
    }
  }, [hasAvatarVideo, hasBRollVideo, hasBRollImage, isPlaying]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black">
      {/* B-Roll Layer */}
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
        /* Dialogue subtitle overlay */
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

      {/* Mute/Unmute + TTS mode indicator */}
      {isPlaying && (
        <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
          {ttsMode === "browser" && (
            <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest bg-black/40 rounded-full px-2 py-1">Browser TTS</span>
          )}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-white/60" />
            ) : (
              <Volume2 className="w-4 h-4 text-white/60" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
