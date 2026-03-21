import { CheckCircle, Circle, Loader2, AlertCircle } from "lucide-react";

interface Segment {
  segment_id: number;
  dialogue: string;
  status: string;
  segment_type?: string;
}

interface SegmentPlaylistProps {
  segments: Segment[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

const statusIcon = (status: string, isCurrent: boolean) => {
  if (isCurrent) return <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />;
  if (status === "complete") return <CheckCircle className="w-3.5 h-3.5 text-success" />;
  if (status === "rendering") return <Loader2 className="w-3.5 h-3.5 text-warning animate-spin" />;
  if (status === "failed") return <AlertCircle className="w-3.5 h-3.5 text-destructive" />;
  return <Circle className="w-3.5 h-3.5 text-muted-foreground" />;
};

export function SegmentPlaylist({ segments, currentIndex, onSelect }: SegmentPlaylistProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Segments</p>
      {segments.map((seg, i) => (
        <button
          key={seg.segment_id}
          onClick={() => onSelect(i)}
          className={`w-full text-left px-3 py-2 rounded-md text-xs flex items-center gap-2 transition-colors ${
            i === currentIndex
              ? "bg-primary/10 text-primary border border-primary/20"
              : "hover:bg-secondary text-muted-foreground"
          }`}
        >
          {statusIcon(seg.status, i === currentIndex)}
          <span className="truncate flex-1">
            {seg.segment_id}. {seg.dialogue.slice(0, 50)}...
          </span>
        </button>
      ))}
    </div>
  );
}
