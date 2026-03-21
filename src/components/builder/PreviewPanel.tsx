import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Play, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  LayoutList, 
  Info,
  ChevronRight,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface PreviewResult {
  total_segments: number;
  segments: {
    module_id: string;
    title: string;
    type: string;
    grounding_source_ids: string[];
  }[];
  stale_connectors: string[];
  missing_connectors: string[];
}

interface PreviewPanelProps {
  onPreview: () => void;
  isLoading: boolean;
  result: PreviewResult | null;
}

export default function PreviewPanel({ onPreview, isLoading, result }: PreviewPanelProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="flex flex-col h-full bg-card/30 border-l border-border animate-in fade-in duration-700">
      <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Briefing Preview</h3>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onPreview} 
          disabled={isLoading}
          className="h-8 gap-2 border-primary/20 hover:bg-primary/5 text-primary"
        >
          {isLoading ? (
            <Clock className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
          Preview Plan
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {!result ? (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 px-6 grayscale">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <LayoutList className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">No preview generated yet</p>
              <p className="text-xs text-muted-foreground/60 leading-relaxed">
                Click the preview button to see how your briefing will be structured based on current settings.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3 bg-secondary/50 border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total Segments</p>
                <p className="text-2xl font-bold text-foreground">{result.total_segments}</p>
              </Card>
              <Card className="p-3 bg-secondary/50 border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Status</p>
                <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Ready
                </div>
              </Card>
            </div>

            {/* Connector Warnings */}
            {(result.missing_connectors.length > 0 || result.stale_connectors.length > 0) && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-destructive uppercase tracking-widest">Connectivity Alerts</p>
                {result.missing_connectors.map(c => (
                  <div key={c} className="flex items-center gap-2 text-[11px] text-destructive bg-destructive/5 p-2 rounded-lg border border-destructive/10">
                    <AlertTriangle className="w-3 h-3" />
                    Missing source: <span className="font-bold underline cursor-pointer">{c}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Segment List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Planned Timeline</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Show Details</span>
                  <input
                    type="checkbox"
                    checked={showDetails}
                    onChange={(e) => setShowDetails(e.target.checked)}
                    className="w-3 h-3 rounded-full border-border bg-background"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                {result.segments.map((seg, i) => (
                  <div key={i} className="group p-3 rounded-xl bg-background border border-border shadow-sm hover:border-primary/30 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0 border border-border">
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-foreground truncate">{seg.title}</p>
                          <p className="text-[9px] text-muted-foreground uppercase tracking-tighter">{seg.type}</p>
                        </div>
                      </div>
                    </div>
                    
                    {showDetails && seg.grounding_source_ids.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                        <p className="text-[8px] font-bold text-muted-foreground uppercase">Grounding Sources</p>
                        <div className="flex flex-wrap gap-1">
                          {seg.grounding_source_ids.map(id => (
                            <span key={id} className="text-[8px] font-mono bg-muted px-1 rounded truncate max-w-[120px]">
                              {id}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
