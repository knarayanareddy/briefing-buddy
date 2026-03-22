import { VideoPlayer } from "@/components/VideoPlayer";
import { Loader2, AlertCircle, FastForward, Play, Shield, Activity, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-col w-full h-full space-y-8 animate-in zoom-in-95 duration-1000">
      
      {/* Cinematic Main Stage */}
      <div className="relative flex-1 rounded-[40px] overflow-hidden bg-black border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.8)] group">
        
        {/* The Video Engine */}
        <div className="absolute inset-0 z-0">
          <VideoPlayer
            videoUrl={videoUrl}
            bRollUrl={bRollUrl}
            onEnded={onEnded}
            isPlaying={isPlaying}
            segmentLabel={segmentLabel}
          />
        </div>

        {/* Cinematic Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

        {/* Header HUD */}
        <div className="absolute top-10 left-10 right-10 flex justify-between items-start z-20">
           <div className="space-y-1">
              <div className="flex items-center gap-3">
                 <div className="bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded-sm uppercase tracking-tighter shadow-lg">GEN-4</div>
                 <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Neural Stream</span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md">{segmentLabel}</h2>
           </div>
           
           <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Orchestrator Node</p>
                <p className="text-[10px] font-bold text-[#5789FF]">SA-HYDRA-PRIMARY</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center">
                 <Shield className="w-5 h-5 text-white/40" />
              </div>
           </div>
        </div>

        {/* Footer HUD (Rendering/Status) */}
        {(status === "rendering" || (progress && progress.percent_complete < 100)) && (
          <div className="absolute bottom-10 left-10 right-10 z-20 space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#5789FF]/20 flex items-center justify-center border border-[#5789FF]/30">
                     <Loader2 className="w-4 h-4 text-[#5789FF] animate-spin" />
                  </div>
                  <span className="text-xs font-bold text-white tracking-wide uppercase">Generative Reconstruction...</span>
               </div>
               <span className="text-sm font-black text-[#5789FF]">{progress?.percent_complete || 0}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden backdrop-blur-md">
              <div 
                className="h-full bg-gradient-to-r from-[#5789FF] to-[#3B5BFF] transition-all duration-500 shadow-[0_0_15px_rgba(87,137,255,0.5)]" 
                style={{ width: `${progress?.percent_complete || 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Central Overlay for Interaction or Fail */}
        {status === "failed" && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center gap-8 z-30">
            <div className="w-20 h-20 rounded-3xl bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
              <AlertCircle className="w-10 h-10 text-rose-500" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black text-white">Segment Compromised</h3>
              <p className="text-muted-foreground text-sm max-w-sm px-10">We encountered a parity error while reconstructing the AI neural assets for this segment.</p>
            </div>
            <Button 
              onClick={onSkip} 
              className="h-14 px-10 bg-white border-none text-black font-black uppercase tracking-widest rounded-2xl hover:bg-white/90 shadow-2xl"
            >
              <FastForward className="w-5 h-5 mr-3" />
              Bypass Segment
            </Button>
          </div>
        )}

        {!isPlaying && status === "complete" && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
             <div className="w-24 h-24 rounded-full bg-white/5 backdrop-blur-2xl border border-white/10 flex items-center justify-center transition-all hover:scale-110 hover:bg-[#5789FF] hover:border-[#5789FF] shadow-[0_0_50px_rgba(0,0,0,0.5)] group/play cursor-pointer">
                <Play className="w-8 h-8 text-white fill-current group-hover/play:scale-110 transition-transform" />
             </div>
          </div>
        )}
      </div>

      {/* Decorative Grid Lines */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/5 to-transparent flex items-center justify-between px-10">
         <div className="flex gap-4">
            <div className="w-1 h-3 bg-[#5789FF] rounded-full" />
            <div className="w-1 h-3 bg-white/10 rounded-full" />
            <div className="w-1 h-3 bg-white/10 rounded-full" />
         </div>
         <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.5em] whitespace-nowrap">Integrated AI Orchestration Experience</span>
         <div className="flex gap-4">
            <div className="w-1 h-3 bg-white/10 rounded-full" />
            <div className="w-1 h-3 bg-white/10 rounded-full" />
            <div className="w-1 h-3 bg-[#5789FF] rounded-full" />
         </div>
      </div>
    </div>
  );
}
