import React from "react";
import { 
  Shield, 
  Key, 
  Lock, 
  Activity, 
  Clock, 
  Search, 
  Plus, 
  Github, 
  Mail, 
  Database,
  Cloud,
  ChevronRight,
  MoreVertical,
  AlertCircle,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/connectors/ConnectorCard";
import { cn } from "@/lib/utils";

const secrets = [
  { name: "GitHub PAT", provider: "Repository Access", icon: Github, fragment: "ghp_••••8u2q", status: "encrypted", rotated: "2 days ago" },
  { name: "OpenAI API Key", provider: "GPT-4 Integration", icon: Activity, fragment: "sk-••••zP91", status: "rotating", rotated: "Now" },
  { name: "Gmail OAuth", provider: "Notification Service", icon: Mail, fragment: "oa_••••rX4k", status: "error", rotated: "14 days ago" },
  { name: "Fal.ai Key", provider: "Image Synthesis", icon: Database, fragment: "fl_••••mY77", status: "encrypted", rotated: "1 month ago" },
];

const auditLogs = [
  { event: "Secret Accessed", time: "2m ago", desc: "System-bot accessed OpenAI API Key for production inference.", iconColor: "bg-indigo-500" },
  { event: "Rotation Successful", time: "45m ago", desc: "Automated policy triggered rotation for GitHub PAT.", iconColor: "bg-emerald-500" },
  { event: "Permission Denied", time: "2h ago", desc: "Unauthorized attempt to read AWS Root Key from IP 192.168.1.45.", iconColor: "bg-rose-500" },
  { event: "Metadata Updated", time: "5h ago", desc: "Admin (j.doe) updated rotation interval for OpenAI Key.", iconColor: "bg-indigo-500" }
];

export default function Vault() {
  return (
    <div className="px-10 py-8 space-y-12 animate-in fade-in duration-1000">
      
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-[#5789FF]/10 flex items-center justify-center text-[#5789FF]">
                <Shield className="w-5 h-5" />
             </div>
             <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Vault Manager</h4>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">Vault Secrets</h1>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            Securely manage API keys, OAuth tokens, and sensitive environmental variables for your AI orchestration workflows.
          </p>
        </div>
        <Button className="sa-button-primary h-14 rounded-2xl text-[10px] font-bold uppercase tracking-widest px-10 shadow-[0_10px_30px_rgba(87,137,255,0.3)]">
          <Plus className="w-5 h-5 mr-3" /> Register New Secret
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-6">
        <VaultStat label="Total Secrets" value="14" />
        <VaultStat label="Healthy/Active" value="12" active />
        <VaultStat label="Pending Rotation" value="2" warning />
        <VaultStat label="Security Score" value="98/100" />
      </div>

      {/* Main Grid: Secrets Table + Audit Logs */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* Secrets Table */}
        <div className="col-span-8 sa-card p-10 bg-white/[0.02] border-none">
          <div className="flex items-center justify-between mb-10">
             <h3 className="text-xl font-bold text-white">Active Secrets</h3>
             <div className="relative w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <Input placeholder="Filter secrets..." className="h-12 pl-12 bg-black/40 border-white/5 rounded-xl text-xs" />
             </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-12 px-4 mb-4 text-[9px] font-black uppercase tracking-widest text-white/20">
              <div className="col-span-4">Name / Provider</div>
              <div className="col-span-3">ID Fragment</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-2 text-center">Last Rotated</div>
              <div className="col-span-1 text-center">Actions</div>
            </div>

            {secrets.map((s, i) => (
              <div key={i} className="grid grid-cols-12 items-center p-6 bg-black/40 border border-white/5 rounded-2xl group hover:border-[#5789FF]/30 transition-all cursor-default">
                <div className="col-span-4 flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
                      <s.icon className="w-5 h-5" />
                   </div>
                   <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-white">{s.name}</h4>
                      <p className="text-[10px] text-muted-foreground">{s.provider}</p>
                   </div>
                </div>
                <div className="col-span-3 font-mono text-xs text-white/50">{s.fragment}</div>
                <div className="col-span-2 flex justify-center">
                   <Badge className={cn(
                     "px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border",
                     s.status === 'encrypted' ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                     s.status === 'rotating' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                     "bg-rose-500/10 text-rose-400 border-rose-500/20"
                   )}>
                      {s.status}
                   </Badge>
                </div>
                <div className="col-span-2 text-[10px] font-bold text-white/40 text-center">{s.rotated}</div>
                <div className="col-span-1 flex justify-center">
                   <button className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-white/20">
                      <MoreVertical className="w-4 h-4" />
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Logs Sidebar */}
        <div className="col-span-4 sa-card p-10 bg-white/[0.02] border-none space-y-10">
          <div className="flex items-center gap-4 pb-4 border-b border-white/5">
             <Activity className="w-4 h-4 text-[#5789FF]" />
             <h3 className="text-xl font-bold text-white">Audit Logs</h3>
          </div>

          <div className="space-y-10 relative">
            <div className="absolute left-[3px] top-4 bottom-0 w-[1px] bg-white/5" />
            
            {auditLogs.map((log, i) => (
              <div key={i} className="relative pl-8 space-y-2">
                 <div className={cn("absolute left-0 top-1.5 w-2 h-2 rounded-full", log.iconColor)} />
                 <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{log.event}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{log.time}</span>
                 </div>
                 <p className="text-[11px] text-muted-foreground leading-relaxed">{log.desc}</p>
              </div>
            ))}
          </div>

          <button className="w-full h-12 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 mt-10">
            View Full Audit History
          </button>
        </div>
      </div>

      {/* Footer Propagation Flow */}
      <div className="space-y-6">
         <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Vault Propagation Flow</h4>
         <div className="flex items-center gap-10">
            <div className="flex-1 sa-card p-8 bg-gradient-to-br from-[#111928] to-black border-none relative overflow-hidden group">
               <Shield className="absolute bottom-[-10px] right-[-10px] w-32 h-32 text-white/[0.02] -rotate-12" />
               <div className="space-y-4">
                  <h4 className="text-white font-bold text-lg">Vault Core</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">Master encryption layer (AES-256)</p>
                  <Badge className="bg-white/5 border-none text-[8px] font-black tracking-widest text-white/40">HARDWARE KMS</Badge>
               </div>
            </div>

            <ChevronRight className="w-10 h-10 text-white/10" />

            <div className="flex-1 sa-card p-8 bg-gradient-to-br from-[#111928] to-black border-none relative overflow-hidden group">
               <Cloud className="absolute bottom-[-10px] right-[-10px] w-32 h-32 text-white/[0.02]" />
               <div className="space-y-4">
                  <h4 className="text-white font-bold text-lg">Edge Proxies</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">Decryption at ephemeral edge nodes</p>
                  <Badge className="bg-white/5 border-none text-[8px] font-black tracking-widest text-white/40">ZERO-TRUST INJECTION</Badge>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function VaultStat({ label, value, active, warning }: any) {
  return (
    <div className="sa-card p-8 bg-white/[0.02] border-none group transition-all duration-300">
      <div className="flex flex-col gap-3">
         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">{label}</span>
         <div className="flex items-baseline gap-2">
            <h3 className="text-4xl font-black text-white tracking-tight">{value}</h3>
            {active && <div className="w-1.5 h-1.5 rounded-full bg-[#5789FF] animate-pulse" />}
            {warning && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
         </div>
      </div>
    </div>
  );
}
