import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface VoiceMessage {
  role: "user" | "assistant";
  content: string;
  citedSources?: Array<{ source_id: string; title: string; url?: string }>;
}

interface UseVoiceChatOptions {
  scriptId: string | null;
  currentSegmentId: number | null;
  contextSegments?: Array<{ segment_id: number; dialogue: string }>;
  onCommand?: (command: "pause" | "resume" | "repeat" | "skip" | "next" | "previous") => void;
}

// Voice command patterns
const COMMAND_PATTERNS: Array<{ pattern: RegExp; command: "pause" | "resume" | "repeat" | "skip" | "next" | "previous" }> = [
  { pattern: /\b(pause|stop|hold)\b/i, command: "pause" },
  { pattern: /\b(resume|continue|play|go)\b/i, command: "resume" },
  { pattern: /\b(repeat|again|replay|say that again)\b/i, command: "repeat" },
  { pattern: /\b(skip|skip ahead|next segment)\b/i, command: "skip" },
  { pattern: /\b(go back|previous|back)\b/i, command: "previous" },
];

function detectCommand(text: string): "pause" | "resume" | "repeat" | "skip" | "next" | "previous" | null {
  const trimmed = text.trim().toLowerCase();
  // Only match if the entire input is short (likely a command, not a question)
  if (trimmed.split(/\s+/).length > 4) return null;
  for (const { pattern, command } of COMMAND_PATTERNS) {
    if (pattern.test(trimmed)) return command;
  }
  return null;
}

export function useVoiceChat({ scriptId, currentSegmentId, contextSegments, onCommand }: UseVoiceChatOptions) {
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const getAuthHeaders = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    };
    if (session) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    } else {
      headers["x-internal-api-key"] = "hackathon_unlocked_preview_2024";
      headers["x-preview-user-id"] = "00000000-0000-0000-0000-000000000000";
    }
    return headers;
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => {
    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes("Google") && v.lang.startsWith("en"))
      || voices.find(v => v.lang.startsWith("en") && !v.localService)
      || voices.find(v => v.lang.startsWith("en"));
    if (preferred) utterance.voice = preferred;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    utteranceRef.current = utterance;
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [stopSpeaking]);

  const askQuestion = useCallback(async (question: string) => {
    setIsProcessing(true);
    setError(null);

    // Check for voice commands first
    const command = detectCommand(question);
    if (command) {
      onCommand?.(command);
      setMessages(prev => [...prev, { role: "user", content: question }]);
      const cmdResponse = `Got it — ${command === "pause" ? "pausing" : command === "resume" ? "resuming" : command === "repeat" ? "repeating" : command === "skip" ? "skipping ahead" : command === "previous" ? "going back" : command}.`;
      setMessages(prev => [...prev, { role: "assistant", content: cmdResponse }]);
      speak(cmdResponse);
      setIsProcessing(false);
      return;
    }

    setMessages(prev => [...prev, { role: "user", content: question }]);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${FUNCTIONS_BASE}/briefing-voice-chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          question,
          script_id: scriptId,
          segment_id: currentSegmentId,
          context_segments: contextSegments,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(errData.error || `Error ${res.status}`);
      }

      const data = await res.json();
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: data.answer, citedSources: data.cited_sources },
      ]);
      speak(data.answer);
    } catch (e: any) {
      const errMsg = e.message || "Failed to get answer";
      setError(errMsg);
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${errMsg}` }]);
    } finally {
      setIsProcessing(false);
    }
  }, [scriptId, currentSegmentId, contextSegments, getAuthHeaders, onCommand, speak]);

  const startListening = useCallback(() => {
    setError(null);
    setTranscript("");

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition not supported in this browser");
      return false;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setTranscript(finalTranscript || interimTranscript);

        if (finalTranscript) {
          setIsListening(false);
          askQuestion(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setError("Microphone access denied. Please allow mic permissions.");
        } else if (event.error !== "aborted") {
          setError(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      return true;
    } catch (e: any) {
      setError("Failed to start speech recognition");
      return false;
    }
  }, [askQuestion]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setTranscript("");
    setError(null);
  }, []);

  return {
    messages,
    isListening,
    isProcessing,
    isSpeaking,
    transcript,
    error,
    startListening,
    stopListening,
    stopSpeaking,
    askQuestion,
    clearMessages,
  };
}
