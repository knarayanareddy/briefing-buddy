import React, { useState, useEffect, useCallback } from "react";
import { 
  Terminal, 
  Shield, 
  Activity,
  Zap,
  RefreshCw,
  Search,
  Download,
  Copy,
  ChevronRight,
  Info,
  AlertTriangle,
  Code,
  CheckCircle2,
  XCircle,
  Play,
  Database,
  Lock,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  systemPreflight, 
  connectorPreflight, 
  seedDummyIntel,
  assembleUserData,
  generateScript,
  startRender,
  getJobStatus,
} from "@/lib/api";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
// Removed useAuth import as it doesn't exist, using supabase directly

const HUDStat = ({ label, value, icon: Icon, color, subValue }: any) => (
  <div className="sa-card p-8 bg-white/[0.02] border-none flex items-center gap-8">
     <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border border-white/5", color)}>
        <Icon className="w-7 h-7" />
     </div>
     <div className="space-y-1">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">{label}</span>
        <div className="flex items-baseline gap-3">
           <h3 className="text-3xl font-black text-white tracking-tight">{value}</h3>
           {subValue && <span className="text-[10px] font-bold text-[#5789FF]">{subValue}</span>}
        </div>
     </div>
  </div>
);

export default function IntegrationLab() {
  const [session, setSession] = useState<any>(null);
  const [preflight, setPreflight] = useState<any>(null);
  const [connectors, setConnectors] = useState<any>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isPreflighting, setIsPreflighting] = useState(false);
  const [e2eLogs, setE2ELogs] = useState<{time: string, msg: string, level: string}[]>([]);
  const [isRunningE2E, setIsRunningE2E] = useState(false);
  const [e2eMode, setE2EMode] = useState<"dummy" | "live">("dummy");
  const [renderVideo, setRenderVideo] = useState(true);
  const [lastResults, setLastResults] = useState<any>(null);

  const addLog = (msg: string, level: string = "INFO") => {
    setE2ELogs(prev => [{ time: new Date().toLocaleTimeString(), msg, level }, ...prev].slice(0, 50));
  };

  const runPreflight = useCallback(async () => {
    setIsPreflighting(true);
    try {
      const res = await systemPreflight();
      setPreflight(res);
      if (res.overall.ok) toast.success("System preflight passed");
      else toast.warning("System preflight has issues");
      
      if (session) {
        const connRes = await connectorPreflight();
        setConnectors(connRes);
      }
    } catch (err: any) {
      toast.error("Preflight failed: " + err.message);
    } finally {
      setIsPreflighting(false);
    }
  }, [session]);

  const runSeed = async () => {
    if (!session) return toast.error("Sign-in required to seed data");
    setIsSeeding(true);
    try {
      const res = await seedDummyIntel({ 
        include: { rss: true, github: true, slack: true, google: true },
        mark_connected: true 
      });
      toast.success(`Seeded ${res.upserted_count} dummy items`);
      runPreflight(); // Refresh connector list
    } catch (err: any) {
      toast.error("Seeding failed: " + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const runE2E = async () => {
    if (isRunningE2E) return;
    setIsRunningE2E(true);
    setE2ELogs([]);
    setLastResults(null);
    addLog(`Starting E2E Briefing (${e2eMode} mode)...`);

    try {
      // Step 1: Data Prep
      if (e2eMode === "dummy") {
        addLog("Seeding dummy intelligence items...");
        await seedDummyIntel({ include: { rss: true, github: true, slack: true, google: true }, mark_connected: true });
        addLog("Dummy data seeded and connectors marked active.");
      } else {
        addLog("Verifying live connector readiness...");
        const connRes = await connectorPreflight();
        if (!connRes.overall.ok_for_live_brief) {
           throw new Error("Live mode requires RSS feeds configured. Currently: " + connRes.overall.missing.join(", "));
        }
        addLog("Live connectors verified.");
      }

      // Step 2: Assemble
      addLog("Invoking assemble-user-data...");
      const assembled = await assembleUserData();
      addLog(`Assembled ${assembled.user_data?.news_items?.length || 0} news items and ${assembled.user_data?.github_prs?.length || 0} PRs.`);

      // Step 3: Generate Script
      addLog("Invoking generate-script (LLM Orchestration)...");
      const script = await generateScript({ 
        user_data: assembled.user_data,
        trigger: "manual",
        title: `E2E ${e2eMode === "dummy" ? "Simulation" : "Integration"} Test`
      });
      addLog(`Script generated: ${script.script_id} (${script.script_json.timeline_segments.length} segments).`);

      if (!renderVideo) {
        addLog("Video rendering skipped (UI setting). E2E successful.", "SUCCESS");
        setLastResults({ script_id: script.script_id, script_json: script.script_json });
        return;
      }

      // Step 4: Start Render
      addLog("Initiating video render (Fal.ai / Veed)...");
      const job = await startRender(script.script_id);
      addLog(`Render job started: ${job.job_id}. Polling status...`);

      // Step 5: Poll
      let status = "pending";
      let attempts = 0;
      while (status !== "completed" && status !== "failed" && attempts < 40) {
        attempts++;
        const jobStatus = await getJobStatus(job.job_id);
        status = jobStatus.status;
        if (status === "completed") {
           addLog("Rendering complete!", "SUCCESS");
           setLastResults({ 
             script_id: script.script_id, 
             job_id: job.job_id, 
             segments: jobStatus.segments 
           });
        } else if (status === "failed") {
           throw new Error(`Render failed: ${jobStatus.error_message || "Unknown error"}`);
        } else {
           if (attempts % 3 === 0) addLog(`Render progress: ${status}...`);
           await new Promise(r => setTimeout(r, 3000));
        }
      }
    } catch (err: any) {
      addLog(`E2E ERROR: ${err.message}`, "ERROR");
      toast.error(err.message);
    } finally {
      setIsRunningE2E(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    runPreflight();

    return () => subscription.unsubscribe();
  }, [runPreflight]);

  return (
    <div className="flex flex-col h-full bg-[#0B0E14] animate-in fade-in duration-1000">
      
      {/* System Alert Banner */}
      <div className="bg-rose-500/10 border-b border-rose-500/20 py-2 px-10 flex items-center justify-between gap-3">
         <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500/80">
               Integration Lab Active <span className="text-white/20 mx-3">|</span> System-level overrides enabled.
            </p>
         </div>
         <Button 
           variant="ghost" 
           size="sm" 
           onClick={runPreflight}
           className="h-6 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white"
         >
           {isPreflighting ? <RefreshCw className="w-3 h-3 animate-spin mr-2" /> : <RefreshCw className="w-3 h-3 mr-2" />}
           Force Refresh Preflight
         </Button>
      </div>

      <div className="flex-1 px-10 py-10 space-y-10 overflow-y-auto noscrollbar">
        
        {/* Row 1: Preflight Matrix */}
        <div className="grid grid-cols-12 gap-8">
           <div className="col-span-12 lg:col-span-7 sa-card p-10 bg-white/[0.02] border-none">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                 <div className="flex items-center gap-4">
                    <Shield className="w-6 h-6 text-[#5789FF]" />
                    <div>
                       <h3 className="text-xl font-bold text-white leading-none">System Preflight Matrix</h3>
                       <p className="text-xs text-white/40 mt-1.5">Validating server-side environment and provider connectivity.</p>
                    </div>
                 </div>
                 {preflight && (
                    <Badge className={cn("px-4 py-1 font-black tracking-widest uppercase text-[10px] border-none", preflight.overall.ok ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                       {preflight.overall.ok ? "READY" : "INCOMPLETE"}
                    </Badge>
                 )}
              </div>

              <div className="grid grid-cols-2 gap-8">
                 {[
                    { id: "OPENAI_API_KEY", label: "Script Generation (OpenAI)", check: "openai" },
                    { id: "FAL_KEY", label: "Avatar Rendering (Fal.ai)", check: "fal" },
                    { id: "RUNWARE_API_KEY", label: "B-Roll Pipeline (Runware)", check: "runware" },
                    { id: "CONNECTOR_SECRET_KEY", label: "Secret Storage (KMS)", check: null }
                 ].map((item) => {
                    const status = preflight?.server_env?.[item.id];
                    const check = item.check ? preflight?.provider_checks?.[item.check] : null;
                    return (
                       <div key={item.id} className="p-6 bg-white/[0.01] rounded-2xl border border-white/5 flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                             <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{item.label}</span>
                             {status?.present ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
                          </div>
                          <div className="flex items-center justify-between">
                             <span className="text-xs font-mono text-[#5789FF]">
                                {status?.present ? (check ? (check.ok ? "CONNECTED" : "AUTH ERROR") : "PRESENT") : "MISSING"}
                             </span>
                             {check?.detail && <span className="text-[9px] text-white/20 italic">{check.detail}</span>}
                          </div>
                       </div>
                    );
                 })}
              </div>
           </div>

           <div className="col-span-12 lg:col-span-5 sa-card p-10 bg-white/[0.02] border-none flex flex-col">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                 <div className="flex items-center gap-4">
                    <Globe className="w-6 h-6 text-amber-500" />
                    <div>
                       <h3 className="text-xl font-bold text-white leading-none">Connector Readiness</h3>
                       <p className="text-xs text-white/40 mt-1.5">User-level credentials and configurations.</p>
                    </div>
                 </div>
                 {!session && <Badge className="bg-rose-500/10 text-rose-500 border-none uppercase text-[9px] font-black">LOGIN REQUIRED</Badge>}
              </div>

              <div className="flex-1 space-y-4">
                 {connectors?.connectors.map((c: any) => (
                    <div key={c.provider} className="flex items-center justify-between p-4 bg-white/[0.01] rounded-xl border border-white/5 group hover:bg-white/[0.03] transition-colors">
                       <div className="flex items-center gap-4">
                          <div className={cn("w-2 h-2 rounded-full", c.config_present ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-white/10")} />
                          <span className="text-sm font-bold text-white capitalize">{c.provider}</span>
                       </div>
                       <div className="flex items-center gap-6">
                          <div className="flex flex-col items-end">
                             <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{c.secret_present ? "Secret Configured" : "No Secret"}</span>
                             {c.notes && <span className="text-[8px] text-amber-500/60 max-w-[100px] text-right">{c.notes}</span>}
                          </div>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                             <ChevronRight className="w-4 h-4" />
                          </Button>
                       </div>
                    </div>
                 )) ?? (
                    <div className="flex flex-col items-center justify-center p-10 text-center space-y-4 opacity-40">
                       <Database className="w-10 h-10" />
                       <p className="text-xs">Run preflight to inspect connectors</p>
                    </div>
                 )}
              </div>
           </div>
        </div>

        {/* Row 2: E2E Integration Lab */}
        <div className="grid grid-cols-12 gap-8">
           
           {/* Controls Panel */}
           <div className="col-span-4 sa-card p-10 bg-white/[0.02] border-none space-y-10">
              <div>
                 <h3 className="text-xl font-bold text-white mb-2">E2E Controller</h3>
                 <p className="text-xs text-white/40">Initiate a full briefing orchestration cycle.</p>
              </div>

              <div className="space-y-8">
                 <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#5789FF]">Execution Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                       <button 
                         onClick={() => setE2EMode("dummy")}
                         className={cn("p-4 rounded-xl border font-bold text-xs transition-all", e2eMode === "dummy" ? "bg-[#5789FF]/10 border-[#5789FF] text-[#5789FF]" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10")}
                       >
                          Dummy Intel
                       </button>
                       <button 
                         onClick={() => setE2EMode("live")}
                         className={cn("p-4 rounded-xl border font-bold text-xs transition-all", e2eMode === "live" ? "bg-[#5789FF]/10 border-[#5789FF] text-[#5789FF]" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10")}
                       >
                          Live Source
                       </button>
                    </div>
                 </div>

                 <div className="flex items-center justify-between p-6 bg-white/[0.03] rounded-2xl border border-white/5">
                    <div className="flex items-center gap-4">
                       <Play className="w-5 h-5 text-emerald-500" />
                       <div>
                          <p className="text-[11px] font-bold text-white">Render Full Video</p>
                          <p className="text-[9px] text-white/40 italic">Uses Fal.ai credits</p>
                       </div>
                    </div>
                    <button 
                      onClick={() => setRenderVideo(!renderVideo)}
                      className={cn("w-12 h-6 rounded-full relative transition-colors", renderVideo ? "bg-emerald-500" : "bg-white/10")}
                    >
                       <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all", renderVideo ? "left-7" : "left-1")} />
                    </button>
                 </div>

                 <div className="space-y-4 pt-4">
                    <Button 
                      onClick={runE2E} 
                      disabled={isRunningE2E || (e2eMode === "live" && !session)}
                      className="w-full h-16 sa-button-primary rounded-2xl text-md font-black uppercase tracking-[0.2em] gap-4"
                    >
                       {isRunningE2E ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                       {isRunningE2E ? "Running Orchestration..." : "Run E2E Suite"}
                    </Button>
                    {e2eMode === "dummy" && (
                       <Button 
                         variant="outline" 
                         onClick={runSeed}
                         disabled={isSeeding}
                         className="w-full h-12 border-white/10 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest gap-2"
                       >
                          {isSeeding ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Database className="w-4 h-4 text-amber-500" />}
                          Seed Dummy Intelligence
                       </Button>
                    )}
                 </div>
              </div>
           </div>

           {/* Live Progress Logs */}
           <div className="col-span-8 sa-card p-10 bg-[#07090D] border-white/5 shadow-2xl flex flex-col space-y-8">
              <div className="flex items-center justify-between border-b border-white/5 pb-6">
                 <div className="flex items-center gap-4">
                    <Terminal className="w-5 h-5 text-emerald-500" />
                    <h3 className="text-xl font-bold text-white">Integration Lab Stream</h3>
                 </div>
                 <Badge variant="outline" className="text-[9px] border-white/10 text-white/20 px-3 uppercase tracking-widest">Real-time telemetry</Badge>
              </div>

              <div className="flex-1 font-mono text-xs overflow-y-auto space-y-4 pr-4 noscrollbar min-h-[400px]">
                 {e2eLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-10 space-y-6">
                       <Activity className="w-16 h-16" />
                       <p className="text-md uppercase tracking-[0.4em] font-black">System Idle</p>
                    </div>
                 ) : (
                    e2eLogs.map((log, i) => (
                       <div key={i} className={cn("flex gap-6 animate-in slide-in-from-left-2 duration-300", 
                          log.level === "ERROR" ? "text-rose-400" : log.level === "SUCCESS" ? "text-emerald-400" : "text-white/60")}>
                          <span className="text-white/20 w-16 shrink-0">{log.time}</span>
                          <span className="font-bold shrink-0 w-14">[{log.level}]</span>
                          <span className="flex-1">{log.msg}</span>
                       </div>
                    ))
                 )}
              </div>

              {lastResults && (
                 <div className="p-8 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center justify-between animate-in zoom-in-95 duration-500">
                    <div className="flex items-center gap-6">
                       <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                       <div>
                          <p className="text-sm font-bold text-white uppercase tracking-tight">E2E Verification Success</p>
                          <p className="text-xs text-white/40 mt-1">Artifacts generated: {lastResults.segments?.length || lastResults.script_json?.timeline_segments.length} segments ready.</p>
                       </div>
                    </div>
                    <div className="flex gap-4">
                       <Button variant="ghost" className="bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest px-8 h-12 rounded-xl">
                          View Script
                       </Button>
                       <Button className="sa-button-primary px-8 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest">
                          Play Result
                       </Button>
                    </div>
                 </div>
              )}
           </div>
        </div>
      </div>

      {/* Dev Sticky Footer */}
      <div className="px-10 py-6 border-t border-white/5 bg-black/40 flex items-center justify-between">
         <div className="flex items-center gap-10">
            <div className="flex flex-col gap-1">
               <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Active Node</span>
               <div className="flex items-center gap-3">
                  <Badge className="sa-button-primary border-none shadow-lg px-4 font-bold uppercase tracking-widest">v{process.env.NODE_ENV === 'production' ? '1.0.4' : 'PRE-FLY'}</Badge>
                  <span className="text-[10px] font-mono text-white/40">US-EAST-1</span>
               </div>
            </div>
         </div>

         <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
               <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Ready for integration tests</span>
            </div>
            <Button variant="outline" className="h-12 bg-white/5 border-white/10 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 pl-6 pr-8">
               <Download className="w-4 h-4 text-[#5789FF]" />
               Download Results
            </Button>
         </div>
      </div>
    </div>
  );
}
