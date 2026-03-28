import { Button } from "@/components/ui/button";
import { ExternalLink, Mail, Cloud, Calendar, Code, Link as LinkIcon, Bookmark, Check, Play, X, Loader2, AlertTriangle, CheckCircle2, Github } from "lucide-react";
import { useState, useCallback } from "react";
import { addToReadingList, createAction, approveAction, executeAction, type ActionRecord } from "@/lib/api";
import { toast } from "sonner";

interface ActionCardData {
  is_active: boolean;
  card_type?: string;
  title?: string;
  action_button_text?: string;
  action_payload?: string;
  evidence_refs?: string[];
  // New structured fields for actionable cards
  provider?: string;
  action_type?: string;
  structured_payload?: Record<string, any>;
}

interface ActionCardProps {
  card: ActionCardData | null;
  dialogue: string;
  segmentIndex: number;
  totalSegments: number;
  scriptId?: string | null;
  onEvidenceClick?: (sourceId: string) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  calendar_join: <Calendar className="w-5 h-5" />,
  calendar_create_event: <Calendar className="w-5 h-5" />,
  link_open: <LinkIcon className="w-5 h-5" />,
  email_reply: <Mail className="w-5 h-5" />,
  gmail_create_draft: <Mail className="w-5 h-5" />,
  jira_open: <ExternalLink className="w-5 h-5" />,
  github_review: <Code className="w-5 h-5" />,
  github_create_issue: <Github className="w-5 h-5" />,
  weather_widget: <Cloud className="w-5 h-5" />,
  save_reading_list: <Bookmark className="w-5 h-5" />,
  summary: <CheckCircle2 className="w-5 h-5" />,
  approval: <CheckCircle2 className="w-5 h-5" />,
};

type ActionLifecycle = "idle" | "proposing" | "proposed" | "approving" | "approved" | "executing" | "completed" | "failed" | "canceled";

export function ActionCard({ card, dialogue, segmentIndex, totalSegments, scriptId, onEvidenceClick }: ActionCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [lifecycle, setLifecycle] = useState<ActionLifecycle>("idle");
  const [actionRecord, setActionRecord] = useState<ActionRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isActive = card && card.is_active;
  const isActionable = isActive && (card.card_type === "approval" || !!card.action_type || !!card.provider);
  const isWeather = isActive && card.card_type === "weather_widget";

  const handleLegacyAction = useCallback(async () => {
    if (!card) return;
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
    if (card.action_payload) {
      window.open(card.action_payload, "_blank");
    }
  }, [card]);

  const handlePropose = useCallback(async () => {
    if (!card.provider && !card.action_type) return;
    setLifecycle("proposing");
    setError(null);
    try {
      const provider = card.provider || "internal";
      const actionType = card.action_type || "internal_approve";
      const payload = card.structured_payload || { url: card.action_payload };

      const result = await createAction({
        provider,
        action_type: actionType,
        payload,
        briefing_script_id: scriptId || undefined,
        segment_id: String(segmentIndex),
        evidence_source_ids: card.evidence_refs || [],
      });
      setActionRecord(result);
      setLifecycle(result.existing ? (result.status as ActionLifecycle) : "proposed");
    } catch (e: any) {
      setError(e.message);
      setLifecycle("failed");
    }
  }, [card, scriptId, segmentIndex]);

  const handleApprove = useCallback(async (approve: boolean) => {
    if (!actionRecord?.action_id) return;
    setLifecycle("approving");
    setError(null);
    try {
      const result = await approveAction(actionRecord.action_id, approve);
      setActionRecord(prev => ({ ...prev!, status: result.status }));
      setLifecycle(approve ? "approved" : "canceled");
      if (!approve) toast.info("Action canceled");
    } catch (e: any) {
      setError(e.message);
      setLifecycle("proposed");
    }
  }, [actionRecord]);

  const handleExecute = useCallback(async () => {
    if (!actionRecord?.action_id) return;
    setLifecycle("executing");
    setError(null);
    try {
      const result = await executeAction(actionRecord.action_id);
      setActionRecord(prev => ({ ...prev!, ...result }));
      setLifecycle(result.status as ActionLifecycle);
      if (result.status === "completed") {
        toast.success("Action executed successfully!");
      }
    } catch (e: any) {
      setError(e.message);
      setLifecycle("failed");
    }
  }, [actionRecord]);

  const resultUrl = actionRecord?.provider_result?.issue_url
    || actionRecord?.provider_result?.html_link
    || (actionRecord?.provider_result?.draft_id
      ? `https://mail.google.com/mail/u/0/#drafts`
      : null);

  if (!isActive) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-muted-foreground text-sm">No action for this segment</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {iconMap[card!.action_type || card!.card_type || ""] || <ExternalLink className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-card-foreground text-sm truncate">{card.title}</h3>
          {lifecycle !== "idle" && (
            <span className={`text-[10px] font-bold uppercase tracking-widest ${
              lifecycle === "completed" ? "text-emerald-400" :
              lifecycle === "failed" ? "text-red-400" :
              lifecycle === "canceled" ? "text-muted-foreground" :
              "text-primary"
            }`}>
              {lifecycle === "proposing" ? "Creating…" :
               lifecycle === "approving" ? "Processing…" :
               lifecycle === "executing" ? "Executing…" :
               lifecycle}
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-3">{dialogue}</p>

      {/* Evidence refs */}
      {card.evidence_refs && card.evidence_refs.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.evidence_refs.map((ref, i) => (
            <button
              key={i}
              onClick={() => onEvidenceClick?.(ref)}
              className="text-[9px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded hover:bg-primary/20 transition-colors"
            >
              [{ref.slice(0, 20)}…]
            </button>
          ))}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 rounded px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* Success result link */}
      {lifecycle === "completed" && resultUrl && (
        <Button
          variant="outline"
          size="sm"
          className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
          onClick={() => window.open(resultUrl, "_blank")}
        >
          <ExternalLink className="w-4 h-4" />
          View Result
        </Button>
      )}

      {/* Action buttons based on lifecycle */}
      {!isWeather && (
        <div className="space-y-2">
          {/* Idle: show propose or legacy action */}
          {lifecycle === "idle" && isActionable && (
            <Button variant="glow" size="sm" className="w-full" onClick={handlePropose}>
              {iconMap[card.action_type || card.card_type || ""] || <Play className="w-4 h-4" />}
              {card.action_button_text || "Propose Action"}
            </Button>
          )}

          {lifecycle === "idle" && !isActionable && card.action_button_text && (
            <Button
              variant={isSaved ? "success" : "glow"}
              size="sm"
              className="w-full"
              onClick={handleLegacyAction}
              disabled={isSaved}
            >
              {isSaved ? <Check className="w-4 h-4" /> : (iconMap[card.card_type || ""] || <ExternalLink className="w-4 h-4" />)}
              {isSaved ? "Saved to List" : card.action_button_text}
            </Button>
          )}

          {/* Proposing/Approving/Executing spinner */}
          {(lifecycle === "proposing" || lifecycle === "approving" || lifecycle === "executing") && (
            <Button variant="outline" size="sm" className="w-full" disabled>
              <Loader2 className="w-4 h-4 animate-spin" />
              {lifecycle === "proposing" ? "Creating…" : lifecycle === "approving" ? "Processing…" : "Executing…"}
            </Button>
          )}

          {/* Proposed: approve / cancel */}
          {lifecycle === "proposed" && (
            <div className="flex gap-2">
              <Button variant="glow" size="sm" className="flex-1" onClick={() => handleApprove(true)}>
                <CheckCircle2 className="w-4 h-4" />
                Approve
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => handleApprove(false)}>
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </div>
          )}

          {/* Approved: execute */}
          {lifecycle === "approved" && (
            <Button variant="glow" size="sm" className="w-full" onClick={handleExecute}>
              <Play className="w-4 h-4" />
              Execute Now
            </Button>
          )}

          {/* Failed: retry */}
          {lifecycle === "failed" && (
            <Button variant="outline" size="sm" className="w-full text-red-400" onClick={handlePropose}>
              <AlertTriangle className="w-4 h-4" />
              Retry
            </Button>
          )}
        </div>
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
