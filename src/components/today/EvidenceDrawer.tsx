import { useState, useEffect } from "react";
import { getEvidenceItem } from "@/lib/api";
import { ExternalLink, X, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EvidenceDrawerProps {
  sourceId: string | null;
  onClose: () => void;
}

export default function EvidenceDrawer({ sourceId, onClose }: EvidenceDrawerProps) {
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sourceId) {
      setItem(null);
      return;
    }
    setLoading(true);
    setError(null);
    getEvidenceItem(sourceId)
      .then(data => {
        setItem(data);
        if (!data) setError("Evidence item not found");
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [sourceId]);

  if (!sourceId) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 z-50 bg-[#0d1117] border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-black uppercase tracking-widest text-white/60">Evidence Source</h3>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors">
          <X className="w-4 h-4 text-white/40" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading && (
          <div className="flex items-center justify-center pt-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="text-sm text-red-400 bg-red-400/10 rounded-lg p-4">
            {error}
          </div>
        )}

        {item && !loading && (
          <>
            {/* Provider badge */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary px-2 py-1 rounded">
                {item.provider}
              </span>
              {item.item_type && (
                <span className="text-[10px] font-bold uppercase tracking-widest bg-white/5 text-white/40 px-2 py-1 rounded">
                  {item.item_type}
                </span>
              )}
            </div>

            {/* Title */}
            <h4 className="text-base font-bold text-white leading-tight">{item.title || "Untitled"}</h4>

            {/* Author & Date */}
            <div className="flex flex-wrap gap-4 text-xs text-white/40">
              {item.author && <span>By: {item.author}</span>}
              {item.occurred_at && (
                <span>{new Date(item.occurred_at).toLocaleString()}</span>
              )}
            </div>

            {/* Summary */}
            {item.summary && (
              <div className="space-y-2">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-white/30">Summary</h5>
                <p className="text-sm text-white/70 leading-relaxed">{item.summary}</p>
              </div>
            )}

            {/* Source ID */}
            <div className="space-y-1">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-white/30">Source ID</h5>
              <code className="text-[11px] font-mono text-white/30 break-all">{item.source_id}</code>
            </div>

            {/* Payload details */}
            {item.payload && Object.keys(item.payload).length > 0 && (
              <div className="space-y-2">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-white/30">Metadata</h5>
                <pre className="text-[11px] font-mono text-white/40 bg-white/5 rounded-lg p-3 overflow-x-auto max-h-48">
                  {JSON.stringify(item.payload, null, 2)}
                </pre>
              </div>
            )}

            {/* Open source link */}
            {item.url && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(item.url, "_blank")}
              >
                <ExternalLink className="w-4 h-4" />
                Open Original Source
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
