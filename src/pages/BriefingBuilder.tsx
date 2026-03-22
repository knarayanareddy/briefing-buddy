import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getProfiles, upsertProfile, getModuleCatalog, previewPlan, getConnectorStatus } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Settings, Rocket, Database, Activity, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDevMode, isDevModeEnabled } from "@/lib/devMode";
import { ProfileCard, TokenStatus } from "@/components/builder/SilentComponents";

import ModuleList from "@/components/builder/ModuleList";
import ModuleSettingsPanel from "@/components/builder/ModuleSettingsPanel";
import PreviewPanel from "@/components/builder/PreviewPanel";

export default function BriefingBuilder() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [moduleCatalog, setModuleCatalog] = useState<any[]>([]);
  const [enabledModuleIds, setEnabledModuleIds] = useState<string[]>([]);
  const [moduleSettings, setModuleSettings] = useState<Record<string, any>>({});
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [frequency, setFrequency] = useState("manual");
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [connectorStatus, setConnectorStatus] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { isDevMode } = useDevMode();
  
  const [loginEmail, setLoginEmail] = useState("");
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);

  const fetchTargetConnectors = async () => {
    try {
      const cStatus = await getConnectorStatus();
      if (cStatus && Array.isArray(cStatus)) {
        setConnectorStatus(
          cStatus.reduce((acc: any, curr: any) => ({ ...acc, [curr.provider]: curr.status }), {})
        );
      }
    } catch (e) {
      console.error("Failed to fetch connector status", e);
    }
  };

  const handlePreview = async () => {
    if (!selectedProfileId) return;
    setIsPreviewLoading(true);

    try {
      const missingConnectors = new Set<string>();
      enabledModuleIds.forEach(modId => {
        const mod = moduleCatalog.find(m => m.id === modId);
        if (mod?.requiredConnectors) {
          mod.requiredConnectors.forEach((c: any) => {
            if (connectorStatus[c.provider] !== "active") {
              missingConnectors.add(c.provider);
            }
          });
        }
      });
      
      if (missingConnectors.size > 0) {
        toast.error(`Connect missing source(s) first: ${Array.from(missingConnectors).join(", ")}`);
        setIsPreviewLoading(false);
        return;
      }

      const res = await previewPlan(selectedProfileId);
      setPreviewResult(res);
      if (res.connector_status) {
        setConnectorStatus(
          res.connector_status.reduce((acc: any, curr: any) => ({ ...acc, [curr.provider]: curr.status }), {})
        );
      }
    } catch (err: any) {
      toast.error("Preview failed: " + err.message);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  useEffect(() => {
    setPreviewResult(null);
  }, [selectedProfileId, enabledModuleIds]);


  useEffect(() => {
    checkSession();
    const handleDevModeSync = () => loadInitialData();
    window.addEventListener("storage_dev_mode", handleDevModeSync);
    window.addEventListener("storage", handleDevModeSync);
    return () => {
      window.removeEventListener("storage_dev_mode", handleDevModeSync);
      window.removeEventListener("storage", handleDevModeSync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, isDevMode]);

  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setAuthenticated(false);
      if (isDevModeEnabled()) {
        loadInitialData();
        return;
      }
      setLoading(false);
      return;
    }
    setAuthenticated(true);
    loadInitialData();
  }

  async function loadInitialData() {
    setLoading(true);
    let profs: any[] = [];
    let catalog: any[] = [];

    try {
      // 1. Load Real Data from API
      const [realProfs, realCatalog] = await Promise.all([
        getProfiles().catch(() => []), 
        getModuleCatalog().catch(() => [])
      ]);
      await fetchTargetConnectors();
      
      if (realProfs && realProfs.length > 0) profs = [...realProfs];
      catalog = realCatalog || [];

      // 2. If no real profiles, and authenticated, seed with real default profiles
      if (profs.length === 0 && authenticated) {
        try {
          const SEED_PROFILES = [
            { 
              name: "Strategic CTO", 
              enabled_modules: ["ai_news_delta", "github_prs", "inbox_triage"], 
              module_settings: {},
              persona: "Technical CTO",
              frequency: "daily",
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            { 
              name: "Product Innovation Lead", 
              enabled_modules: ["ai_news_delta", "slack_updates"], 
              module_settings: {},
              persona: "Product Lead",
              frequency: "twice_daily",
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            { 
              name: "Security Auditor", 
              enabled_modules: ["github_mentions", "watchlist_alerts"], 
              module_settings: {},
              persona: "Auditor",
              frequency: "hourly",
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            { 
              name: "Venture Partner", 
              enabled_modules: ["hn_top", "linkedin_network"], 
              module_settings: {},
              persona: "Investor",
              frequency: "manual",
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
          ];
          const newProfs = await Promise.all(SEED_PROFILES.map(p => upsertProfile(p)));
          profs = newProfs;
          toast.success("Initialized default intelligence profiles.");
        } catch (err: any) {
          console.error("Failed to seed profiles", err);
        }
      }

      // 3. Fallback to mocks ONLY if unauthenticated Dev Mode
      if (profs.length === 0 && isDevModeEnabled() && !authenticated) {
        profs = [
          { 
            id: "mock-1", 
            name: "Strategic CTO (Mock)", 
            description: "Infrastructure oversight, AI benchmarks, and critical security vulnerabilities.",
            enabled_modules: ["ai_news_delta", "github_prs", "inbox_triage"], 
            module_settings: {},
            persona: "Technical CTO",
            frequency: "daily",
            timezone: "UTC",
            updated_at: new Date().toISOString()
          }
        ];
      }

      setProfiles(profs);
      setModuleCatalog(catalog);

      // 3. Selection Logic
      const lastId = localStorage.getItem("selectedProfileId");
      const toSelect = profs.find(p => p.id === lastId) || profs[0];
      if (toSelect) {
        handleProfileSelect(toSelect.id, profs);
      }

    } catch (err: any) {
      console.error("Failed to load initial data:", err);
      toast.error("Using local mock architecture (Sync unavailable)");
    } finally {
      // Ensure we have a default selection if catalog is loaded
      if (catalog.length > 0 && !selectedModuleId) {
        setSelectedModuleId(catalog[0].id);
      }
      setLoading(false);
    }
  }

  const handleProfileSelect = (id: string, profList = profiles) => {
    const p = (profList || []).find(x => x.id === id);
    if (!p) return;
    setSelectedProfileId(id);
    setProfileName(p.name);
    setEnabledModuleIds(p.enabled_modules || []);
    setModuleSettings(p.module_settings || {});
    setFrequency(p.frequency || "manual");
    localStorage.setItem("selectedProfileId", id);
    if (p.enabled_modules?.length > 0 && !selectedModuleId) {
       setSelectedModuleId(p.enabled_modules[0]);
    }
  };

  const handleUpdateProfile = async (updates: Partial<any>) => {
    if (!selectedProfileId || selectedProfileId.startsWith("mock-")) {
       // Just update local state for mock
       if (updates.enabled_modules) setEnabledModuleIds(updates.enabled_modules);
       if (updates.module_settings) setModuleSettings(updates.module_settings);
       if (updates.frequency) setFrequency(updates.frequency);
       return;
    }

    setIsSaving(true);
    try {
      const updated = await upsertProfile({ id: selectedProfileId, ...updates });
      setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
      if (updates.enabled_modules) setEnabledModuleIds(updated.enabled_modules);
      if (updates.module_settings) setModuleSettings(updated.module_settings);
      if (updates.frequency) setFrequency(updated.frequency || "manual");
    } catch (err: any) {
      toast.error("Failed to sync profile: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateProfile = async () => {
    setIsSaving(true);
    try {
      const newProf = await upsertProfile({
        name: "New Profile",
        enabled_modules: [],
        module_settings: {},
        frequency: "manual",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
      setProfiles(prev => [...prev, newProf]);
      handleProfileSelect(newProf.id, [...profiles, newProf]);
      toast.success("Profile created");
    } catch (err: any) {
      toast.error("Failed to create profile: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!selectedProfileId || selectedProfileId.startsWith("mock-")) return;
    setIsSaving(true);
    try {
      // Import deleteProfile at the top automatically assumes it's available or we'll add it
      const { deleteProfile } = await import('@/lib/api');
      await deleteProfile(selectedProfileId);
      const nextProfs = profiles.filter(p => p.id !== selectedProfileId);
      setProfiles(nextProfs);
      if (nextProfs.length > 0) handleProfileSelect(nextProfs[0].id, nextProfs);
      else {
        setSelectedProfileId(null);
        setProfileName("");
      }
      toast.success("Profile deleted");
    } catch (err: any) {
      toast.error("Failed to delete profile: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicateProfile = async () => {
    const current = profiles.find(p => p.id === selectedProfileId);
    if (!current) return;
    setIsSaving(true);
    try {
      const newProf = await upsertProfile({
        name: `${current.name} (Copy)`,
        persona: current.persona,
        enabled_modules: current.enabled_modules,
        module_settings: current.module_settings,
        frequency: current.frequency,
        timezone: current.timezone
      });
      setProfiles(prev => [...prev, newProf]);
      handleProfileSelect(newProf.id, [...profiles, newProf]);
      toast.success("Profile duplicated");
    } catch (err: any) {
      toast.error("Failed to duplicate profile: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoginWithEmail = async () => {
    if (!loginEmail) return;
    setIsSendingMagicLink(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: loginEmail });
      if (error) throw error;
      toast.success("Magic link sent!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSendingMagicLink(false);
    }
  };

  if (loading) return <div className="p-8 animate-pulse text-muted-foreground">Loading Silent Architect...</div>;

  if (authenticated === false && !isDevMode) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-4 border border-white/10">
           <Database className="w-10 h-10 text-[#5789FF]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Access Restricted</h2>
          <p className="text-muted-foreground max-w-sm">
            Sign in with your email to access the Silent Architect Orchestration Engine.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <Input 
            placeholder="your@email.com" 
            value={loginEmail} 
            onChange={e => setLoginEmail(e.target.value)}
            className="h-12 bg-white/5 border-white/10 text-center rounded-xl"
          />
          <Button onClick={handleLoginWithEmail} disabled={isSendingMagicLink || !loginEmail} className="sa-button-primary h-12 rounded-xl">
            {isSendingMagicLink ? "Sending..." : "Request Access"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-6 grid grid-cols-12 gap-10 min-h-full animate-in fade-in duration-1000">
      
      {/* COLUMN 1: Profiles & Frequency */}
      <div className="col-span-3 space-y-10">
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white/40">Executive Profile</h3>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6 text-white/40 hover:text-white" onClick={handleCreateProfile} title="Create Profile">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            {profiles.map(p => (
              <ProfileCard 
                key={p.id}
                title={p.name}
                description={p.description || "Personalized AI briefing profile for strategic oversight."}
                active={selectedProfileId === p.id}
                onClick={() => handleProfileSelect(p.id)}
              />
            ))}
          </div>
          {selectedProfileId && !selectedProfileId.startsWith("mock-") && (
            <div className="flex items-center gap-2 pt-2 border-t border-white/5 justify-end">
              <Button variant="ghost" size="sm" className="text-xs text-white/40 hover:text-white h-7 px-2" onClick={handleDuplicateProfile} disabled={isSaving}>Duplicate</Button>
              <Button variant="ghost" size="sm" className="text-xs text-red-500/60 hover:text-red-500 hover:bg-red-500/10 h-7 px-2" onClick={handleDeleteProfile} disabled={isSaving}>Delete</Button>
            </div>
          )}
        </section>

        <section className="space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white/40">Briefing Frequency</h3>
          <div className="grid grid-cols-2 gap-3">
             <Button 
                variant={frequency === "daily" ? "default" : "outline"} 
                onClick={() => handleUpdateProfile({ frequency: "daily" })}
                className={cn("h-14 rounded-xl font-bold text-[10px] uppercase tracking-widest", frequency === "daily" ? "sa-button-primary" : "bg-white/[0.02] border-white/5 hover:bg-white/5 text-white/60")}
              >
                Daily Morning
              </Button>
             <Button 
                variant={frequency === "hourly" ? "default" : "outline"} 
                onClick={() => handleUpdateProfile({ frequency: "hourly" })}
                className={cn("h-14 rounded-xl font-bold text-[10px] uppercase tracking-widest", frequency === "hourly" ? "sa-button-primary" : "bg-white/[0.02] border-white/5 hover:bg-white/5 text-white/60")}
              >
                As-it-Happens
              </Button>
             <Button 
                variant={frequency === "twice_daily" ? "default" : "outline"} 
                onClick={() => handleUpdateProfile({ frequency: "twice_daily" })}
                className={cn("h-14 rounded-xl font-bold text-[10px] uppercase tracking-widest", frequency === "twice_daily" ? "sa-button-primary" : "bg-white/[0.02] border-white/5 hover:bg-white/5 text-white/60")}
              >
                Twice Daily
              </Button>
             <Button 
                variant={frequency === "manual" ? "default" : "outline"} 
                onClick={() => handleUpdateProfile({ frequency: "manual" })}
                className={cn("h-14 rounded-xl font-bold text-[10px] uppercase tracking-widest", frequency === "manual" ? "sa-button-primary" : "bg-white/[0.02] border-white/5 hover:bg-white/5 text-white/60")}
              >
                Manual Only
              </Button>
          </div>
        </section>

        <TokenStatus used={12000} total={15000} />
      </div>

      {/* COLUMN 2: Intelligence Sources */}
      <div className="col-span-4 space-y-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
            Configure Intelligence Sources
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Select and prioritize the data modules for the AI agent to ingest.
          </p>
        </div>

        <div className="space-y-4 pt-4">
          <ModuleList 
            modules={moduleCatalog}
            enabledModuleIds={enabledModuleIds}
            selectedModuleId={selectedModuleId}
            onToggle={(id) => {
               const next = enabledModuleIds.includes(id) 
                 ? enabledModuleIds.filter(x => x !== id) 
                 : [...enabledModuleIds, id];
               handleUpdateProfile({ enabled_modules: next });
            }}
            onSelect={setSelectedModuleId}
            connectorStatus={connectorStatus}
            layout="silent"
          />
        </div>

        {selectedModuleId && (
           <div className="pt-4 border-t border-white/5 animate-in fade-in duration-500">
              <ModuleSettingsPanel 
                 module={moduleCatalog.find(m => m.id === selectedModuleId)}
                 settings={moduleSettings[selectedModuleId] || {}}
                 connectorStatus={connectorStatus}
                 onUpdate={(key, val) => {
                    const nextSettings = {
                       ...moduleSettings,
                       [selectedModuleId]: {
                          ...(moduleSettings[selectedModuleId] || {}),
                          [key]: val
                       }
                    };
                    handleUpdateProfile({ module_settings: nextSettings });
                 }}
                 onSave={() => handleUpdateProfile({})}
                 isSaving={isSaving}
                 onConfigClose={fetchTargetConnectors}
              />
           </div>
        )}
      </div>

      {/* COLUMN 3: Briefing Preview */}
      <div className="col-span-5 flex flex-col">
        <div className="space-y-6 flex-1">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white/40">Briefing Preview</h3>
          <PreviewPanel 
            onPreview={handlePreview}
            isLoading={isPreviewLoading}
            result={previewResult}
            layout="silent" // We'll update PreviewPanel to handle this prop
          />
        </div>
      </div>
    </div>
  );
}
