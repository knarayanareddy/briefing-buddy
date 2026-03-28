import { useState, useCallback, useRef, useEffect } from "react";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface NarrationState {
  isNarrated: boolean;
  isLoading: boolean;
  isPlaying: boolean;
  currentAudioUrl: string | null;
  error: string | null;
}

async function getHeaders() {
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

// Simple in-memory cache for current session
const audioCache = new Map<string, string>();

export function useNarration() {
  const [state, setState] = useState<NarrationState>({
    isNarrated: false,
    isLoading: false,
    isPlaying: false,
    currentAudioUrl: null,
    error: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadingRef = useRef<string | null>(null);

  const toggleNarration = useCallback(() => {
    setState(prev => {
      if (prev.isNarrated && audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return { ...prev, isNarrated: !prev.isNarrated, isPlaying: false, currentAudioUrl: null };
    });
  }, []);

  const fetchAudio = useCallback(async (text: string, sceneId?: string): Promise<string | null> => {
    const cacheKey = text.slice(0, 200);
    if (audioCache.has(cacheKey)) {
      return audioCache.get(cacheKey)!;
    }

    try {
      const headers = await getHeaders();
      const res = await fetch(`${FUNCTIONS_BASE}/tts-scene`, {
        method: "POST",
        headers,
        body: JSON.stringify({ text, scene_id: sceneId }),
      });

      if (!res.ok) {
        console.warn("TTS failed:", res.status);
        return null;
      }

      const data = await res.json();
      let url: string;

      if (data.audio_url) {
        url = data.audio_url;
      } else if (data.audio_content) {
        url = `data:audio/mpeg;base64,${data.audio_content}`;
      } else {
        return null;
      }

      audioCache.set(cacheKey, url);
      return url;
    } catch (e) {
      console.warn("TTS fetch error:", e);
      return null;
    }
  }, []);

  const playScene = useCallback(async (text: string, sceneId?: string, onEnd?: () => void) => {
    if (!state.isNarrated) return;

    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const url = await fetchAudio(text, sceneId);
    if (!url) {
      setState(prev => ({ ...prev, isLoading: false, error: "TTS unavailable, using browser voice" }));
      return false; // Caller should fallback
    }

    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onended = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
      onEnd?.();
    };

    audio.onerror = () => {
      setState(prev => ({ ...prev, isPlaying: false, error: "Audio playback failed" }));
      onEnd?.();
    };

    setState(prev => ({ ...prev, isLoading: false, isPlaying: true, currentAudioUrl: url }));

    try {
      await audio.play();
    } catch {
      setState(prev => ({ ...prev, isPlaying: false }));
      return false;
    }

    return true;
  }, [state.isNarrated, fetchAudio]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
      setState(prev => ({ ...prev, isPlaying: true }));
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setState(prev => ({ ...prev, isPlaying: false, currentAudioUrl: null }));
    }
  }, []);

  // Preload next scene audio
  const preloadScene = useCallback(async (text: string, sceneId?: string) => {
    if (!state.isNarrated) return;
    const key = text.slice(0, 200);
    if (audioCache.has(key) || preloadingRef.current === key) return;
    preloadingRef.current = key;
    await fetchAudio(text, sceneId);
    preloadingRef.current = null;
  }, [state.isNarrated, fetchAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return {
    ...state,
    toggleNarration,
    playScene,
    pause,
    resume,
    stop,
    preloadScene,
  };
}
