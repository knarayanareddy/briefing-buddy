import { cn } from "@/lib/utils";
import { 
  CheckCircle2, 
  Circle, 
  Loader2, 
  AlertCircle, 
  PlayCircle, 
  Newspaper, 
  Github, 
  Mail, 
  CloudSun,
  Zap,
  Shield,
  Activity
} from "lucide-react";

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

const TYPE_MAP: Record<string, { icon: any, label: string }> = {
  news_segment: { icon: Newspaper, label: "Intel Report" },
  github_prs: { icon: Github, label: "Code Analysis" },
  email_item: { icon: Mail, label: "Comm Signal" },
  weather_segment: { icon: CloudSun, label: "Environment" },
  default: { icon: Zap, label: "Strategic Segment" }
};

export default function SegmentTimeline({ segments, currentIndex, onSelect }: SegmentTimelineProps) {
  return (
    <aside className="flex flex-col h-full bg-black/40 border-r border-white/5 overflow-hidden animate-in slide-in-from-left-4 duration-1000">
      <div className="p-8 border-b border-white/5 space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Strategic Timeline</h3>
        <div className="flex items-center gap-3">
           <div className="px-2 py-1 rounded bg-[#5789FF]/10 border border-[#5789FF]/20 text-[#5789FF] text-[9px] font-bold uppercase tracking-widest">
              Live Feed
           </div>
           <span className="text-[10px] text-white/20 font-mono">ID: {Math.random().toString(36).substring(7).toUpperCase()}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 noscrollbar">
        {segments.map((segment, idx) => {
          const isActive = idx === currentIndex;
          const info = TYPE_MAP[segment.segment_type || ""] || TYPE_MAP.default;
          const Icon = info.icon;
          
          return (
            <button
              key={segment.segment_id}
              onClick={() => onSelect(idx)}
              className={cn(
                "w-full p-5 rounded-2xl text-left transition-all duration-300 relative group overflow-hidden border",
                isActive 
                  ? "bg-[#111928] border-[#5789FF]/30 shadow-[0_0_30px_rgba(87,137,255,0.1)]" 
                  : "bg-white/[0.02] border-white/5 hover:border-white/10"
              )}
            >
              {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#5789FF]" />}
              
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg",
                  isActive ? "bg-[#5789FF]/20 text-[#5789FF]" : "bg-white/5 text-white/20 group-hover:text-white/40"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      isActive ? "text-[#5789FF]" : "text-white/20"
                    )}>
                      {info.label}
                    </span>
                    <StatusIndicator status={segment.status} />
                  </div>
                  <h4 className={cn(
                    "text-xs font-bold truncate transition-colors",
                    isActive ? "text-white" : "text-white/40"
                  )}>
                    Segment {idx + 1}
                  </h4>
                </div>
              </div>

              {isActive && segment.dialogue && (
                <div className="mt-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
                   <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed italic">
                      "{segment.dialogue}"
                   </p>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function StatusIndicator({ status }: { status: string }) {
  switch (status) {
    case "complete":
      return <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />;
    case "rendering":
      return <Loader2 className="w-3 h-3 text-[#5789FF] animate-spin" />;
    case "failed":
      return <AlertCircle className="w-3 h-3 text-rose-500" />;
    default:
      return <div className="w-1.5 h-1.5 rounded-full bg-white/10" />;
  }
}
