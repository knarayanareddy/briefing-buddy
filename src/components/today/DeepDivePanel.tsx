import { useState } from "react";
import { Search, ShieldCheck, Loader2, ExternalLink, ChevronDown, ChevronRight, Clock, Zap, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface DeepDivePanelProps {
  evidenceSourceIds: string[];
  scriptId?: string | null;
  segmentId?: number;
  onClose: () => void;
}

interface Citation {
  title: string;
  url?: string;
  relevance?: string;
}

interface ToolStep {
  step: number;
  tool: string;
  action: string;
  finding: string;
  duration_ms?: number;
}

interface RunResult {
  run_id: string;
  status: string;
  summary?: string;
  verdict?: string;
  key_findings?: string[];
  citations?: Citation[];
  tool_trace?: ToolStep[];
}

async function getHeaders() {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
  if (data.session) {
    headers["Authorization"] = `Bearer ${data.session.access_token}`;
  } else {
    headers["x-internal-api-key"] = "hackathon_unlocked_preview_2024";
    headers["x-preview-user-id"] = "00000000-0000-0000-0000-000000000000";
  }
  return headers;
}

export default function DeepDivePanel({ evidenceSourceIds, scriptId, segmentId, onClose }: DeepDivePanelProps) {
  const [result, setResult] = useState<RunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<"deep_dive" | "verify">("deep_dive");

  const runAnalysis = async (type: "deep_dive" | "verify") => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const headers = await getHeaders();
      const res = await fetch(`${FUNCTIONS_BASE}/deep-dive-run`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          evidence_source_ids: evidenceSourceIds,
          run_type: type,
          script_id: scriptId,
          segment_id: segmentId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `Error ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleStep = (step: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      next.has(step) ? next.delete(step) : next.add(step);
      return next;
    });
  };

  const verdictColor = (v?: string) => {
    if (v === "verified") return "text-emerald-400";
    if (v === "partially_verified") return "text-amber-400";
    if (v === "unverified") return "text-rose-400";
    return "text-white/40";
  };

  const VerdictIcon = ({ verdict }: { verdict?: string }) => {
    if (verdict === "verified") return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    if (verdict === "partially_verified") return <AlertTriangle className="w-5 h-5 text-amber-400" />;
    if (verdict === "unverified") return <XCircle className="w-5 h-5 text-rose-400" />;
    return null;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Tab selector */}
      <div className="flex gap-2">
        <button
          onClick={() => { setActiveTab("deep_dive"); if (!result) runAnalysis("deep_dive"); }}
          className={cn(
            "flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border",
            activeTab === "deep_dive"
              ? "bg-[#5789FF]/20 border-[#5789FF]/30 text-[#5789FF]"
              : "bg-white/5 border-white/5 text-white/30 hover:text-white/50"
          )}
        >
          <Search className="w-3.5 h-3.5" />
          Deep Dive
        </button>
        <button
          onClick={() => { setActiveTab("verify"); runAnalysis("verify"); }}
          className={cn(
            "flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border",
            activeTab === "verify"
              ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
              : "bg-white/5 border-white/5 text-white/30 hover:text-white/50"
          )}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Verify
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center py-8 space-y-3 animate-pulse">
          <div className="w-12 h-12 rounded-2xl bg-[#5789FF]/10 border border-[#5789FF]/20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[#5789FF] animate-spin" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
            {activeTab === "verify" ? "Verifying claims..." : "Running deep dive analysis..."}
          </p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#5789FF]/30 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
          <p className="text-[11px] text-rose-400">{error}</p>
          <button onClick={() => runAnalysis(activeTab)} className="text-[10px] text-rose-300 underline mt-1">Retry</button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-500">
          {/* Verdict badge (verify mode) */}
          {result.verdict && result.verdict !== "n/a" && (
            <div className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl border", 
              result.verdict === "verified" ? "bg-emerald-500/10 border-emerald-500/20" :
              result.verdict === "partially_verified" ? "bg-amber-500/10 border-amber-500/20" :
              "bg-rose-500/10 border-rose-500/20"
            )}>
              <VerdictIcon verdict={result.verdict} />
              <span className={cn("text-xs font-bold uppercase tracking-wider", verdictColor(result.verdict))}>
                {result.verdict.replace("_", " ")}
              </span>
            </div>
          )}

          {/* Summary */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
            <h5 className="text-[9px] font-black uppercase tracking-widest text-[#5789FF] mb-2">Summary</h5>
            <p className="text-xs text-white/70 leading-relaxed">{result.summary}</p>
          </div>

          {/* Key findings */}
          {result.key_findings && result.key_findings.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-[9px] font-black uppercase tracking-widest text-white/30">Key Findings</h5>
              {result.key_findings.map((f, i) => (
                <div key={i} className="flex items-start gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/5">
                  <Zap className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-white/60">{f}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tool Trace */}
          {result.tool_trace && result.tool_trace.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-[9px] font-black uppercase tracking-widest text-white/30">Agent Tool Trace</h5>
              <div className="space-y-1">
                {result.tool_trace.map((step) => (
                  <div key={step.step} className="bg-black/40 rounded-lg border border-white/5 overflow-hidden">
                    <button
                      onClick={() => toggleStep(step.step)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors"
                    >
                      {expandedSteps.has(step.step) ? (
                        <ChevronDown className="w-3 h-3 text-white/20 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-white/20 shrink-0" />
                      )}
                      <span className="text-[9px] font-mono text-[#5789FF] w-4">{step.step}</span>
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider w-20 text-left">{step.tool}</span>
                      <span className="text-[10px] text-white/30 flex-1 text-left truncate">{step.action}</span>
                      {step.duration_ms && (
                        <span className="text-[9px] font-mono text-white/15 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />{step.duration_ms}ms
                        </span>
                      )}
                    </button>
                    {expandedSteps.has(step.step) && (
                      <div className="px-3 pb-3 pt-1 border-t border-white/5">
                        <p className="text-[11px] text-white/50 leading-relaxed">{step.finding}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Citations */}
          {result.citations && result.citations.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-[9px] font-black uppercase tracking-widest text-white/30">Citations</h5>
              {result.citations.map((c, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/5">
                  <ExternalLink className="w-3 h-3 text-[#5789FF] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/60 truncate">{c.title}</p>
                    {c.relevance && <p className="text-[9px] text-white/25">{c.relevance}</p>}
                  </div>
                  {c.url && (
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-[#5789FF] hover:underline shrink-0">
                      Open
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Initial state - no result yet */}
      {!loading && !result && !error && (
        <div className="flex flex-col items-center py-6 space-y-3">
          <button
            onClick={() => runAnalysis(activeTab)}
            className="h-12 px-6 bg-[#5789FF]/20 border border-[#5789FF]/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#5789FF] hover:bg-[#5789FF]/30 transition-all flex items-center gap-2"
          >
            {activeTab === "verify" ? <ShieldCheck className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            {activeTab === "verify" ? "Verify Claims" : "Start Deep Dive"}
          </button>
          <p className="text-[9px] text-white/20 text-center max-w-[200px]">
            AI agent will analyze evidence sources and provide a grounded report with tool traces
          </p>
        </div>
      )}

      {/* Close/Back */}
      <button
        onClick={onClose}
        className="w-full h-9 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-white/50 transition-colors"
      >
        Close Analysis
      </button>
    </div>
  );
}
