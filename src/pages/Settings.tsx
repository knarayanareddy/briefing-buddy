import React, { useState, useEffect, useCallback } from "react";
import { 
  User, Shield, Key, Bell, Monitor, Smartphone, Globe, Save, RotateCcw,
  CheckCircle2, Zap, Activity, UserCheck, LogOut, ChevronDown, MapPin, 
  Trash2, AlertTriangle, Loader2, KeyRound, Lock, Clock, History, ExternalLink,
  SmartphoneIcon, LaptopIcon, TabletIcon, Info
} from "lucide-react";
import { 
  getUserSettings, updateUserSettings, getUsageStats, getSystemKeyStatus, 
  getConnectorCredentialStatus, listAuditEvents, listSessions, touchSession,
  type UserSettings, type UsageStats, type SystemKeyStatus, type ConnectorCredentialStatus, type AuditEvent, type UserSession
} from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useDevMode } from "@/lib/devMode";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// --- Sub-components for Tabs ---

const GeneralTab = ({ settings, setSettings, isDirty, onSave, onDiscard, userEmail }: any) => {
  const { isDevMode, toggleDevMode } = useDevMode();
  const [localSettings, setLocalSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    } else {
      // Fallback defaults for UI robustness
      setLocalSettings({
        display_name: "Agent User",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        location_text: "Local Node",
        avatar_url: null,
        notification_prefs: {
           genComplete: true, genError: true, edgeFailures: true,
           newLogin: true, vaultRotation: true, dailyDigest: false
        },
        user_id: "",
        location_lat: null,
        location_lon: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as UserSettings);
    }
  }, [settings]);

  if (!localSettings) return <div className="animate-pulse space-y-4 pt-10"><div className="h-32 bg-white/5 rounded-3xl" /><div className="h-32 bg-white/5 rounded-3xl" /></div>;

  const handleUpdate = (updates: Partial<UserSettings>) => {
    const next = { ...localSettings, ...updates };
    setLocalSettings(next);
    setSettings(next);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    toast.info("Requesting location access...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleUpdate({
          location_lat: pos.coords.latitude,
          location_lon: pos.coords.longitude,
          location_text: `Current Location (${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)})`
        });
        toast.success("Location updated via browser");
      },
      (err) => toast.error(`Geolocation error: ${err.message}`)
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="sa-card p-10 bg-white/[0.03] border-white/5 rounded-[2rem] space-y-8">
        <h3 className="text-lg font-bold text-white flex items-center gap-3">
          <div className="w-1 h-5 bg-[#5789FF] rounded-full" /> Profile Identity
        </h3>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Display Name</label>
            <Input 
              value={localSettings.display_name || ""} 
              onChange={(e) => handleUpdate({ display_name: e.target.value })}
              className="h-14 bg-white/5 border-white/5 rounded-2xl px-6 font-medium focus:ring-[#5789FF]/30 transition-all text-white"
            />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">System Email (ReadOnly)</label>
            <Input 
              value={userEmail || ""} 
              className="h-14 bg-white/5 border-white/5 rounded-2xl px-6 font-medium opacity-40 cursor-not-allowed"
              readOnly
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Timezone (IANA)</label>
            <div className="relative group">
              <Input 
                value={localSettings.timezone} 
                onChange={(e) => handleUpdate({ timezone: e.target.value })}
                className="h-14 bg-white/5 border-white/5 rounded-2xl px-6 font-medium focus:ring-[#5789FF]/30 text-white"
                placeholder="America/Los_Angeles"
              />
              <Globe className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Default Briefing Location</label>
            <div className="flex gap-2">
              <Input 
                value={localSettings.location_text || ""} 
                onChange={(e) => handleUpdate({ location_text: e.target.value })}
                className="h-14 bg-white/5 border-white/5 rounded-2xl px-6 font-medium focus:ring-[#5789FF]/30 text-white"
                placeholder="San Francisco, CA"
              />
              <Button onClick={handleUseCurrentLocation} variant="outline" className="h-14 w-14 rounded-2xl bg-white/5 border-white/5 hover:bg-white/10 shrink-0">
                <MapPin className="w-5 h-5 text-indigo-400" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="sa-card p-10 bg-[#5789FF]/5 border-[#5789FF]/10 rounded-[2rem] space-y-8 relative overflow-hidden group">
         <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-2">
               <h3 className="text-lg font-bold text-white flex items-center gap-3">Developer Architecture</h3>
               <p className="text-xs text-white/40 max-w-sm leading-relaxed">Enable advanced orchestration debugging tools and real-time inference monitoring.</p>
            </div>
            <div className="flex items-center gap-4 bg-black/20 p-2 pl-6 rounded-2xl border border-white/5">
               <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Dev Mode</span>
               <Switch checked={isDevMode} onCheckedChange={toggleDevMode} />
            </div>
         </div>
         <div className="absolute top-0 right-0 w-64 h-64 bg-[#5789FF]/10 blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      </div>
    </div>
  );
};

const SecurityTab = () => {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listSessions(), listAuditEvents()])
      .then(([sessRes, auditRes]) => {
        setSessions(sessRes.sessions);
        setAuditLog(auditRes.events);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSignOut = (scope: 'local' | 'others' | 'global' = 'local') => {
    supabase.auth.signOut({ scope }).then(() => {
      if (scope !== 'others') window.location.href = '/auth';
      else toast.success("Signed out from other sessions");
    });
  };

  const getDeviceIcon = (ua: string | null) => {
    if (!ua) return Monitor;
    if (/mobile|iphone|android/i.test(ua)) return SmartphoneIcon;
    if (/tablet|ipad/i.test(ua)) return TabletIcon;
    return LaptopIcon;
  };

  if (loading) return <div className="space-y-6 animate-pulse pt-10"><div className="h-64 bg-white/5 rounded-3xl" /><div className="h-64 bg-white/5 rounded-3xl" /></div>;

  return (
    <div className="grid grid-cols-10 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="col-span-6 space-y-8">
        <div className="sa-card p-10 bg-white/[0.03] border-white/5 rounded-[2rem] space-y-8 text-white">
          <h3 className="text-lg font-bold flex items-center gap-3">
             <Shield className="w-5 h-5 text-rose-400" /> Account Termination & Access
          </h3>
          <p className="text-sm text-white/40 leading-relaxed">Manage your active authentication nodes and global session state across all endpoints.</p>
          
          <div className="flex flex-col gap-4">
             <Button onClick={() => handleSignOut('local')} variant="outline" className="h-14 justify-start px-8 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-white font-bold group transition-all">
                <LogOut className="w-5 h-5 mr-4 text-white/40 group-hover:text-white" /> Sign out of this device
             </Button>
             <Button onClick={() => handleSignOut('others')} variant="outline" className="h-14 justify-start px-8 rounded-2xl bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-300 font-bold group transition-all">
                <Smartphone className="w-5 h-5 mr-4 text-indigo-400" /> Logout from all other devices
             </Button>
             <Button onClick={() => handleSignOut('global')} variant="destructive" className="h-14 justify-start px-8 rounded-2xl font-bold group transition-all">
                <AlertTriangle className="w-5 h-5 mr-4" /> Global Sign Out Everywhere
             </Button>
          </div>
        </div>

        <div className="space-y-6">
           <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white/30 px-4">Active Sessions ({sessions.length})</h3>
           <div className="space-y-4">
              {sessions.map((s) => {
                const Icon = getDeviceIcon(s.user_agent);
                return (
                  <div key={s.session_id} className="sa-card p-6 bg-white/[0.02] border-white/5 rounded-2xl flex items-center gap-5 group hover:bg-white/[0.04] transition-all">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-[#5789FF]">
                       <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                         <h4 className="text-sm font-bold text-white">{s.device_label || "Unknown Node"}</h4>
                         {s.session_id === (supabase.auth.getSession().then(r => r.data.session?.user.id) && "current") && (
                           <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[9px] uppercase font-black">Main</Badge>
                         )}
                      </div>
                      <p className="text-[11px] text-white/30">{s.ip || "0.0.0.0"} • {s.location_text || "Geofence Locked"} • Seen {format(new Date(s.last_seen_at), "MMM d, HH:mm")}</p>
                    </div>
                  </div>
                );
              })}
           </div>
        </div>
      </div>

      <div className="col-span-4 space-y-6">
         <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white/30 px-4">Audit Ledger</h3>
         <div className="sa-card p-8 bg-white/[0.02] border-white/5 rounded-[2rem] space-y-8 relative overflow-hidden">
            <div className="space-y-8 relative z-10 border-l border-white/5 ml-3 pl-8">
               {auditLog.map((log, i) => (
                  <div key={i} className="relative">
                     <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-[#0B0E14] border-2 border-[#5789FF]/40" />
                     <div className="space-y-1">
                        <h4 className="text-xs font-bold text-white/80 uppercase tracking-wide">{log.event_type.replace(/_/g, ' ')}</h4>
                        <p className="text-[10px] text-white/20 font-medium">{format(new Date(log.created_at), "MMM d, yyyy • HH:mm")}</p>
                     </div>
                  </div>
               ))}
               {auditLog.length === 0 && <p className="text-xs text-white/20 italic">No historical events recorded.</p>}
            </div>
         </div>
      </div>
    </div>
  );
};

const APIKeysTab = () => {
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [systems, setSystems] = useState<SystemKeyStatus | null>(null);
  const [connectors, setConnectors] = useState<ConnectorCredentialStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getUsageStats(), getSystemKeyStatus(), getConnectorCredentialStatus()])
      .then(([u, s, c]) => {
        setUsage(u);
        setSystems(s);
        setConnectors(c.providers);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-10 animate-pulse pt-10"><div className="h-64 bg-white/5 rounded-3xl" /><div className="h-64 bg-white/5 rounded-3xl" /></div>;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-2 gap-8">
        <div className="sa-card p-10 bg-white/[0.03] border-white/5 rounded-[2rem] space-y-6">
           <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" /> Briefing Consumption
           </h3>
           <div className="space-y-8">
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white/60">Generate Capacity</span>
                    <span className="text-2xl font-black text-white">{usage?.generate_percent}%</span>
                 </div>
                 <Progress value={usage?.generate_percent} className="h-2 bg-white/5" />
                 <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">{usage?.generate_count} / {usage?.generate_limit} DAILY QUOTA</p>
              </div>
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white/60">Render Capacity</span>
                    <span className="text-2xl font-black text-white">{usage?.render_percent}%</span>
                 </div>
                 <Progress value={usage?.render_percent} className="h-2 bg-white/5" />
                 <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">{usage?.render_count} / {usage?.render_limit} DAILY QUOTA</p>
              </div>
           </div>
        </div>

        <div className="sa-card p-10 bg-white/[0.03] border-white/5 rounded-[2rem] space-y-6">
           <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
              <Activity className="w-4 h-4 text-white/20" /> Performance Metrics
           </h3>
           <div className="space-y-4">
              <div className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                 <span className="text-xs font-bold text-white/60">P95 Latency</span>
                 <span className="text-sm font-black text-emerald-400">1.2s</span>
              </div>
              <div className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                 <span className="text-xs font-bold text-white/60">Uptime SLA</span>
                 <span className="text-sm font-black text-white">99.98%</span>
              </div>
              <div className="flex items-center justify-between p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                 <span className="text-xs font-bold text-emerald-400/80">Rate Limits</span>
                 <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Global Unlimited</span>
              </div>
           </div>
        </div>
      </div>

      <div className="space-y-6">
         <h2 className="text-2xl font-black text-white tracking-tight px-4">Infrastructure Status</h2>
         <div className="grid grid-cols-3 gap-6">
            <div className="sa-card p-8 bg-white/[0.02] border-white/5 rounded-[2rem] space-y-4">
               <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">System Keys (ENV)</h4>
               <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                     <span className="text-xs font-bold text-white/60">OpenAI</span>
                     <Badge className={cn("text-[9px] uppercase border-none", systems?.openai ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>{systems?.openai ? "Active" : "Missing"}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                     <span className="text-xs font-bold text-white/60">Fal.ai</span>
                     <Badge className={cn("text-[9px] uppercase border-none", systems?.fal ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>{systems?.fal ? "Active" : "Missing"}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                     <span className="text-xs font-bold text-white/60">Runware</span>
                     <Badge className={cn("text-[9px] uppercase border-none", systems?.runware ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>{systems?.runware ? "Active" : "Missing"}</Badge>
                  </div>
               </div>
            </div>

            <div className="col-span-2 sa-card p-8 bg-white/[0.02] border-white/5 rounded-[2rem] space-y-4">
               <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Connector Credentials (User Vault)</h4>
               <div className="grid grid-cols-2 gap-y-4 gap-x-12 pt-2">
                  {connectors.map(c => (
                    <div key={c.provider} className="flex items-center justify-between border-b border-white/5 pb-2">
                       <span className="text-xs font-bold text-white/90 capitalize">{c.provider}</span>
                       <div className="flex items-center gap-3">
                          <span className={cn("text-[10px] font-bold uppercase tracking-widest", c.configured ? "text-emerald-400" : "text-white/20")}>
                             {c.configured ? "Connected" : "Needed"}
                          </span>
                          <div className={cn("w-1.5 h-1.5 rounded-full", c.status === 'healthy' ? "bg-emerald-500" : "bg-white/10")} />
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

const NotificationsTab = ({ settings, setSettings }: any) => {
  const prefs = settings?.notification_prefs || {
    genComplete: true, genError: true, edgeFailures: true,
    newLogin: true, vaultRotation: true, dailyDigest: false
  };

  const toggleNotif = (key: string) => {
    const nextPrefs = { ...prefs, [key]: !prefs[key] };
    if (setSettings && settings) {
      setSettings({ ...settings, notification_prefs: nextPrefs });
    } else if (setSettings) {
      // If settings are null, we can't easily save but we can locally toggle if we had local state
      // For now, assume settings should be present to save.
    }
  };

  const sections = [
    {
      title: "System Health & Security",
      icon: Shield,
      items: [
        { id: "edgeFailures", title: "Edge Function Failures", desc: "Immediate alert when any edge orchestration node experiences execution timeouts or crashes." },
        { id: "newLogin", title: "New Login Alert", desc: "Security notification for any access from an unrecognized IP address or hardware fingerprint." },
        { id: "vaultRotation", title: "Vault Secret Rotation", desc: "Notifies when API secrets or private keys are successfully updated or expire." },
      ]
    },
    {
      title: "Briefing Alerts",
      icon: Zap,
      items: [
        { id: "genComplete", title: "Generation Complete", desc: "Standard alert when a long-running batch orchestration task finishes successfully." },
        { id: "genError", title: "Generation Error", desc: "Critical failure notification during the model refinement or content generation phase." },
        { id: "dailyDigest", title: "Daily Digest", desc: "A consolidated summary of all orchestration activity and credit consumption for the last 24 hours." },
      ]
    }
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-white tracking-tight">Notification Preferences</h2>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Manage how and when you receive critical system updates, security alerts, and orchestration reports.
        </p>
      </div>

      <div className="space-y-12">
        {sections.map((section) => (
          <div key={section.title} className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-3">
               <section.icon className="w-3.5 h-3.5" /> {section.title}
            </h4>
            <div className="sa-card bg-white/[0.02] border-white/5 rounded-[2rem] divide-y divide-white/5 overflow-hidden">
               {section.items.map((item) => (
                  <div key={item.id} className="p-8 flex items-center justify-between group hover:bg-white/[0.01] transition-colors">
                     <div className="space-y-1.5 ml-4 relative">
                        <div className={cn("absolute -left-6 top-1.5 w-1.5 h-1.5 rounded-full", prefs[item.id] ? "bg-[#5789FF] shadow-[0_0_8px_#5789FF]" : "bg-white/10")} />
                        <h5 className="text-sm font-bold text-white group-hover:text-[#5789FF] transition-colors">{item.title}</h5>
                        <p className="text-xs text-white/30 max-w-md">{item.desc}</p>
                     </div>
                     <Switch 
                        checked={prefs[item.id] || false} 
                        onCheckedChange={() => toggleNotif(item.id)}
                     />
                  </div>
               ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


// --- Main Settings Component ---

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [initialSettings, setInitialSettings] = useState<UserSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      const res = await getUserSettings();
      setSettings(res);
      setInitialSettings(res);

      // Session tracking
      if (user) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          touchSession({
            session_id: session.access_token.substring(0, 36), // fallback or use session metadata
            user_agent: navigator.userAgent,
            device_label: "Browser Session"
          });
        }
      }
    } catch (err: any) {
      toast.error("Failed to sync settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const handleSave = async () => {
    if (!settings) return;
    try {
      setIsSaving(true);
      await updateUserSettings(settings);
      setInitialSettings(settings);
      toast.success("Settings updated", { description: "Your profile architecture is now synced." });
    } catch (err: any) {
      toast.error("Save failed", { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setSettings(initialSettings);
    toast.info("Changes discarded");
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-[#0B0E14]">
       <div className="flex flex-col items-center gap-4 opacity-50">
         <Loader2 className="w-8 h-8 text-[#5789FF] animate-spin" />
         <span className="text-[10px] uppercase tracking-widest text-white/80 font-bold">Synchronizing Control Plane...</span>
       </div>
    </div>
  );

  return (
    <div className="px-12 py-8 space-y-10 animate-in fade-in duration-1000 bg-[#0B0E14] min-h-full">
      
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Avatar className="w-24 h-24 border-2 border-white/5 ring-4 ring-[#5789FF]/10 shadow-[0_0_50px_rgba(87,137,255,0.1)]">
            <AvatarImage src={settings?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id}`} />
            <AvatarFallback>{settings?.display_name?.substring(0,2).toUpperCase() || "US"}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
             <div className="flex items-center gap-3">
                <h1 className="text-4xl font-extrabold tracking-tight text-white">{settings?.display_name || "Agent User"}</h1>
                {isDirty && <Badge className="bg-amber-500/20 text-amber-500 border-none animate-pulse">Unsaved</Badge>}
             </div>
             <p className="text-sm text-muted-foreground flex items-center gap-2">
                {user?.email} <span className="w-1 h-1 bg-white/20 rounded-full" /> LEVEL 4 ACCESS
             </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <Button 
            variant="outline" 
            onClick={handleDiscard}
            disabled={!isDirty || isSaving}
            className="h-12 px-6 bg-white/5 border-white/5 hover:bg-white/10 text-white/60 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-30"
           >
              Discard
           </Button>
           <Button 
            onClick={handleSave} 
            disabled={!isDirty || isSaving}
            className="h-12 px-6 sa-button-primary rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(87,137,255,0.3)] disabled:opacity-50"
           >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
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
                  ? "bg-white/5 text-white shadow-[0_0_20px_rgba(87,137,255,0.05)] border border-white/5" 
                  : "text-white/40 hover:text-white hover:bg-white/[0.02]"
              )}
            >
              <tab.icon className={cn("w-5 h-5 transition-colors", activeTab === tab.id ? "text-[#5789FF]" : "group-hover:text-white/60")} />
              <span className="text-sm font-bold tracking-tight">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="col-span-10 min-h-[600px]">
          {activeTab === "general" && <GeneralTab settings={settings} setSettings={setSettings} isDirty={isDirty} onSave={handleSave} onDiscard={handleDiscard} userEmail={user?.email} />}
          {activeTab === "security" && <SecurityTab />}
          {activeTab === "api" && <APIKeysTab />}
          {activeTab === "notifications" && <NotificationsTab settings={settings} setSettings={setSettings} />}
        </div>
      </div>
    </div>
  );
}
