import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { X, Check, Globe, Shield, Zap, RefreshCw, Layers, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import FeedManagementModal from "./FeedManagementModal";
import { 
  updateConnectorConfig, 
  setConnectorSecret, 
  getConnectorConfig, 
  triggerSync, 
  disconnectConnector, 
  startGoogleOAuth,
  testRssSync,
  testGitHubSync,
  testSlackSync
} from "@/lib/api";
import { toast } from "sonner";

export default function ConfigModal({ isOpen, onClose, title, provider }: any) {
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFeedModalOpen, setIsFeedModalOpen] = useState(false);
  const [config, setConfig] = useState<any>({});
  const [secret, setSecret] = useState<string>("");

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const existingConfig = await getConnectorConfig(provider);
      if (existingConfig) {
        if (provider === 'rss' && !Array.isArray(existingConfig.feeds)) {
          setConfig({ ...existingConfig, feeds: [] });
        } else {
          setConfig(existingConfig);
        }
      } else {
        setConfig({});
      }
      setSecret(""); // Reset secret field on load (write-only)
    } catch (err) {
      console.error("Failed to load config", err);
    } finally {
      setIsLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    if (isOpen && provider) {
      loadConfig();
    }
  }, [isOpen, provider, loadConfig]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const finalConfig = { ...config };
      
      // Ensure RSS feeds are an array
      if (provider === 'rss' && !Array.isArray(finalConfig.feeds)) {
        finalConfig.feeds = [];
      }

      await updateConnectorConfig(provider, finalConfig);
      
      if (secret) {
        if (provider === 'github') {
          await setConnectorSecret(provider, { pat: secret });
        } else if (provider === 'slack') {
          await setConnectorSecret(provider, { bot_token: secret });
        }
      }

      toast.success(`${title} configuration updated.`);
      onClose();
    } catch (err: any) {
      toast.error("Failed to save: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      let res: any;
      if (provider === 'rss') {
        const feeds = config.feeds || [];
        if (feeds.length === 0) throw new Error("Add at least one feed to test.");
        res = await testRssSync(feeds[0].url);
        if (res.ok) toast.success(`Validated ${feeds[0].title || 'Feed'}: ${res.itemCount} items found.`);
      } else if (provider === 'github') {
        if (!secret) throw new Error("Enter a PAT to test.");
        res = await testGitHubSync(secret);
        if (res.ok) toast.success(`GitHub Verified: Connected as ${res.username}. Scopes: ${res.scopes || 'none'}`);
      } else if (provider === 'slack') {
        if (!secret) throw new Error("Enter a Bot Token to test.");
        res = await testSlackSync(secret);
        if (res.ok) toast.success(`Slack Verified: Connected as ${res.bot} in ${res.team}`);
      } else {
        toast.info(`Pre-configured validation not yet available for ${provider}. Use Sync Now to verify.`);
        return;
      }

      if (res && !res.ok) {
        toast.error("Validation failed: " + (res.error || "Unknown error"));
      }
    } catch (err: any) {
      toast.error("Test failed: " + err.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const res = await triggerSync(provider);
      toast.success(`Sync triggered successfully. ${res.items_synced} items ingested.`);
    } catch (err: any) {
      toast.error("Sync failed: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(`Are you sure you want to disconnect ${title}? This will stop all ingestions.`)) return;
    try {
      await disconnectConnector(provider);
      toast.success(`${title} disconnected.`);
      onClose();
    } catch (err: any) {
      toast.error("Disconnect failed: " + err.message);
    }
  };

  const handleGoogleConnect = async () => {
    try {
      const res = await startGoogleOAuth(window.location.origin + "/oauth/google/callback");
      if (res.url) window.location.href = res.url;
    } catch (err: any) {
      toast.error("Failed to start OAuth: " + err.message);
    }
  };

  const renderFields = () => {
    if (isLoading) {
      return (
        <div className="h-40 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-6 h-6 text-[#5789FF] animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Retrieving Pipeline Config...</p>
        </div>
      );
    }

    switch (provider) {
      case "github":
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Personal Access Token</Label>
              <Input 
                type="password"
                placeholder="ghp_****************"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="sa-input-premium font-mono"
              />
              <p className="text-[9px] text-white/30 uppercase tracking-widest">Leave blank to keep existing token. Requires repo scopes.</p>
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Target Repositories</Label>
              <Input 
                placeholder="owner/repo, owner/another..."
                value={config.repos || ""}
                onChange={(e) => setConfig({ ...config, repos: e.target.value })}
                className="sa-input-premium"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ConfigToggle 
                label="Index PRs" 
                checked={config.index_prs} 
                onChange={(val) => setConfig({ ...config, index_prs: val })} 
              />
              <ConfigToggle 
                label="Issues" 
                checked={config.index_issues} 
                onChange={(val) => setConfig({ ...config, index_issues: val })} 
              />
              <ConfigToggle 
                label="Commits" 
                checked={config.index_commits} 
                onChange={(val) => setConfig({ ...config, index_commits: val })} 
              />
              <ConfigToggle 
                label="Drafts" 
                checked={config.include_drafts} 
                onChange={(val) => setConfig({ ...config, include_drafts: val })} 
              />
            </div>
          </div>
        );
      case "google":
        return (
          <div className="space-y-6">
            <div className="p-4 bg-[#5789FF]/5 border border-[#5789FF]/20 rounded-xl flex items-center justify-between">
              <div>
                 <p className="text-sm font-bold text-white">Google Account Access</p>
                 <p className="text-[10px] text-white/50">Required for Calendar & Gmail Sync</p>
              </div>
              <Button onClick={handleGoogleConnect} variant="outline" className="h-8 text-[10px] font-bold uppercase tracking-wider text-[#5789FF] border-[#5789FF]/30 hover:bg-[#5789FF]/10">
                 Grant Access
              </Button>
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Gmail Search Query</Label>
              <Input 
                placeholder="e.g. is:unread category:primary"
                value={config.query || ""}
                onChange={(e) => setConfig({ ...config, query: e.target.value })}
                className="sa-input-premium"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Included Labels</Label>
              <Input 
                placeholder="INBOX, IMPORTANT, WORK..."
                value={config.labels || ""}
                onChange={(e) => setConfig({ ...config, labels: e.target.value })}
                className="sa-input-premium"
              />
            </div>
          </div>
        );
      case "slack":
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Slack Bot Token</Label>
              <Input 
                type="password"
                placeholder="xoxb-****************"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="sa-input-premium font-mono"
              />
              <p className="text-[9px] text-white/30 uppercase tracking-widest">Leave blank to keep existing token.</p>
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Monitored Channels</Label>
              <Input 
                placeholder="#general, #dev-alerts..."
                value={config.channels || ""}
                onChange={(e) => setConfig({ ...config, channels: e.target.value })}
                className="sa-input-premium"
              />
            </div>
            <ConfigToggle 
              label="Only Mentioned Messages" 
              checked={config.mentions_only} 
              onChange={(val) => setConfig({ ...config, mentions_only: val })}
              description="Summarize messages only when you are explicitly @mentioned."
            />
          </div>
        );
      case "rss": {
        const currentFeeds = Array.isArray(config.feeds) ? config.feeds : [];
        const seedDefaultFeeds = () => {
          const defaults = [
            { url: "https://techcrunch.com/feed/", title: "TechCrunch" },
            { url: "https://news.ycombinator.com/rss", title: "Hacker News" },
            { url: "https://www.theverge.com/rss/index.xml", title: "The Verge" },
            { url: "https://wired.com/feed/rss", title: "Wired" },
            { url: "https://arstechnica.com/feed/", title: "Ars Technica" },
            { url: "https://feeds.bloomberg.com/technology/news.rss", title: "Bloomberg Tech" },
            { url: "https://www.cnbc.com/id/19854910/device/rss/rss.html", title: "CNBC Tech" },
            { url: "https://dev.to/feed", title: "DEV Community" },
            { url: "https://github.blog/feed/", title: "GitHub Blog" },
            { url: "https://aws.amazon.com/blogs/aws/feed/", title: "AWS Blog" }
          ];
          setConfig({ ...config, feeds: [...currentFeeds, ...defaults] });
          toast.success("Seeded 10 global tech feeds.");
        };
        
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-xl">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Configured Feeds</Label>
                <p className="text-sm font-bold text-white">{currentFeeds.length} Active Target(s)</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={seedDefaultFeeds} variant="outline" size="sm" className="h-8 text-[10px] font-bold text-emerald-400 border-emerald-400/20 hover:bg-emerald-400/10">Seed Defaults</Button>
                <Button onClick={() => setIsFeedModalOpen(true)} variant="outline" size="sm" className="h-8 text-[10px] font-bold text-[#5789FF] border-[#5789FF]/30 hover:bg-[#5789FF]/10">Manage Feeds</Button>
              </div>
            </div>
            
            <FeedManagementModal 
              isOpen={isFeedModalOpen} 
              onClose={() => setIsFeedModalOpen(false)} 
              feeds={currentFeeds} 
              onSave={(updated) => { setConfig({ ...config, feeds: updated }); setIsFeedModalOpen(false); }} 
              isSaving={false} 
            />
          </div>
        );
      }
      case "weather":
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">City, State or Country</Label>
              <Input 
                placeholder="e.g. San Francisco, CA"
                value={config.location || ""}
                onChange={(e) => setConfig({ ...config, location: e.target.value })}
                className="sa-input-premium"
              />
              <p className="text-[10px] text-white/40">Our servers will automatically geocode this location for accurate local forecasting.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ConfigToggle 
                label="Fahrenheit" 
                checked={config.units !== "celsius"} 
                onChange={(val) => setConfig({ ...config, units: val ? "fahrenheit" : "celsius" })} 
              />
            </div>
          </div>
        );
      default:
        return <p className="text-muted-foreground text-sm">Generic configuration for {title}.</p>;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="sa-card w-full max-w-xl p-0 relative animate-in zoom-in-95 duration-500 overflow-hidden shadow-[0_0_100px_rgba(87,137,255,0.1)]">
        <div className="p-10 space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-3xl font-extrabold tracking-tight text-white">{title}</h2>
              <div className="flex items-center gap-2">
                <Globe className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Endpoint Operational</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleDisconnect}
                className="w-10 h-10 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 flex items-center justify-center transition-colors group"
                title="Disconnect Connector"
              >
                <Trash2 className="w-5 h-5 text-rose-500/40 group-hover:text-rose-500" />
              </button>
              <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>
          </div>

          <div className="space-y-8 min-h-[300px]">
            {renderFields()}

            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-4 group">
              <div className={cn(
                "w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center transition-colors",
                isTesting || isSyncing ? "animate-spin" : "text-[#5789FF]"
              )}>
                 {isSyncing ? <RefreshCw className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                 <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Orchestration</span>
                 <p className="text-xs font-bold text-white/80">
                   {isSyncing ? "Ingesting active items..." : "Ready for validation"}
                 </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSyncNow}
                  disabled={isSyncing || isTesting || isSaving}
                  className="text-[10px] uppercase font-black tracking-widest text-[#5789FF] hover:bg-[#5789FF]/10"
                >
                  {isSyncing ? "Syncing..." : "Sync Now"}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleTest}
                  disabled={isTesting || isSyncing || isSaving}
                  className="text-[10px] uppercase font-black tracking-widest text-white/40 hover:text-white"
                >
                  {isTesting ? "Testing..." : "Test Connection"}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-white/5">
            <button onClick={onClose} className="text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">Cancel</button>
            <Button 
              onClick={handleSave}
              disabled={isSaving || isSyncing || isTesting}
              className="sa-button-primary h-14 px-10 rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-[0_10px_30px_rgba(87,137,255,0.3)]"
            >
              {isSaving ? "Saving Architecture..." : "Update Pipeline"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigToggle({ label, description, checked, onChange }: any) {
  return (
    <div className="flex items-start justify-between p-4 rounded-xl bg-black/20 border border-white/5 group hover:border-white/10 transition-all">
       <div className="space-y-1 pr-4">
          <p className="text-xs font-bold text-white group-hover:text-primary transition-colors">{label}</p>
          {description && <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>}
       </div>
       <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
