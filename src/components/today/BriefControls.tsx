import { Button } from "@/components/ui/button";
import { Loader2, Zap, Clapperboard, RefreshCw, Play, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BriefControlsProps {
  state: "idle" | "generating" | "script_ready" | "rendering" | "ready" | "playing";
  onGenerate: () => void;
  onRender: () => void;
  onPlay: () => void;
  onSync: () => void;
  isSyncing: boolean;
  onShare?: () => void;
}

export default function BriefControls({ 
  state, 
  onGenerate, 
  onRender, 
  onPlay, 
  onSync,
  isSyncing,
  onShare
}: BriefControlsProps) {
  const isGenerating = state === "generating";
  const isRendering = state === "rendering";
  const isPlaying = state === "playing";

  return (
    <div className="px-4 md:px-8 py-4 bg-black/40 border-t border-white/5 backdrop-blur-3xl flex items-center gap-3 overflow-x-auto">
      
      <Button
        variant="outline"
        onClick={onSync}
        disabled={isSyncing || isGenerating || isRendering || isPlaying}
        className="h-11 px-4 bg-white/[0.03] border-white/10 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest gap-2 shrink-0"
      >
        <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin text-[#5789FF]")} />
        Sync
      </Button>

      <Button
        onClick={onGenerate}
        disabled={isGenerating || isRendering || isPlaying}
        className={cn(
          "h-11 px-5 rounded-xl text-[9px] font-black uppercase tracking-widest gap-2 transition-all shrink-0",
          state === "script_ready" || state === "ready"
            ? "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10" 
            : "sa-button-primary shadow-[0_10px_30px_rgba(87,137,255,0.2)]"
        )}
      >
        {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
        {state === "script_ready" || state === "ready" ? "Re-synth" : "Synthesize"}
      </Button>

      <Button
        onClick={onRender}
        disabled={state !== "script_ready" || isRendering || isPlaying}
        className={cn(
          "h-11 px-5 rounded-xl text-[9px] font-black uppercase tracking-widest gap-2 transition-all shrink-0",
          state === "script_ready" 
            ? "sa-button-primary shadow-[0_10px_30px_rgba(87,137,255,0.2)]" 
            : "bg-white/5 border border-white/10 text-white/20"
        )}
      >
        {isRendering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clapperboard className="w-3.5 h-3.5" />}
        Render
      </Button>

      {state === "ready" && (
        <>
          <Button 
            onClick={onShare}
            variant="outline"
            className="h-11 px-4 bg-white/[0.03] border-white/10 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest gap-2 shrink-0"
          >
            <Share2 className="w-3.5 h-3.5 text-[#5789FF]" />
            Share
          </Button>
          <Button 
            onClick={onPlay} 
            className="h-11 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest rounded-xl shadow-[0_10px_30px_rgba(16,185,129,0.2)] text-[9px] gap-2 shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            Engage Stream
          </Button>
        </>
      )}
    </div>
  );
}
