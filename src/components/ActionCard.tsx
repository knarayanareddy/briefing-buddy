import { Button } from "@/components/ui/button";
import { ExternalLink, Mail, Cloud, Calendar, Code, Link as LinkIcon, Bookmark, Check } from "lucide-react";
import { useState } from "react";
import { addToReadingList } from "@/lib/api";

interface ActionCardData {
  is_active: boolean;
  card_type?: string;
  title?: string;
  action_button_text?: string;
  action_payload?: string;
}

interface ActionCardProps {
  card: ActionCardData | null;
  dialogue: string;
  segmentIndex: number;
  totalSegments: number;
}

const iconMap: Record<string, React.ReactNode> = {
  calendar_join: <Calendar className="w-5 h-5" />,
  link_open: <LinkIcon className="w-5 h-5" />,
  email_reply: <Mail className="w-5 h-5" />,
  jira_open: <ExternalLink className="w-5 h-5" />,
  github_review: <Code className="w-5 h-5" />,
  weather_widget: <Cloud className="w-5 h-5" />,
  save_reading_list: <Bookmark className="w-5 h-5" />,
};

export function ActionCard({ card, dialogue, segmentIndex, totalSegments }: ActionCardProps) {
  const [isSaved, setIsSaved] = useState(false);

  if (!card || !card.is_active) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-muted-foreground text-sm">No action for this segment</p>
      </div>
    );
  }

  const handleAction = async () => {
    if (card.card_type === "save_reading_list") {
      try {
        await addToReadingList({
          source_id: card.action_payload || "unknown",
          title: card.title || "Untitled Item",
          url: card.action_payload || "#",
        });
        setIsSaved(true);
      } catch (e) {
        console.error("Failed to save to reading list:", e);
      }
      return;
    }

    if (card.card_type === "email_reply") {
      // For hackathon: just open mailto
      if (card.action_payload) window.open(card.action_payload, "_blank");
    } else if (card.action_payload) {
      window.open(card.action_payload, "_blank");
    }
  };

  const isWeather = card.card_type === "weather_widget";

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {iconMap[card.card_type || ""] || <ExternalLink className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-card-foreground text-sm truncate">{card.title}</h3>
        </div>
      </div>

      <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-3">{dialogue}</p>

      {!isWeather && card.action_button_text && (
        <Button 
          variant={isSaved ? "success" : "glow"} 
          size="sm" 
          className="w-full" 
          onClick={handleAction}
          disabled={isSaved}
        >
          {isSaved ? <Check className="w-4 h-4" /> : (iconMap[card.card_type || ""] || <ExternalLink className="w-4 h-4" />)}
          {isSaved ? "Saved to List" : card.action_button_text}
        </Button>
      )}

      <div className="flex items-center gap-1 pt-1">
        {Array.from({ length: totalSegments }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i === segmentIndex ? "bg-primary" : i < segmentIndex ? "bg-primary/30" : "bg-secondary"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
