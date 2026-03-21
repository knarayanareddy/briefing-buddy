import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  syncRequiredConnectors,
  upsertProfile
} from "@/lib/api";
import { useDevMode } from "@/lib/devMode";
import ConnectorCard from "@/components/connectors/ConnectorCard";
import FeedManagementModal from "@/components/connectors/FeedManagementModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Github, Key, Database } from "lucide-react";

export default function Connectors() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncingType, setSyncingType] = useState<string | null>(null);
  const [isFeedModalOpen, setIsFeedModalOpen] = useState(false);
  const [isSavingFeeds, setIsSavingFeeds] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const { isDevMode } = useDevMode();
  const [githubToken, setGithubToken] = useState("");
  
  // Auth state for the gated screen
  const [loginEmail, setLoginEmail] = useState("");
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setAuthenticated(false);
      setLoading(false);
      return;
    }
    setAuthenticated(true);
    loadData(session.user.id);
  }

  async function loadData(userId: string) {
    setLoading(true);
    try {
      const { data: health, error } = await supabase
        .from("connector_health" as any)
        .select("*")
        .eq("user_id", userId);
      
      if (error) throw error;

      const profileId = localStorage.getItem("selectedProfileId");
      let rssFeeds = [];
      if (profileId) {
        const { data: profile } = await supabase
          .from("briefing_profiles" as any)
          .select("module_settings")
          .eq("id", profileId)
          .single();
        rssFeeds = (profile as any)?.module_settings?.rss?.feeds || [];
      }

      const statusMap: any = {};
      (health || []).forEach((h: any) => {
        statusMap[h.provider] = {
          active: h.connected,
          last_success: h.last_success,
          last_error: h.last_error,
          backoff_count: h.backoff_count,
          status: h.status,
          config: h.provider === "rss" ? { feeds: rssFeeds } : {}
        };
      });

      setData(statusMap);
    } catch (err: any) {
      console.error("Load data error:", err);
      toast.error("Failed to load connector status: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleSync = async (type: string) => {
    setSyncingType(type);
    try {
      const profileId = localStorage.getItem("selectedProfileId");
      if (!profileId) throw new Error("No profile selected");
      await syncRequiredConnectors(profileId, "force");
      toast.success(`${type} sync started`);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await loadData(session.user.id);
    } catch (err: any) {
      toast.error("Sync failed: " + err.message);
    } finally {
      setSyncingType(null);
    }
  };

  const handleSaveFeeds = async (feeds: any[]) => {
    setIsSavingFeeds(true);
    try {
      const profileId = localStorage.getItem("selectedProfileId");
      if (!profileId) throw new Error("No profile selected");
      
      const { data: profile } = await supabase
        .from("briefing_profiles" as any)
        .select("module_settings")
        .eq("id", profileId)
        .single();
      
      const newSettings = {
        ...((profile as any)?.module_settings || {}),
        rss: { ...((profile as any)?.module_settings?.rss || {}), feeds }
      };

      await upsertProfile({ id: profileId, module_settings: newSettings });
      
      toast.success("RSS feeds updated");
      setIsFeedModalOpen(false);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await loadData(session.user.id);
    } catch (err: any) {
      toast.error("Failed to save feeds: " + err.message);
    } finally {
      setIsSavingFeeds(false);
    }
  };

  const handleSetGithubToken = async () => {
    if (!githubToken) return;
    try {
      const { data: res, error } = await supabase.functions.invoke("set-connector-secret", {
        body: { provider: "github", secret: githubToken }
      });
      if (error) throw error;
      
      toast.success("GitHub PAT saved successfully");
      setGithubToken("");
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await loadData(session.user.id);
    } catch (err: any) {
      toast.error("Failed to save token: " + err.message);
    }
  };

  const handleLoginWithEmail = async () => {
    if (!loginEmail) return;
    setIsSendingMagicLink(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: loginEmail });
      if (error) throw error;
      toast.success("Magic link sent! Check your inbox.");
    } catch (err: any) {
      toast.error("Login failed: " + err.message);
    } finally {
      setIsSendingMagicLink(false);
    }
  };

  if (loading) return <div className="p-8 animate-pulse text-muted-foreground">Loading connectors...</div>;

  if (authenticated === false && !isDevMode) {
    return (
      <div className="p-8 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
           <Database className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Authentication Required</h2>
          <p className="text-muted-foreground max-w-sm">
            GitHub Auth is currently unavailable. Please sign in with your email or use <b>Dev Mode</b> to preview.
          </p>
        </div>
        
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <Input 
            placeholder="your@email.com" 
            value={loginEmail} 
            onChange={e => setLoginEmail(e.target.value)}
            className="text-center"
          />
          <Button onClick={handleLoginWithEmail} disabled={isSendingMagicLink || !loginEmail} className="w-full">
            {isSendingMagicLink ? "Sending..." : "Sign In with Email"}
          </Button>
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <span className="relative px-2 bg-background text-[10px] text-muted-foreground uppercase font-bold">Or</span>
          </div>
          <Button 
            variant="outline"
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })}
            className="w-full border-white/10"
          >
            Sign In with GitHub
          </Button>
        </div>
      </div>
    );
  }

  const rssStatus = data?.rss || { active: false };
  const githubStatus = data?.github || { active: false };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Data Connectors</h2>
        <p className="text-muted-foreground">
          Manage how your briefing bot accesses information. All data is processed securely and kept private.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ConnectorCard
          type="rss"
          title="AI News (RSS)"
          description="Aggregates content from specialized tech feeds."
          status={rssStatus.active ? "active" : "disconnected"}
          lastSync={rssStatus.last_success}
          error={rssStatus.last_error}
          isSyncing={syncingType === "rss"}
          isDevMode={isDevMode}
          onSync={() => handleSync("rss")}
          onManage={() => setIsFeedModalOpen(true)}
        >
          <div className="text-[10px] text-muted-foreground space-y-1 font-mono">
             <p>Feeds: {rssStatus.config?.feeds?.length || 0}</p>
             <p>Backoff: {rssStatus.backoff_count || 0}</p>
          </div>
        </ConnectorCard>

        <ConnectorCard
          type="github"
          title="GitHub Intelligence"
          description="Monitors PRs, issues, and repository activity."
          status={githubStatus.active ? "active" : "disconnected"}
          lastSync={githubStatus.last_success}
          error={githubStatus.last_error}
          isSyncing={syncingType === "github"}
          isDevMode={isDevMode}
          onSync={() => handleSync("github")}
          onManage={() => {}} 
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Personal Access Token</Label>
              <div className="flex gap-2">
                <Input 
                  type="password" 
                  placeholder="ghp_..." 
                  value={githubToken}
                  onChange={e => setGithubToken(e.target.value)}
                  className="h-8 text-xs bg-background border-border"
                />
                <Button size="sm" className="h-8 px-3" onClick={handleSetGithubToken}>
                  Save
                </Button>
              </div>
              <p className="text-[9px] text-muted-foreground italic">
                Tokens are stored in Supabase Vault and never displayed back.
              </p>
            </div>
          </div>
        </ConnectorCard>

        <ConnectorCard
          type="gmail"
          title="Gmail / Workspace"
          description="Summarize daily standups and thread activity."
          status="disconnected"
          isSyncing={false}
          isDevMode={isDevMode}
          onSync={() => {}}
          onManage={() => toast.info("Gmail integration coming soon!")}
        />
      </div>

      <FeedManagementModal 
        isOpen={isFeedModalOpen}
        onClose={() => setIsFeedModalOpen(false)}
        feeds={rssStatus.config?.feeds || []}
        onSave={handleSaveFeeds}
        isSaving={isSavingFeeds}
      />

      {isDevMode && (
        <div className="mt-12 space-y-4 animate-in slide-in-from-bottom-4">
          <div className="h-[1px] w-full bg-border/30" />
          <div className="flex items-center gap-2 text-muted-foreground">
             <Key className="w-4 h-4" />
             <h3 className="text-xs font-bold uppercase tracking-widest">Raw Status Metadata</h3>
          </div>
          <pre className="p-4 rounded-xl bg-muted/50 border border-border text-[10px] font-mono overflow-auto max-h-64">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
