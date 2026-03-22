import { Button } from "@/components/ui/button";
import { Loader2, Zap, Clapperboard, RefreshCw, Play, SkipForward, LayoutGrid, Share2 } from "lucide-react";
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
    <div className="px-10 py-6 bg-black/40 border-t border-white/5 backdrop-blur-3xl flex items-center justify-between">
      
      <div className="flex items-center gap-6">
        <Button
          variant="outline"
          onClick={onSync}
          disabled={isSyncing || isGenerating || isRendering || isPlaying}
          className="h-14 px-6 bg-white/[0.03] border-white/10 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest gap-3"
        >
          <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin text-[#5789FF]")} />
          Sync All Sources
        </Button>

        <div className="flex flex-col">
           <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">Active Profile</span>
           <span className="text-xs font-bold text-white/80">Silent Executive V4</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button
          onClick={onGenerate}
          disabled={isGenerating || isRendering || isPlaying}
          className={cn(
            "h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest gap-3 transition-all",
            state === "script_ready" 
              ? "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10" 
              : "sa-button-primary shadow-[0_10px_30px_rgba(87,137,255,0.2)]"
          )}
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {state === "script_ready" ? "Re-synthesize Script" : "Synthesize Briefing"}
        </Button>

        <Button
          onClick={onRender}
          disabled={state !== "script_ready" || isRendering || isPlaying}
          className={cn(
            "h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest gap-3 transition-all",
            state === "script_ready" 
              ? "sa-button-primary shadow-[0_10px_30px_rgba(87,137,255,0.2)]" 
              : "bg-white/5 border border-white/10 text-white/20"
          )}
        >
          {isRendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clapperboard className="w-4 h-4" />}
          Reconstruct Media
        </Button>

        {state === "ready" && (
          <>
            <Button 
               onClick={onShare}
               variant="outline"
               className="h-14 px-6 bg-white/[0.03] border-white/10 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest gap-3"
            >
              <Share2 className="w-4 h-4 text-[#5789FF]" />
              Share
            </Button>
            <Button 
              onClick={onPlay} 
              className="h-14 px-10 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.2)]"
            >
              <Play className="w-5 h-5 mr-3 fill-current" />
              Engage Neural Stream
            </Button>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
         <button className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center transition-all group">
            <LayoutGrid className="w-5 h-5 text-white/40 group-hover:text-white" />
         </button>
      </div>
    </div>
  );
}
