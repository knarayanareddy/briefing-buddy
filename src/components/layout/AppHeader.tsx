import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { getProfiles, syncRequiredConnectors } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  RefreshCw, 
  LogOut, 
  ChevronDown, 
  Monitor, 
  Layout, 
  Database, 
  History, 
  BookOpen 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useDevMode, isDevModeEnabled } from "@/lib/devMode";

export default function AppHeader({ onSync }: { onSync: () => void }) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const { isDevMode, toggleDevMode } = useDevMode();
  const [user, setUser] = useState<any>(null);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    loadProfiles();
    
    const handleDevModeSync = () => loadProfiles();
    window.addEventListener("storage_dev_mode", handleDevModeSync);
    window.addEventListener("storage", handleDevModeSync);
    
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("storage_dev_mode", handleDevModeSync);
      window.removeEventListener("storage", handleDevModeSync);
    };
  }, []);

  async function loadProfiles() {
    let profs: any[] = [];
    
    // 1. Immediate Mock Injection for Dev Mode
    if (isDevModeEnabled()) {
      profs = [
        { 
          id: "mock-1", 
          name: "Demo Executive", 
          enabled_modules: ["rss", "github"], 
          module_settings: {},
          persona: "Professional Executive",
          timezone: "UTC",
          updated_at: new Date().toISOString()
        }
      ];
    }

    try {
      const realProfs = await getProfiles().catch(() => []);
      if (realProfs && realProfs.length > 0) {
        profs = [...profs, ...realProfs];
      }
    } catch (err) {
      console.warn("Header profiles load fail, using mocks if available", err);
    } finally {
      setProfiles(profs);
      const lastId = localStorage.getItem("selectedProfileId");
      if (lastId && profs.find(p => p.id === lastId)) {
        setSelectedProfileId(lastId);
      } else if (profs.length > 0) {
        setSelectedProfileId(profs[0].id);
      }
    }
  }

  const handleManualSync = async () => {
    if (!selectedProfileId) return;
    setSyncing(true);
    try {
      await syncRequiredConnectors(selectedProfileId, "best_effort");
      toast.success("Sync started");
      onSync();
    } catch (e: any) {
      toast.error("Sync failed: " + e.message);
    } finally {
      setSyncing(true);
      setTimeout(() => setSyncing(false), 2000); // UI feel
    }
  };

  const getPageTitle = () => {
    switch(location.pathname) {
      case "/today": return "Executive Briefing";
      case "/builder": return "Briefing Builder";
      case "/connectors": return "Data Connectors";
      case "/reading-list": return "Reading List";
      case "/history": return "Briefing History";
      default: return "Executive Briefing";
    }
  };

  return (
    <header className="h-14 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-6 z-50 sticky top-0">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
           <h1 className="text-sm font-bold tracking-tight text-white/90">Morning Brief</h1>
        </div>
        
        <Separator orientation="vertical" className="h-4 bg-white/10" />
        
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-white/40 font-medium">{getPageTitle()}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5">
          <Label htmlFor="dev-mode" className="text-[10px] font-bold text-white/40 uppercase tracking-widest cursor-pointer">Dev Mode</Label>
          <Switch 
            id="dev-mode" 
            checked={isDevMode}
            onCheckedChange={toggleDevMode}
            className="scale-75 data-[state=checked]:bg-primary"
          />
        </div>

        <Separator orientation="vertical" className="h-4 bg-white/10" />

        <div className="flex items-center gap-3">
          <div className="relative w-48">
            <select 
              className="w-full h-8 bg-black/20 border border-white/10 rounded-md px-3 text-[11px] font-medium text-white/70 outline-none focus:ring-1 focus:ring-primary/30 appearance-none cursor-pointer"
              value={selectedProfileId || ""}
              onChange={(e) => {
                const id = e.target.value;
                if (id === "new") {
                   window.location.href = "/builder";
                   return;
                }
                setSelectedProfileId(id);
                localStorage.setItem("selectedProfileId", id);
                window.dispatchEvent(new Event("storage"));
              }}
            >
              {profiles.length > 0 ? (
                profiles.map(p => (
                  <option key={p.id} value={p.id} className="bg-neutral-900">{p.name}</option>
                ))
              ) : (
                <option value="" disabled className="bg-neutral-900">No Profiles</option>
              )}
              <option value="new" className="text-primary font-bold bg-neutral-900">+ New Profile</option>
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
              <ChevronDown className="w-3 h-3 text-white" />
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-3 text-[11px] gap-2 hover:bg-white/5 active:bg-white/10 transition-all text-white/70"
            onClick={handleManualSync}
            disabled={syncing || !selectedProfileId}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
            <span>Sync</span>
          </Button>

          <Separator orientation="vertical" className="h-4 bg-white/10" />

          {user ? (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-3 text-[11px] text-red-400/70 hover:text-red-300 hover:bg-red-500/10 gap-2"
              onClick={() => supabase.auth.signOut()}
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </Button>
          ) : (
            <Button 
              variant="default" 
              size="sm" 
              className="h-8 px-3 text-[11px] bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20"
              onClick={() => {
                // Open auth dialog or redirect
                toast.info("Opening Auth...");
                supabase.auth.signInWithOAuth({ provider: 'github' });
              }}
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
