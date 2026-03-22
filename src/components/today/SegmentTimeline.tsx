import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Loader2, AlertCircle, PlayCircle, Newspaper, Github, Mail, CloudSun } from "lucide-react";

interface Segment {
  segment_id: string | number;
  status: string;
  dialogue?: string;
  segment_type?: string;
}

interface SegmentTimelineProps {
  segments: Segment[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

const ICON_MAP: Record<string, any> = {
  news_segment: Newspaper,
  github_prs: Github,
  email_item: Mail,
  weather_segment: CloudSun,
};

export default function SegmentTimeline({ segments, currentIndex, onSelect }: SegmentTimelineProps) {
  return (
    <aside className="flex flex-col h-full bg-card/30 border-r border-border overflow-hidden">
      <div className="p-4 border-b border-border bg-background/50">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Briefing Timeline</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {segments.map((segment, idx) => {
          const isActive = idx === currentIndex;
          const Icon = ICON_MAP[segment.segment_type || ""] || PlayCircle;
          
          return (
            <button
              key={segment.segment_id}
              onClick={() => onSelect(idx)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all group",
                isActive 
                  ? "bg-primary/10 border border-primary/20" 
                  : "hover:bg-secondary/50 border border-transparent"
              )}
            >
              <div className={cn(
                "mt-0.5 shrink-0",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}>
                <Icon className="w-4 h-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={cn(
                    "text-xs font-semibold truncate",
                    isActive ? "text-primary" : "text-foreground"
                  )}>
                    Segment {idx + 1}
                  </span>
                  <StatusIcon status={segment.status} />
                </div>
                {segment.dialogue && (
                  <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                    {segment.dialogue}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
    case "rendering":
      return <Loader2 className="w-3 h-3 text-primary animate-spin" />;
    case "failed":
      return <AlertCircle className="w-3 h-3 text-destructive" />;
    default:
      return <Circle className="w-3 h-3 text-muted-foreground/30" />;
  }
}
