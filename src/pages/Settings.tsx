import React, { useState, useEffect } from "react";
import { 
  User, 
  Shield, 
  Key, 
  Bell, 
  Monitor, 
  Smartphone, 
  Globe, 
  Save, 
  RotateCcw,
  CheckCircle2,
  Zap,
  Activity,
  UserCheck,
  LogOut,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useDevMode } from "@/lib/devMode";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { isDevMode, toggleDevMode } = useDevMode();
  const [activeTab, setActiveTab] = useState("general");
  const [name, setName] = useState("Alex Reed");
  const [email, setEmail] = useState("alex.reed@synthetix.ai");
  const [timezone, setTimezone] = useState("Pacific Time (PT) - UTC-8:00");

  // Notification States
  const [notifs, setNotifs] = useState({
    edgeFailures: true,
    newLogin: true,
    vaultRotation: false,
    genComplete: true,
    genError: true,
    dailyDigest: false,
    rateLimit: true,
  });

  const toggleNotif = (key: keyof typeof notifs) => {
    setNotifs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    toast.success("Changes saved successfully", {
      description: "Your profile architecture has been updated.",
    });
  };

  return (
    <div className="px-12 py-8 space-y-10 animate-in fade-in duration-1000">
      
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="w-24 h-24 border-2 border-white/5 ring-4 ring-[#5789FF]/10">
              <AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200" />
              <AvatarFallback>AR</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-[#5789FF] text-white p-1 rounded-full border-2 border-[#0B0E14]">
               <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
             <div className="flex items-center gap-3">
                <h1 className="text-4xl font-extrabold tracking-tight text-white">Alex Reed</h1>
             </div>
             <p className="text-sm text-muted-foreground flex items-center gap-2">
                System Architect <span className="w-1 h-1 bg-white/20 rounded-full" /> LEVEL 4 AUTH
             </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <Button variant="outline" className="h-12 px-6 bg-white/5 border-white/5 hover:bg-white/10 text-white/60 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all">
              Discard
           </Button>
           <Button onClick={handleSave} className="h-12 px-6 sa-button-primary rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(87,137,255,0.3)]">
              Save Changes
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        
        {/* Navigation Column */}
        <div className="col-span-2 space-y-1">
          {[
            { id: "general", label: "General", icon: User },
            { id: "security", label: "Security", icon: Shield },
            { id: "api", label: "API Keys", icon: Key },
            { id: "notifications", label: "Notifications", icon: Bell },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 group text-left",
                activeTab === tab.id 
                  ? "bg-white/5 text-white shadow-[0_0_20px_rgba(87,137,255,0.05)]" 
                  : "text-white/40 hover:text-white hover:bg-white/[0.02]"
              )}
            >
              <tab.icon className={cn("w-5 h-5 transition-colors", activeTab === tab.id ? "text-[#5789FF]" : "group-hover:text-white/60")} />
              <span className="text-sm font-bold tracking-tight">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="col-span-10">
          {activeTab === "notifications" ? (
             <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="space-y-2">
                   <h2 className="text-3xl font-bold text-white tracking-tight">Notification Preferences</h2>
                   <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                      Manage how and when you receive critical system updates, security alerts, and orchestration reports from your Synthetix Console.
                   </p>
                </div>

                <div className="space-y-6">
                   {/* SECTION: SYSTEM HEALTH */}
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-3">
                         <Shield className="w-3.5 h-3.5" /> System Health & Security
                      </h4>
                      <div className="sa-card bg-white/[0.02] border-white/5 rounded-[2rem] divide-y divide-white/5 overflow-hidden">
                         {[
                           { id: "edgeFailures", title: "Edge Function Failures", desc: "Immediate alert when any edge orchestration node experiences execution timeouts or crashes." },
                           { id: "newLogin", title: "New Login Alert", desc: "Security notification for any access from an unrecognized IP address or hardware fingerprint." },
                           { id: "vaultRotation", title: "Vault Secret Rotation", desc: "Notifies when API secrets or private keys are successfully updated or expire." },
                         ].map((item) => (
                            <div key={item.id} className="p-8 flex items-center justify-between group hover:bg-white/[0.01] transition-colors">
                               <div className="space-y-1.5 ml-4 relative">
                                  <div className={cn("absolute -left-6 top-1.5 w-1.5 h-1.5 rounded-full", notifs[item.id as keyof typeof notifs] ? "bg-[#5789FF] shadow-[0_0_8px_#5789FF]" : "bg-white/10")} />
                                  <h5 className="text-sm font-bold text-white group-hover:text-[#5789FF] transition-colors">{item.title}</h5>
                                  <p className="text-xs text-white/30 max-w-md">{item.desc}</p>
                               </div>
                               <Switch 
                                  checked={notifs[item.id as keyof typeof notifs]} 
                                  onCheckedChange={() => toggleNotif(item.id as keyof typeof notifs)}
                                  className="data-[state=checked]:bg-[#5789FF]"
                               />
                            </div>
                         ))}
                      </div>
                   </div>

                   {/* SECTION: BRIEFING ALERTS */}
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-3">
                         <Zap className="w-3.5 h-3.5" /> Briefing Alerts
                      </h4>
                      <div className="sa-card bg-white/[0.02] border-white/5 rounded-[2rem] divide-y divide-white/5 overflow-hidden">
                         {[
                           { id: "genComplete", title: "Generation Complete", desc: "Standard alert when a long-running batch orchestration task finishes successfully." },
                           { id: "genError", title: "Generation Error", desc: "Critical failure notification during the model refinement or content generation phase." },
                           { id: "dailyDigest", title: "Daily Digest", desc: "A consolidated summary of all orchestration activity and credit consumption for the last 24 hours." },
                         ].map((item) => (
                            <div key={item.id} className="p-8 flex items-center justify-between group hover:bg-white/[0.01] transition-colors">
                               <div className="space-y-1.5 ml-4 relative">
                                  <div className={cn("absolute -left-6 top-1.5 w-1.5 h-1.5 rounded-full", notifs[item.id as keyof typeof notifs] ? "bg-[#5789FF] shadow-[0_0_8px_#5789FF]" : "bg-white/10")} />
                                  <h5 className="text-sm font-bold text-white group-hover:text-[#5789FF] transition-colors">{item.title}</h5>
                                  <p className="text-xs text-white/30 max-w-md">{item.desc}</p>
                               </div>
                               <Switch 
                                  checked={notifs[item.id as keyof typeof notifs]} 
                                  onCheckedChange={() => toggleNotif(item.id as keyof typeof notifs)}
                                  className="data-[state=checked]:bg-[#5789FF]"
                               />
                            </div>
                         ))}
                      </div>
                   </div>

                   {/* SECTION: DEVELOPER ALERTS */}
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-3">
                         <Activity className="w-3.5 h-3.5" /> Developer Alerts
                      </h4>
                      <div className="sa-card bg-white/[0.02] border-white/5 rounded-[2rem] overflow-hidden">
                         <div className="p-8 flex items-center justify-between group hover:bg-white/[0.01] transition-colors">
                            <div className="space-y-1.5 ml-4 relative">
                               <div className={cn("absolute -left-6 top-1.5 w-1.5 h-1.5 rounded-full", notifs.rateLimit ? "bg-[#5789FF] shadow-[0_0_8px_#5789FF]" : "bg-white/10")} />
                               <h5 className="text-sm font-bold text-white group-hover:text-[#5789FF] transition-colors">Rate Limit Warnings</h5>
                               <p className="text-xs text-white/30 max-w-md">Proactive notice when your API traffic reaches 80% of current subscription tier limits.</p>
                            </div>
                            <Switch 
                               checked={notifs.rateLimit} 
                               onCheckedChange={() => toggleNotif('rateLimit')}
                               className="data-[state=checked]:bg-[#5789FF]"
                            />
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          ) : (
            <div className="grid grid-cols-10 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="col-span-6 space-y-8">
                  {/* Profile Details Card */}
                  <div className="sa-card p-10 bg-white/[0.03] border-white/5 rounded-[2rem] space-y-8">
                     <div className="space-y-1">
                        <h3 className="text-lg font-bold text-white flex items-center gap-3">
                           <div className="w-1 h-5 bg-[#5789FF] rounded-full" /> Profile Details
                        </h3>
                     </div>

                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Full Name</label>
                           <Input 
                              value={name} 
                              onChange={(e) => setName(e.target.value)}
                              className="h-14 bg-white/5 border-white/5 rounded-2xl px-6 font-medium focus:ring-[#5789FF]/30 transition-all"
                           />
                        </div>
                        <div className="space-y-3">
                           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Work Email</label>
                           <Input 
                              value={email} 
                              onChange={(e) => setEmail(e.target.value)}
                              className="h-14 bg-white/5 border-white/5 rounded-2xl px-6 font-medium focus:ring-[#5789FF]/30 transition-all opacity-60 cursor-not-allowed"
                              readOnly
                           />
                        </div>
                     </div>

                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Timezone</label>
                        <div className="relative group">
                           <Input 
                              value={timezone} 
                              readOnly
                              className="h-14 bg-white/5 border-white/5 rounded-2xl px-6 font-medium focus:ring-[#5789FF]/30 cursor-pointer text-white/80"
                           />
                           <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
                        </div>
                     </div>
                  </div>

                  {/* Developer Settings Card */}
                  <div className="sa-card p-10 bg-[#5789FF]/5 border-[#5789FF]/10 rounded-[2rem] space-y-8 relative overflow-hidden group">
                     <div className="relative z-10 flex items-center justify-between">
                        <div className="space-y-2">
                           <h3 className="text-lg font-bold text-white flex items-center gap-3">
                              Developer Settings
                           </h3>
                           <p className="text-xs text-white/40 max-w-sm leading-relaxed">
                              Enable advanced orchestration debugging tools and real-time inference monitoring.
                           </p>
                        </div>
                        <div className="flex items-center gap-4 bg-black/20 p-2 pl-6 rounded-2xl border border-white/5">
                           <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Developer Mode</span>
                           <Switch 
                              checked={isDevMode} 
                              onCheckedChange={toggleDevMode}
                              className="data-[state=checked]:bg-[#5789FF]"
                           />
                        </div>
                     </div>

                     <div className="relative z-10 grid grid-cols-3 gap-6 pt-4">
                        <div className="space-y-4 p-6 bg-black/20 rounded-[1.5rem] border border-white/5">
                           <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">API Usage</span>
                              <span className="text-xl font-black text-[#5789FF]">84%</span>
                           </div>
                           <Progress value={84} className="h-1.5 bg-white/5" />
                           <p className="text-[9px] text-white/20 font-medium">4,201 / 5,000 requests</p>
                        </div>

                        <div className="space-y-4 p-6 bg-black/20 rounded-[1.5rem] border border-white/5">
                           <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Rate Limit</span>
                              <span className="text-xl font-black text-white">100<span className="text-xs text-white/40 font-bold">/sec</span></span>
                           </div>
                           <div className="flex items-center gap-2 text-[9px] text-emerald-400 font-bold uppercase tracking-widest">
                              <Activity className="w-3 h-3" /> Standard Plan
                           </div>
                        </div>

                        <button className="flex flex-col items-center justify-center gap-3 p-6 bg-white/5 hover:bg-white/10 transition-all rounded-[1.5rem] border border-dashed border-white/10 group">
                           <Key className="w-6 h-6 text-white/40 group-hover:text-[#5789FF] transition-colors" />
                           <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white transition-colors" >Manage Keys</span>
                        </button>
                     </div>
                     
                     {/* Background glow */}
                     <div className="absolute top-0 right-0 w-64 h-64 bg-[#5789FF]/10 blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                  </div>
               </div>

               {/* Status Column */}
               <div className="col-span-4 space-y-8">
                  {/* Active Sessions */}
                  <div className="space-y-6">
                     <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white/30">Active Sessions</h3>
                        <button className="text-[10px] font-bold text-[#5789FF] hover:underline uppercase tracking-widest">Logout from all other devices</button>
                     </div>
                     <div className="space-y-4">
                        {[
                          { device: "Chrome on MacOS", location: "San Francisco, USA", active: true, icon: Monitor },
                          { device: "Synthetix App on iPhone 15", location: "San Francisco, USA", time: "4 hours ago", icon: Smartphone },
                        ].map((session, i) => (
                           <div key={i} className="sa-card p-6 bg-white/[0.02] border-white/5 rounded-2xl flex items-center gap-5 group hover:bg-white/[0.04] transition-all">
                              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-[#5789FF] transition-colors">
                                 <session.icon className="w-6 h-6" />
                              </div>
                              <div className="flex-1 space-y-1">
                                 <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-white">{session.device}</h4>
                                    {session.active && <div className="w-1.5 h-1.5 bg-[#5789FF] rounded-full shadow-[0_0_10px_rgba(87,137,255,0.8)]" />}
                                 </div>
                                 <p className="text-[11px] text-white/30">{session.location} • {session.active ? "Active now" : session.time}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* Security Log */}
                  <div className="space-y-6">
                     <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white/30">Security Log</h3>
                     <div className="sa-card p-8 bg-white/[0.02] border-white/5 rounded-[2rem] space-y-8 relative overflow-hidden">
                        <div className="space-y-8 relative z-10 border-l border-white/5 ml-3 pl-8">
                           {[
                             { event: "PAT Created", time: "Oct 24, 2023 • 14:32" },
                             { event: "Login via OTP", time: "Oct 23, 2023 • 09:15" },
                             { event: "Settings Changed", time: "Oct 21, 2023 • 18:02" },
                           ].map((log, i) => (
                              <div key={i} className="relative">
                                 <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-[#0B0E14] border-2 border-[#5789FF]/40" />
                                 <div className="space-y-1">
                                    <h4 className="text-xs font-bold text-white/80">{log.event}</h4>
                                    <p className="text-[10px] text-white/20 font-medium">{log.time}</p>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
