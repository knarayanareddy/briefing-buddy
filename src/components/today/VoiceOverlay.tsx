import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, X, Send, VolumeX, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceChat } from "@/hooks/useVoiceChat";

interface VoiceOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  scriptId: string | null;
  currentSegmentId: number | null;
  currentDialogue: string;
  contextSegments?: Array<{ segment_id: number; dialogue: string }>;
  onCommand: (command: "pause" | "resume" | "repeat" | "skip" | "next" | "previous") => void;
}

export default function VoiceOverlay({
  isOpen,
  onClose,
  scriptId,
  currentSegmentId,
  currentDialogue,
  contextSegments,
  onCommand,
}: VoiceOverlayProps) {
  const [textInput, setTextInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
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
  } = useVoiceChat({
    scriptId,
    currentSegmentId,
    contextSegments,
    onCommand,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, transcript]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendText = () => {
    const q = textInput.trim();
    if (!q || isProcessing) return;
    setTextInput("");
    askQuestion(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-[#111928]/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-4 duration-500 mb-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isListening ? "bg-red-500 animate-pulse" :
              isProcessing ? "bg-amber-500 animate-pulse" :
              isSpeaking ? "bg-emerald-500 animate-pulse" :
              "bg-white/20"
            )} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
              {isListening ? "Listening..." :
               isProcessing ? "Thinking..." :
               isSpeaking ? "Speaking..." :
               "Ask About Your Briefing"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isSpeaking && (
              <button onClick={stopSpeaking} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <VolumeX className="w-4 h-4 text-white/40" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>
        </div>

        {/* Current context chip */}
        {currentDialogue && (
          <div className="px-6 pt-3">
            <div className="bg-white/5 rounded-xl px-4 py-2 border border-white/5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#5789FF] mb-1">Current Segment</p>
              <p className="text-[11px] text-white/50 line-clamp-2">{currentDialogue}</p>
            </div>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="max-h-64 overflow-y-auto px-6 py-4 space-y-3 noscrollbar">
          {messages.length === 0 && !transcript && (
            <div className="text-center py-6 space-y-2">
              <MessageSquare className="w-8 h-8 text-white/10 mx-auto" />
              <p className="text-[11px] text-white/20">Ask a question about your briefing or use voice commands</p>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {["What's the key takeaway?", "Tell me more about this", "Any risks?"].map(q => (
                  <button
                    key={q}
                    onClick={() => askQuestion(q)}
                    className="text-[10px] px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white/60 hover:bg-white/10 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5",
                msg.role === "user"
                  ? "bg-[#5789FF]/20 border border-[#5789FF]/20 text-white"
                  : "bg-white/5 border border-white/5 text-white/80"
              )}>
                <p className="text-xs leading-relaxed">{msg.content}</p>
                {msg.citedSources && msg.citedSources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/5 flex flex-wrap gap-1">
                    {msg.citedSources.map((s, j) => (
                      <span key={j} className="text-[9px] px-2 py-0.5 rounded-full bg-[#5789FF]/10 text-[#5789FF]/60">
                        {s.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {transcript && isListening && (
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-white/5 border border-white/10 border-dashed">
                <p className="text-xs text-white/40 italic">{transcript}...</p>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-2.5 bg-white/5 border border-white/5">
                <Loader2 className="w-4 h-4 text-[#5789FF] animate-spin" />
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="px-6 pb-2">
            <p className="text-[10px] text-rose-400 bg-rose-500/10 rounded-lg px-3 py-1.5">{error}</p>
          </div>
        )}

        {/* Input area */}
        <div className="px-6 pb-5 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2">
            {/* Mic button */}
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0",
                isListening
                  ? "bg-red-500/20 border border-red-500/30 text-red-400 animate-pulse"
                  : "bg-white/5 border border-white/10 text-white/40 hover:text-white/60 hover:bg-white/10",
                isProcessing && "opacity-50 cursor-not-allowed"
              )}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Text input */}
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a question..."
                disabled={isProcessing}
                className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#5789FF]/30 disabled:opacity-50"
              />
            </div>

            {/* Send button */}
            <button
              onClick={handleSendText}
              disabled={!textInput.trim() || isProcessing}
              className="w-11 h-11 rounded-xl bg-[#5789FF]/20 border border-[#5789FF]/20 flex items-center justify-center text-[#5789FF] hover:bg-[#5789FF]/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Command hints */}
          <div className="flex items-center gap-3 mt-2 px-1">
            <span className="text-[8px] font-bold uppercase tracking-widest text-white/15">Commands:</span>
            {["pause", "resume", "repeat", "skip"].map(cmd => (
              <button
                key={cmd}
                onClick={() => askQuestion(cmd)}
                className="text-[8px] font-mono text-white/20 hover:text-white/40 transition-colors"
              >
                "{cmd}"
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
