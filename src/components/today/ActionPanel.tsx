import { ActionCard } from "@/components/ActionCard";
import { Copy, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ActionPanelProps {
  card: any;
  dialogue: string;
}

export default function ActionPanel({ card, dialogue }: ActionPanelProps) {
  if (!card || Object.keys(card).length === 0) {
    return (
      <aside className="flex flex-col h-full bg-card/30 border-l border-border p-6 items-center justify-center text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center opacity-20">
          <Info className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">No actions for this segment</p>
          <p className="text-[11px] text-muted-foreground/60 max-w-[180px]">We'll let you know if there's something to follow up on here.</p>
        </div>
      </aside>
    );
  }

  const isUrl = card.payload?.includes("http");

  const handleCopy = () => {
    if (card.payload) {
      navigator.clipboard.writeText(card.payload);
      toast.success("Link copied to clipboard");
    }
  };

  return (
    <aside className="flex flex-col h-full bg-card/30 border-l border-border overflow-hidden">
      <div className="p-4 border-b border-border bg-background/50">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Contextual Action</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <ActionCard
          card={card}
          dialogue={dialogue}
          segmentIndex={0}
          totalSegments={1}
        />

        {isUrl && (
          <div className="space-y-3 pt-4 border-t border-border/50">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Resources</p>
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm" className="w-full justify-start text-xs h-9 gap-2" onClick={handleCopy}>
                <Copy className="w-3.5 h-3.5" />
                Copy Action Link
              </Button>
              <Button variant="link" size="sm" className="w-full justify-start text-[11px] h-8 text-primary p-0" onClick={() => window.open(card.payload, '_blank')}>
                <ExternalLink className="w-3 h-3 mr-2" />
                Open Source Directly
              </Button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
