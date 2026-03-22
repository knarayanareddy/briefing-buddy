import { ActionCard } from "@/components/ActionCard";
import { Copy, ExternalLink, Info, Activity, Shield, Zap, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Bookmark, Check } from "lucide-react";
import { addToReadingList } from "@/lib/api";

interface ActionPanelProps {
  card: any;
  dialogue: string;
}

export default function ActionPanel({ card, dialogue }: ActionPanelProps) {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setIsSaved(false); // Reset when card changes
  }, [card?.payload, card?.action_payload]);

  const hasAction = card && Object.keys(card).length > 0;
  const payloadUrl = card?.payload || card?.action_payload;
  const isUrl = hasAction && payloadUrl?.includes("http");

  const handleCopy = () => {
    if (payloadUrl) {
      navigator.clipboard.writeText(payloadUrl);
      toast.success("Link copied to clipboard");
    }
  };

  const handleSave = async () => {
     if (!payloadUrl) return;
     try {
       await addToReadingList({
         source_id: card.source_id || card.title || "Unknown Source", // Try to find a source_id
         title: card.title || "Untitled Intelligence",
         url: payloadUrl
       });
       setIsSaved(true);
       toast.success("Saved to your reading list");
     } catch (err: any) {
       toast.error("Failed to save: " + err.message);
     }
  };

  return (
    <aside className="flex flex-col h-full bg-black/40 border-l border-white/5 overflow-hidden animate-in slide-in-from-right-4 duration-1000">
      <div className="p-8 border-b border-white/5 space-y-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Intelligence Context</h3>
        
        {/* Live Transcript / Segment Analysis */}
        <div className="sa-card bg-[#111928] border-[#5789FF]/20 p-6 space-y-4 shadow-[0_0_30px_rgba(87,137,255,0.05)]">
           <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#5789FF]">Live Signal</span>
              <div className="w-1.5 h-1.5 rounded-full bg-[#5789FF] animate-pulse" />
           </div>
           <p className="text-xs font-bold text-white leading-relaxed italic opacity-80">
             "{dialogue || "Parceing neural packets..."}"
           </p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-8 space-y-10 noscrollbar">
        {hasAction ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30">Primary Action Card</h4>
              <ActionCard
                card={card}
                dialogue={dialogue}
                segmentIndex={0}
                totalSegments={1}
              />
            </div>

            {isUrl && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30">External Resources</h4>
                <div className="flex flex-col gap-3">
                  <Button 
                    variant="outline" 
                    className={cn(
                      "h-12 bg-white/5 border-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl gap-2 transition-all",
                      isSaved && "text-emerald-400 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
                    )}
                    onClick={handleSave}
                    disabled={isSaved}
                  >
                    {isSaved ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                    {isSaved ? "Saved to List" : "Save for Later"}
                  </Button>
                  <Button className="sa-button-primary h-12 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2" onClick={() => window.open(payloadUrl, '_blank')}>
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Logic Source
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center space-y-6 pt-10 opacity-30">
            <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10">
              <Shield className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-white">No Follow-up Required</h4>
              <p className="text-xs text-muted-foreground max-w-[200px] leading-relaxed">
                This segment is purely informational. No contextual actions have been mapped.
              </p>
            </div>
          </div>
        )}

        <div className="pt-8 border-t border-white/5 space-y-6">
           <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30">System Parity</h4>
           <div className="space-y-4">
              <ParityMetric label="Grounding confidence" value={98.4} />
              <ParityMetric label="Hallucination guard" value={100} />
              <ParityMetric label="Latency" value="1.2s" isText />
           </div>
        </div>
      </div>
    </aside>
  );
}

function ParityMetric({ label, value, isText }: any) {
  return (
    <div className="space-y-2">
       <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-white/20">
          <span>{label}</span>
          <span>{isText ? value : `${value}%`}</span>
       </div>
       {!isText && (
         <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#5789FF]/40 rounded-full" 
              style={{ width: `${value}%` }}
            />
         </div>
       )}
    </div>
  );
}
