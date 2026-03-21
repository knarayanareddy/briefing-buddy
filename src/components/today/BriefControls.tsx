import { Button } from "@/components/ui/button";
import { Loader2, Zap, Clapperboard, RefreshCw, Play } from "lucide-react";

interface BriefControlsProps {
  state: "idle" | "generating" | "script_ready" | "rendering" | "ready" | "playing";
  onGenerate: () => void;
  onRender: () => void;
  onPlay: () => void;
  onSync: () => void;
  isSyncing: boolean;
}

export default function BriefControls({ 
  state, 
  onGenerate, 
  onRender, 
  onPlay, 
  onSync,
  isSyncing
}: BriefControlsProps) {
  const isGenerating = state === "generating";
  const isRendering = state === "rendering";
  const isPlaying = state === "playing";

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 p-6 bg-background/80 backdrop-blur-md border-t border-border animate-in slide-in-from-bottom-2 duration-500">
      <Button
        variant="outline"
        size="sm"
        className="h-10 px-4 border-border hover:bg-secondary gap-2"
        onClick={onSync}
        disabled={isSyncing || isGenerating || isRendering || isPlaying}
      >
        <RefreshCw className={isSyncing ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
        <span className="hidden sm:inline">Sync Sources</span>
      </Button>

      <div className="w-px h-6 bg-border mx-1 hidden sm:block" />

      <Button
        variant={state === "script_ready" ? "outline" : "default"}
        size="lg"
        onClick={onGenerate}
        disabled={isGenerating || isRendering || isPlaying}
        className="h-11 px-8 relative overflow-hidden group shadow-lg shadow-primary/10"
      >
        <div className="flex items-center gap-2 relative z-10">
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Zap className="w-4 h-4 text-primary fill-primary/20" />}
          {state === "script_ready" ? "Regenerate Script" : "Generate Briefing"}
        </div>
        {state !== "script_ready" && !isGenerating && (
          <div className="absolute inset-0 bg-primary/10 group-hover:bg-primary/20 transition-colors" />
        )}
      </Button>

      <Button
        variant={state === "script_ready" ? "default" : "outline"}
        size="lg"
        onClick={onRender}
        disabled={state !== "script_ready" || isRendering || isPlaying}
        className="h-11 px-8 relative overflow-hidden group shadow-lg shadow-primary/10"
      >
        <div className="flex items-center gap-2 relative z-10">
          {isRendering ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Clapperboard className="w-4 h-4 text-primary fill-primary/20" />}
          Render Media
        </div>
        {state === "script_ready" && !isRendering && (
          <div className="absolute inset-0 bg-primary/10 group-hover:bg-primary/20 transition-colors" />
        )}
      </Button>

      {state === "ready" && (
        <Button 
          variant="default"
          size="lg" 
          onClick={onPlay} 
          className="h-11 px-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
        >
          <Play className="w-4 h-4 mr-2" />
          Play Briefing
        </Button>
      )}
    </div>
  );
}
