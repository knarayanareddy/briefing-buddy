import React from "react";
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
  Code
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

const logs = [
  { time: "14:20:11", level: "INFO", msg: "Initialized Supabase Client connection to", meta: "edge-region-us-east-1", color: "text-indigo-400 bg-indigo-400/10" },
  { time: "14:20:13", level: "INFO", msg: "Cross-tab broadcast listener registered on", meta: "\"dev_state_sync\"", color: "text-indigo-400 bg-indigo-400/10" },
  { time: "14:20:15", level: "WARN", msg: "Briefing engine latency spike detected: 142ms. Throttling active.", meta: "", color: "text-amber-400 bg-amber-400/10" },
  { time: "14:20:16", level: "INFO", msg: "Successfully cached schema for", meta: "\"pipeline_v4\"", color: "text-indigo-400 bg-indigo-400/10" },
  { time: "14:20:18", level: "ERROR", msg: "Failed to reconcile state for connector \"Slack_Auth_V2\". Retrying in 5s.", meta: "", color: "text-rose-400 bg-rose-400/10" },
  { time: "14:20:20", level: "INFO", msg: "Edge Function \"orchestrate_v1\" invoked successfully. Payload size: 4.2kb", meta: "", color: "text-indigo-400 bg-indigo-400/10" },
  { time: "14:20:22", level: "INFO", msg: "Polling for state updates...", meta: "", color: "text-indigo-400 bg-indigo-400/10" },
];

export default function DevMode() {
  return (
    <div className="flex flex-col h-full bg-[#0B0E14] animate-in fade-in duration-1000">
      
      {/* System Alert Banner */}
      <div className="bg-rose-500/10 border-b border-rose-500/20 py-2 px-10 flex items-center justify-center gap-3">
         <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
         <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500/80">
            Warning: Developer Mode Active <span className="text-white/20 mx-3">|</span> System-level overrides enabled. All operations are logged.
         </p>
      </div>

      <div className="flex-1 px-10 py-10 space-y-10 overflow-y-auto noscrollbar">
        
        {/* HUD Rows */}
        <div className="grid grid-cols-3 gap-8">
           <HUDStat 
             icon={RefreshCw} 
             label="Sync Health" 
             value="100%" 
             color="bg-indigo-500/10 text-indigo-500"
             subValue="Cross-tab synchronized"
           />
           <HUDStat 
             icon={Zap} 
             label="Active Edge Functions" 
             value="14" 
             color="bg-amber-500/10 text-amber-500"
             subValue="+2 pending"
           />
           <HUDStat 
             icon={Activity} 
             label="Latency (Avg)" 
             value="42ms" 
             color="bg-rose-500/10 text-rose-500"
             subValue="Within threshold"
           />
        </div>

        {/* Main Console Grid */}
        <div className="grid grid-cols-12 gap-8">
          
          {/* System Streams (Logs) */}
          <div className="col-span-7 sa-card p-10 bg-white/[0.02] border-none flex flex-col space-y-8">
             <div className="flex items-center justify-between border-b border-white/5 pb-6">
                <div className="flex items-center gap-4">
                   <Terminal className="w-5 h-5 text-white/40" />
                   <h3 className="text-xl font-bold text-white">System Streams</h3>
                </div>
                <div className="flex items-center gap-6">
                   <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Filtering: ALL</span>
                   <button className="text-[9px] font-black uppercase tracking-widest text-[#5789FF] hover:underline">Clear</button>
                </div>
             </div>

             <div className="flex-1 font-mono text-xs space-y-6 overflow-y-auto pr-4 noscrollbar">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-6 group">
                     <span className="text-white/20 w-16 shrink-0">{log.time}</span>
                     <Badge className={cn("px-2 py-0 h-4 min-w-[45px] flex items-center justify-center text-[8px] font-black tracking-widest border-none", log.color)}>
                        {log.level}
                     </Badge>
                     <div className="flex-1 space-x-2">
                        <span className="text-white/60 group-hover:text-white transition-colors">{log.msg}</span>
                        {log.meta && <span className="text-[#5789FF] opacity-80">{log.meta}</span>}
                     </div>
                  </div>
                ))}
             </div>
          </div>

          {/* Last Briefing Metadata (JSON) */}
          <div className="col-span-5 sa-card p-10 bg-white/[0.02] border-none flex flex-col space-y-8">
             <div className="flex items-center justify-between border-b border-white/5 pb-6">
                <div className="flex items-center gap-4">
                   <Code className="w-5 h-5 text-white/40" />
                   <h3 className="text-xl font-bold text-white">Last Briefing Metadata</h3>
                </div>
                <button className="p-2 rounded-lg hover:bg-white/5 transition-colors group">
                   <Copy className="w-4 h-4 text-white/20 group-hover:text-white" />
                </button>
             </div>

             <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-8 font-mono text-[11px] leading-relaxed text-[#5789FF]/80 overflow-y-auto noscrollbar shadow-inner">
<pre>{`{
  "id": "brf_01H8X9",
  "engine": "gpt-4-turbo",
  "parameters": {
    "temperature": 0.7,
    "max_tokens": 2048,
    "presence_penalty": 0.1
  },
  "tokens": {
    "prompt": 1420,
    "completion": 844,
    "cost_usd": 0.022
  },
  "context_flags": [
    "high_priority",
    "cross_modal",
    "debug_verbose"
  ],
  "orchestration_layers": [
    { "step": 1, "status": "completed" },
    { "step": 2, "status": "streaming" }
  ]
}`}</pre>
             </div>
          </div>
        </div>
      </div>

      {/* Dev Sticky Footer */}
      <div className="px-10 py-6 border-t border-white/5 bg-black/40 flex items-center justify-between">
         <div className="flex items-center gap-10">
            <div className="flex flex-col gap-1">
               <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Environment</span>
               <div className="flex gap-2">
                  <Badge variant="outline" className="bg-black/40 border-white/5 text-white/40 font-bold uppercase tracking-widest px-3">Live</Badge>
                  <Badge className="sa-button-primary border-none shadow-lg px-4 font-bold uppercase tracking-widest">Develop</Badge>
               </div>
            </div>
            <div className="flex flex-col gap-1">
               <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Verbosity</span>
               <div className="flex gap-2 p-1 bg-black/40 border border-white/5 rounded-xl">
                  {['MIN', 'MED', 'MAX'].map(v => (
                    <button key={v} className={cn(
                      "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                      v === 'MED' ? "bg-white/10 text-white" : "text-white/20 hover:text-white/40"
                    )}>{v}</button>
                  ))}
               </div>
            </div>
         </div>

         <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse" />
               <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Syncing with production...</span>
            </div>
            <Button variant="outline" className="h-12 bg-white/5 border-white/10 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 pl-6 pr-8">
               <Download className="w-4 h-4 text-[#5789FF]" />
               Download Session Logs
            </Button>
         </div>
      </div>
    </div>
  );
}
