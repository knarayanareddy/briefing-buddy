import { useState, useCallback, useEffect, useRef } from "react";
import { 
  generateScript, 
  startRender, 
  getJobStatus, 
  setInternalApiKey, 
  assembleUserData, 
  getBriefing,
  getUserSettings,
  type SegmentStatus,
  type UserSettings
} from "@/lib/api";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { mockScriptJson } from "@/lib/mockData";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Database, Terminal, Shield, Zap, Activity } from "lucide-react";
import { useDevMode } from "@/lib/devMode";

import SegmentTimeline from "@/components/today/SegmentTimeline";
import VideoStage from "@/components/today/VideoStage";
import ActionPanel from "@/components/today/ActionPanel";
import BriefControls from "@/components/today/BriefControls";
import BriefEmptyState from "@/components/today/BriefEmptyState";
import ShareDialog from "@/components/share/ShareDialog";

type AppState = "idle" | "generating" | "script_ready" | "rendering" | "ready" | "playing";

export default function Today() {
  const [searchParams] = useSearchParams();
  const urlScriptId = searchParams.get("script_id");
  const urlJobId = searchParams.get("job_id");
  const urlSeg = searchParams.get("seg");

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
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedProfileId = localStorage.getItem("selectedProfileId");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session || isDevMode);
      if (session) getUserSettings().then(setSettings).catch(() => {});
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setHasSession(!!s || isDevMode));
    return () => subscription.unsubscribe();
  }, [isDevMode]);

  const addError = (e: string) => setErrors((prev) => [...prev, e]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await assembleUserData();
    } catch (e: any) {
      addError("Sync failed: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const startPolling = useCallback((jobIdToPoll: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const status = await getJobStatus(jobIdToPoll);
        setJobStatus(status.status);
        setSegments(status.segments);
        if (status.progress) setProgress(status.progress);
        if (status.status === "complete" || status.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          setAppState(status.status === "complete" ? "ready" : "script_ready");
          
           if (status.status === "complete" && settings?.notification_prefs?.genComplete) {
            toast.success("Briefing Rendered");
          } else if (status.status === "failed" && settings?.notification_prefs?.genError) {
            toast.error("Render Failed");
          }
        }
      } catch (e: any) {
        addError("Polling error: " + e.message);
      }
    }, 3000);
  }, [settings?.notification_prefs?.genComplete, settings?.notification_prefs?.genError]);

  useEffect(() => {
    if (urlScriptId) {
      setUseMock(false);
      const loadBriefing = async () => {
        try {
          const res = await getBriefing(urlScriptId);
          setScriptId(res.script.id);
          setScriptJson(res.script.script_json);
          
          const activeJobId = urlJobId || res.latest_job?.id;

          if (activeJobId) {
            setJobId(activeJobId);
            const status = await getJobStatus(activeJobId);
            setJobStatus(status.status);
            setSegments(status.segments);
            if (status.progress) setProgress(status.progress);
            
            if (status.status === "queued" || status.status === "rendering") {
              setAppState("rendering");
              startPolling(activeJobId);
            } else {
              setAppState(status.status === "complete" ? "ready" : "script_ready");
            }
          } else {
            const initialSegs: SegmentStatus[] = res.script.script_json.timeline_segments.map((t: any) => ({
              segment_id: t.segment_id,
              avatar_video_url: null, b_roll_image_url: null, ui_action_card: t.ui_action_card,
              dialogue: t.dialogue, grounding_source_id: t.grounding_source_id,
              status: "queued", error: null,
            }));
            setSegments(initialSegs);
            setAppState("script_ready");
          }

          if (urlSeg) {
             const requestedIdx = parseInt(urlSeg, 10);
             if (!isNaN(requestedIdx)) {
               setCurrentIdx(Math.min(requestedIdx, res.script.script_json.timeline_segments.length - 1));
             }
          }
        } catch (err: any) {
          addError("Failed to load briefing: " + err.message);
        }
      };
      loadBriefing();
    }
  }, [urlScriptId, urlJobId, urlSeg, startPolling]);

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
        const res = await generateScript({ 
          user_data: assembled.user_data,
          profile_id: selectedProfileId || undefined
        });
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
        startPolling(res.job_id);
      }
    } catch (e: any) {
      addError(e.message);
      setAppState("script_ready");
    }
  }, [scriptId, useMock, segments, startPolling]);

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
    <div className="flex flex-col h-full bg-[#0B0E14] overflow-hidden animate-in fade-in duration-1000">
      
      {/* 3-COLUMN BRIEFING ENGINE */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden px-1">
        
        {/* COL 1: STRATEGIC TIMELINE */}
        <div className="col-span-3 h-full overflow-hidden border-r border-white/5">
          <SegmentTimeline 
            segments={segments.map((s, i) => ({
              ...s,
              segment_type: (scriptJson as any)?.timeline_segments?.[i]?.segment_type
            }))} 
            currentIndex={currentIdx} 
            onSelect={setCurrentIdx} 
          />
        </div>

        {/* COL 2: NEURAL STAGE */}
        <div className="col-span-6 flex flex-col overflow-hidden relative p-10 space-y-8 bg-gradient-to-b from-[#0B0E14] to-black/40">
          {segments.length === 0 ? (
            <BriefEmptyState 
              onGenerate={handleGenerateScript} 
              isGenerating={appState === "generating"} 
            />
          ) : (
            <>
              <VideoStage
                videoUrl={currentSegment?.avatar_video_url}
                bRollUrl={currentSegment?.b_roll_image_url}
                status={currentSegment?.status}
                progress={progress}
                onEnded={handleVideoEnd}
                onSkip={() => setCurrentIdx(prev => Math.min(prev + 1, segments.length - 1))}
                isPlaying={appState === "playing"}
                segmentLabel={`SEGMENT_0${currentIdx + 1}`}
              />
            </>
          )}
        </div>

        {/* COL 3: INTELLIGENCE CONTEXT */}
        <div className="col-span-3 h-full overflow-hidden border-l border-white/5">
          <ActionPanel 
            card={currentSegment?.ui_action_card} 
            dialogue={currentSegment?.dialogue || ""} 
          />
        </div>
      </div>

      {/* FOOTER CONTROLS */}
      {segments.length > 0 && (
        <BriefControls 
          state={appState}
          onGenerate={handleGenerateScript}
          onRender={handleRender}
          onPlay={handlePlay}
          onSync={handleSync}
          isSyncing={isSyncing}
          onShare={() => setIsShareOpen(true)}
        />
      )}

      {/* DEV CONSOLE (SLIM) */}
      {isDevMode && (
        <div className="bg-black/80 px-10 py-2 border-t border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                 <Terminal className="w-3 h-3 text-[#5789FF]" />
                 <span className="text-[9px] font-black uppercase tracking-widest text-[#5789FF]">Dev Parity Console</span>
              </div>
              <div className="flex items-center gap-4">
                 <button onClick={() => setUseMock(!useMock)} className="text-[9px] font-bold text-white/30 hover:text-white transition-colors uppercase">
                    MOCK: {useMock ? "FORCE_ENABLE" : "INACTIVE"}
                 </button>
              </div>
           </div>
           <div className="flex items-center gap-4">
              <Shield className="w-3 h-3 text-emerald-500" />
              <span className="text-[9px] font-mono text-white/10 uppercase tracking-tighter">Session_ID: {Math.random().toString(36).substring(7)}</span>
           </div>
        </div>
      )}

      <ShareDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        scriptId={scriptId}
        jobId={jobId}
      />
    </div>
  );
}
