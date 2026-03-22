import { useState, useCallback, useEffect, useRef } from "react";
import { 
  generateScript, 
  startRender, 
  getJobStatus, 
  setInternalApiKey, 
  assembleUserData, 
  syncRequiredConnectors, 
  type SegmentStatus 
} from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { mockScriptJson } from "@/lib/mockData";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Database } from "lucide-react";
import { useDevMode } from "@/lib/devMode";

import SegmentTimeline from "@/components/today/SegmentTimeline";
import VideoStage from "@/components/today/VideoStage";
import ActionPanel from "@/components/today/ActionPanel";
import BriefControls from "@/components/today/BriefControls";
import BriefEmptyState from "@/components/today/BriefEmptyState";

type AppState = "idle" | "generating" | "script_ready" | "rendering" | "ready" | "playing";

export default function Today() {
  const { isDevMode } = useDevMode();
  const [appState, setAppState] = useState<AppState>("idle");
  const [useMock, setUseMock] = useState(true);
  const [scriptId, setScriptId] = useState<string | null>(null);
  const [scriptJson, setScriptJson] = useState<any>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<any>(null);
  const [segments, setSegments] = useState<SegmentStatus[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedProfileId = localStorage.getItem("selectedProfileId");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setHasSession(!!session || isDevMode));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setHasSession(!!s || isDevMode));
    return () => subscription.unsubscribe();
  }, [isDevMode]);

  const addError = (e: string) => setErrors((prev) => [...prev, e]);

  const handleSync = async () => {
    if (!selectedProfileId) return;
    setIsSyncing(true);
    try {
      await syncRequiredConnectors(selectedProfileId, "best_effort");
    } catch (e: any) {
      addError("Sync failed: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGenerateScript = useCallback(async () => {
    setAppState("generating");
    setErrors([]);
    setScriptJson(null);
    setSegments([]);
    
    try {
      if (useMock) {
        await new Promise(r => setTimeout(r, 1500));
        setScriptId(crypto.randomUUID());
        setScriptJson(mockScriptJson);
        const mockSegs: SegmentStatus[] = mockScriptJson.timeline_segments.map((t) => ({
          segment_id: t.segment_id,
          avatar_video_url: null,
          b_roll_image_url: null,
          ui_action_card: t.ui_action_card,
          dialogue: t.dialogue,
          grounding_source_id: t.grounding_source_id,
          status: "queued",
          error: null,
        }));
        setSegments(mockSegs);
        setCurrentIdx(0);
        setAppState("script_ready");
      } else {
        if (!apiKey && !hasSession) throw new Error("Authentication required for live mode");
        if (apiKey) setInternalApiKey(apiKey);
        
        const assembled = await assembleUserData();
        const res = await generateScript({}, assembled.user_data, selectedProfileId || undefined);
        setScriptId(res.script_id);
        setScriptJson(res.script_json);
        
        const initialSegs: SegmentStatus[] = (res.script_json as any).timeline_segments.map((t: any) => ({
          segment_id: t.segment_id,
          avatar_video_url: null,
          b_roll_image_url: null,
          ui_action_card: t.ui_action_card,
          dialogue: t.dialogue,
          grounding_source_id: t.grounding_source_id,
          status: "queued",
          error: null,
        }));
        setSegments(initialSegs);
        setAppState("script_ready");
      }
    } catch (e: any) {
      addError(e.message);
      setAppState("idle");
    }
  }, [useMock, apiKey, hasSession, selectedProfileId]);

  const handleRender = useCallback(async () => {
    if (!scriptId) return;
    setAppState("rendering");
    try {
      if (useMock) {
        for (let i = 0; i < segments.length; i++) {
          setSegments(prev => prev.map((s, idx) => idx === i ? { ...s, status: "rendering" } : s));
          await new Promise(r => setTimeout(r, 1000));
          setSegments(prev => prev.map((s, idx) => idx === i ? { 
            ...s, 
            status: "complete",
            b_roll_image_url: `https://picsum.photos/seed/seg${s.segment_id}/800/450`
          } : s));
          setProgress({ percent_complete: Math.round(((i + 1) / segments.length) * 100), complete: i + 1, total: segments.length });
        }
        setJobStatus("complete");
        setAppState("ready");
      } else {
        const res = await startRender(scriptId);
        setJobId(res.job_id);
        setJobStatus("rendering");

        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
          try {
            const status = await getJobStatus(res.job_id);
            setJobStatus(status.status);
            setSegments(status.segments);
            if (status.progress) setProgress(status.progress);
            if (status.status === "complete" || status.status === "failed") {
              if (pollRef.current) clearInterval(pollRef.current);
              setAppState(status.status === "complete" ? "ready" : "idle");
            }
          } catch (e: any) {
            addError("Polling error: " + e.message);
          }
        }, 3000);
      }
    } catch (e: any) {
      addError(e.message);
      setAppState("script_ready");
    }
  }, [scriptId, useMock, segments]);

  const handleVideoEnd = () => {
    if (currentIdx < segments.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setAppState("ready");
    }
  };

  const handlePlay = () => {
    setAppState("playing");
    setCurrentIdx(0);
  };

  const currentSegment = segments[currentIdx];

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden animate-in fade-in duration-1000">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* Left column: Timeline */}
        <div className="md:col-span-3 hidden md:block overflow-hidden">
          <SegmentTimeline 
            segments={segments.map((s, i) => ({
              ...s,
              segment_type: (scriptJson as any)?.timeline_segments?.[i]?.segment_type
            }))} 
            currentIndex={currentIdx} 
            onSelect={setCurrentIdx} 
          />
        </div>

        {/* Center column: Video Stage */}
        <div className="md:col-span-6 flex flex-col overflow-hidden relative border-r border-border">
          {segments.length === 0 ? (
            <BriefEmptyState 
              onGenerate={handleGenerateScript} 
              isGenerating={appState === "generating"} 
            />
          ) : (
            <div className="flex-1 flex flex-col overflow-y-auto p-8 space-y-6">
              <VideoStage
                videoUrl={currentSegment?.avatar_video_url}
                bRollUrl={currentSegment?.b_roll_image_url}
                status={currentSegment?.status}
                progress={progress}
                onEnded={handleVideoEnd}
                onSkip={() => setCurrentIdx(prev => Math.min(prev + 1, segments.length - 1))}
                isPlaying={appState === "playing"}
                segmentLabel={`Segment ${currentIdx + 1}: ${(scriptJson as any)?.timeline_segments?.[currentIdx]?.segment_type || "processing"}`}
              />

              <div className="max-w-3xl mx-auto w-full p-6 rounded-2xl bg-card border border-border shadow-sm space-y-3">
                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Live Transcript</p>
                <p className="text-xl text-foreground font-medium leading-relaxed italic">
                  "{currentSegment?.dialogue}"
                </p>
                <div className="flex items-center gap-2 pt-2 opacity-50">
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-secondary text-muted-foreground uppercase">
                    Ref ID: {currentSegment?.grounding_source_id}
                  </span>
                </div>
              </div>
            </div>
          )}

          {segments.length > 0 && (
            <BriefControls 
              state={appState}
              onGenerate={handleGenerateScript}
              onRender={handleRender}
              onPlay={handlePlay}
              onSync={handleSync}
              isSyncing={isSyncing}
            />
          )}
        </div>

        {/* Right column: Action Panel */}
        <div className="md:col-span-3 overflow-hidden">
          <ActionPanel 
            card={currentSegment?.ui_action_card} 
            dialogue={currentSegment?.dialogue || ""} 
          />
        </div>
      </div>

      {/* Developer Details Panel (Gated) */}
      {isDevMode && (
        <div className="border-t border-border bg-card/10 px-6 py-2">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="technical" className="border-none">
              <AccordionTrigger className="hover:no-underline py-2 px-4 rounded-lg bg-muted/50 border border-border group">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
                    Technical Details & Debug
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={() => setUseMock(!useMock)}
                    className={`h-7 px-3 text-[10px] rounded-md border transition-all font-mono ${
                      useMock ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-secondary border-border text-muted-foreground"
                    }`}
                  >
                    MOCK_MODE: {useMock ? "ON" : "OFF"}
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-mono">Profile: {selectedProfileId || "NONE"}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 h-64 overflow-hidden">
                  <div className="bg-black/80 rounded-lg p-3 overflow-auto">
                    <p className="text-[9px] font-bold text-primary mb-2 uppercase">Script Content</p>
                    <pre className="text-[9px] font-mono text-emerald-400">
                      {JSON.stringify(scriptJson, null, 2)}
                    </pre>
                  </div>
                  <div className="bg-black/80 rounded-lg p-3 overflow-auto">
                    <p className="text-[9px] font-bold text-primary mb-2 uppercase">Errors/Logs</p>
                    <div className="space-y-1">
                      {errors.map((e, i) => (
                        <p key={i} className="text-[9px] font-mono text-red-400">[{i}] {e}</p>
                      ))}
                      {errors.length === 0 && <p className="text-[9px] font-mono text-muted-foreground italic">No errors in current session</p>}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </div>
  );
}
