import { VideoPlayer } from "@/components/VideoPlayer";
import { Loader2, AlertCircle, FastForward } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoStageProps {
  videoUrl: string | null;
  bRollUrl: string | null;
  status: string;
  progress: { percent_complete: number; complete: number; total: number } | null;
  onEnded: () => void;
  onSkip: () => void;
  isPlaying: boolean;
  segmentLabel: string;
}

export default function VideoStage({ 
  videoUrl, 
  bRollUrl, 
  status, 
  progress, 
  onEnded, 
  onSkip, 
  isPlaying,
  segmentLabel
}: VideoStageProps) {
  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto space-y-4">
      {/* Progress Bar */}
      {progress && progress.percent_complete < 100 && (
        <div className="space-y-1.5 animate-in fade-in duration-500">
          <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
            <span>Rendering Briefing Content</span>
            <span>{progress.percent_complete}%</span>
          </div>
          <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500" 
              style={{ width: `${progress.percent_complete}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Stage */}
      <div className="relative aspect-video rounded-3xl overflow-hidden bg-black border border-border shadow-2xl group">
        <VideoPlayer
          videoUrl={videoUrl}
          bRollUrl={bRollUrl}
          onEnded={onEnded}
          isPlaying={isPlaying}
          segmentLabel={segmentLabel}
        />

        {/* Status Overlays */}
        {status === "rendering" && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-4 z-10 transition-all">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <p className="text-sm font-semibold text-primary animate-pulse tracking-wide uppercase">
              Generating Segment Media...
            </p>
          </div>
        )}

        {status === "failed" && (
          <div className="absolute inset-0 bg-destructive/10 backdrop-blur-sm flex flex-col items-center justify-center gap-6 z-10">
            <div className="w-16 h-16 rounded-2xl bg-destructive/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-lg font-bold text-destructive">Segment Failed to Render</p>
              <p className="text-sm text-muted-foreground">We encountered an error generating the AI assets for this part.</p>
            </div>
            <Button variant="outline" size="sm" onClick={onSkip} className="bg-background hover:bg-secondary">
              <FastForward className="w-4 h-4 mr-2" />
              Skip to Next
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-2">
        <span className="text-[10px] font-mono text-muted-foreground uppercase opacity-50">
          {segmentLabel}
        </span>
      </div>
    </div>
  );
}
