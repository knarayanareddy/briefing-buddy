import React from "react";
import { cn } from "@/lib/utils";
import { Play, PlayCircle, Clock, Zap, Save, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PreviewPanel({ onPreview, isLoading, result, layout }: any) {
  if (layout === "silent") {
    const segments = result?.plan_summary?.ordered || [];
    const byModule = result?.plan_summary?.by_module || [];

    return (
      <div className="flex flex-col h-full space-y-8 animate-in slide-in-from-right-4 duration-1000">
        
        {/* Video Stage / Preview Trigger */}
        <div 
          onClick={!isLoading ? onPreview : undefined}
          className={cn(
            "relative aspect-video rounded-3xl overflow-hidden bg-[#111928] border border-white/5 shadow-2xl group cursor-pointer transition-all",
            isLoading && "opacity-50 cursor-wait"
          )}
        >
          <img 
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60" 
            className="w-full h-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
            alt="Briefing Stage"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14] to-transparent opacity-80" />
          
          {/* Centered Play/Preview Button */}
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 transition-all group-hover:bg-[#5789FF] group-hover:border-[#5789FF] group-hover:scale-110 shadow-[0_0_30px_rgba(87,137,255,0.3)]">
                   {isLoading ? (
                     <Zap className="w-6 h-6 text-white animate-spin" />
                   ) : (
                     <Play className="w-6 h-6 text-white fill-current" />
                   )}
                </div>
                {!result && !isLoading && (
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-white transition-colors">
                    Click to Preview Plan
                  </span>
                )}
             </div>
          </div>

          {/* Status Overlay */}
          <div className="absolute bottom-6 left-6 flex items-center gap-3">
             <div className="bg-[#5789FF] text-white text-[9px] font-black px-2 py-1 rounded-sm uppercase tracking-tighter shadow-lg">PREVIEW</div>
             <span className="text-xs text-white/90 font-semibold tracking-wide flex items-center gap-2">
               {isLoading ? (
                 <>
                   <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                   Assembling Logic...
                 </>
               ) : result ? (
                 <>
                   <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                   Plan Assembled
                 </>
               ) : (
                 <>
                   <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                   Engine Standby
                 </>
               )}
             </span>
          </div>
        </div>

        {/* Generated Summary Scrollbox */}
        <div className="flex-1 sa-card border-none bg-white/[0.02] p-8 overflow-y-auto space-y-8 relative noscrollbar">
          <div className="flex items-center gap-2 pb-4 border-b border-white/5">
             <div className="h-[1px] flex-1 bg-white/10" />
             <span className="text-[9px] font-bold uppercase tracking-[0.3em] whitespace-nowrap text-white/30">
               {result ? "Structured Briefing Plan" : "Briefing Content Placeholder"}
             </span>
             <div className="h-[1px] flex-1 bg-white/10" />
          </div>

          <div className="space-y-6">
            {!result && !isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-20 text-center space-y-4">
                 <Clock className="w-10 h-10" />
                 <p className="text-xs font-medium max-w-[200px] leading-relaxed">
                   Select modules and click 'Preview' to see the scheduled intelligence segments.
                 </p>
              </div>
            ) : isLoading ? (
              <div className="space-y-6">
                 {[1, 2, 3].map(i => (
                   <div key={i} className="space-y-3 animate-pulse">
                      <div className="h-4 w-32 bg-white/5 rounded-full" />
                      <div className="h-3 w-full bg-white/[0.02] rounded-full" />
                   </div>
                 ))}
              </div>
            ) : (
              <div className="space-y-8">
                {segments.map((seg: any) => {
                  const modId = seg.grounding_source_ids[0]?.split(":")[0] || "unknown";
                  return (
                    <section key={seg.order_index} className="space-y-3 group/seg">
                      <div className="flex items-center justify-between">
                        <h4 className="text-white text-sm font-bold flex items-center gap-3">
                          <div className={cn(
                            "w-1 h-3 rounded-full",
                            modId === 'rss' ? "bg-amber-400" : 
                            modId === 'github' ? "bg-indigo-400" : "bg-[#5789FF]"
                          )} />
                          {seg.title}
                        </h4>
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/20 group-hover/seg:text-[#5789FF] transition-colors">
                          {seg.segment_kind}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed pl-4 line-clamp-2">
                        Grounded in: <span className="text-white/40 italic">{seg.grounding_source_ids.join(", ")}</span>
                      </p>
                    </section>
                  );
                })}

                {byModule.length > 0 && (
                  <div className="pt-6 border-t border-white/5 flex flex-wrap gap-2">
                    {byModule.map((m: any) => (
                      <div key={m.module_id} className="px-3 py-1 bg-white/5 rounded-full flex items-center gap-2">
                        <span className="text-[8px] font-black uppercase tracking-tighter text-white/40">{m.module_id}</span>
                        <span className="text-[10px] font-bold text-[#5789FF]">{m.segments}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 pb-4">
           <Button 
            variant="outline" 
            className="h-16 bg-white/[0.02] border-white/5 text-muted-foreground hover:bg-white/5 hover:text-white rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center gap-3"
            onClick={onPreview}
            disabled={isLoading}
           >
              <Zap className={cn("w-4 h-4", isLoading && "animate-spin")} /> {isLoading ? "Synching..." : "Preview Plan"}
           </Button>
           <Button 
            className="h-16 sa-button-primary rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center gap-3 shadow-[0_10px_30px_rgba(87,137,255,0.3)]"
            disabled={!result || isLoading}
            onClick={() => window.location.href = "/today"}
           >
              <CheckCircle2 className="w-4 h-4" /> Go to Briefing
           </Button>
        </div>
      </div>
    );
  }

  // Fallback...
  return null;
}
