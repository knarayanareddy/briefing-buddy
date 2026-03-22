import React from "react";
import { cn } from "@/lib/utils";
import { Circle, Activity } from "lucide-react";

const events = [
  { time: "14:22:01", msg: "GitHub Webhook received: PR #422 updated", tag: "v1.2.4", source: "webhook", status: "success" },
  { time: "14:18:55", msg: "Sync completed: Notion Vector Store (248 items)", tag: "v1.2.4", source: "system", status: "success" },
  { time: "14:02:11", msg: "Gmail API: 401 Unauthorized - Refresh token missing", tag: "system", source: "api", status: "error" },
  { time: "13:55:49", msg: "Auto-scaling group: Initialized connector-worker-02", tag: "orchestrator", source: "infra", status: "info" }
];

export default function SystemEvents() {
  return (
    <div className="sa-card border-none bg-white/[0.02] p-8 space-y-8 h-full">
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
         <h3 className="text-xl font-bold text-white flex items-center gap-3">
            System Events
         </h3>
         <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Live Updates</span>
         </div>
      </div>

      <div className="space-y-6">
        {events.map((e, i) => (
          <div key={i} className="flex items-center gap-6 group">
            <div className={cn(
              "w-2 h-2 rounded-full mt-1 shrink-0 shadow-[0_0_10px_rgba(0,0,0,0.5)]",
              e.status === 'error' ? 'bg-rose-500 shadow-rose-500/20' : 
              e.status === 'success' ? 'bg-indigo-500 shadow-indigo-500/20' : 'bg-white/20'
            )} />
            <span className="text-[11px] font-bold text-white/30 font-mono tracking-tighter w-16 uppercase">{e.time}</span>
            <p className="flex-1 text-sm font-semibold text-white/80 group-hover:text-white transition-colors">
              {e.msg}
            </p>
            <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{e.tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrchestrationHealth() {
  const metrics = [
    { label: "CPU Usage", val: 34, color: "bg-[#5789FF]" },
    { label: "Active Pipelines", val: 90, customVal: "18/20", color: "bg-indigo-500" },
    { label: "Secrets Health", val: 92, color: "bg-amber-400" }
  ];

  return (
    <div className="sa-card p-8 bg-white/[0.02] border-none space-y-8">
      <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white/40">Orchestration Health</h3>
      
      <div className="space-y-8">
        {metrics.map((m, i) => (
          <div key={i} className="space-y-3">
            <div className="flex justify-between items-end">
               <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{m.label}</span>
               <span className="text-xs font-black text-white">{m.customVal || `${m.val}%`}</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-1000", m.color)}
                style={{ width: `${m.val}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <button className="w-full h-12 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all mt-4">
        Download Report
      </button>
    </div>
  );
}
