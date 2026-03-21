import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface DebugPanelProps {
  scriptJson: unknown;
  jobStatus: string | null;
  errors: string[];
}

export function DebugPanel({ scriptJson, jobStatus, errors }: DebugPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-border bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2 flex items-center justify-between text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>Debug Panel {jobStatus ? `• Job: ${jobStatus}` : ""} {errors.length > 0 ? `• ${errors.length} error(s)` : ""}</span>
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 max-h-64 overflow-auto">
          {errors.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-destructive">Errors:</p>
              {errors.map((e, i) => (
                <p key={i} className="text-xs font-mono text-destructive/80 bg-destructive/10 p-2 rounded">{e}</p>
              ))}
            </div>
          )}
          {jobStatus && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Job Status:</p>
              <span className={`text-xs font-mono px-2 py-1 rounded ${
                jobStatus === "complete" ? "bg-success/20 text-success" :
                jobStatus === "failed" ? "bg-destructive/20 text-destructive" :
                "bg-warning/20 text-warning"
              }`}>{jobStatus}</span>
            </div>
          )}
          {scriptJson && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Script JSON:</p>
              <pre className="text-xs font-mono text-muted-foreground bg-muted p-3 rounded overflow-auto max-h-40">
                {JSON.stringify(scriptJson, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
