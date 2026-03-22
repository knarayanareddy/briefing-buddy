import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  RefreshCw,
  Github,
  Mail,
  Rss,
  Slack,
  BookOpen,
  Plus,
  Key,
  Loader2,
  Cloud
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/connectors/ConnectorCard";
import ConnectorCard from "@/components/connectors/ConnectorCard";
import SystemEvents, { OrchestrationHealth } from "@/components/connectors/DashboardPanels";
import ConfigModal from "@/components/connectors/ConfigModal";
import { getConnectorStatus, getUserSettings, triggerSync, type UserSettings } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { toast as sonnerToast } from "sonner";

export default function Connectors() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isConfigOpen, setIsConfigOpen] = React.useState(false);
  const [configTitle, setConfigTitle] = React.useState("");
  const [selectedProvider, setSelectedProvider] = React.useState<string | null>(null);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStatuses = async () => {
    try {
      const data = await getConnectorStatus();
      setStatuses(data || []);
      
      // Check for errors and toast if pref enabled
      if (settings?.notification_prefs?.edgeFailures) {
        const errored = data?.filter((s: any) => s.status === 'error');
        if (errored && errored.length > 0) {
          sonnerToast.error("Connector Fault Detected", { 
            description: `${errored.length} connector(s) reported execution failures.` 
          });
        }
      }
    } catch (err) {
      console.error("Failed to load connector statuses", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getUserSettings().then(setSettings).catch(() => {});
  }, []);

  useEffect(() => {
    if (settings) loadStatuses();
    // eslint-disable-next-line
  }, [settings]);

  const handleConfigure = (title: string, provider: string) => {
    setConfigTitle(title);
    setSelectedProvider(provider);
    setIsConfigOpen(true);
  };

  const handleSyncAction = async (provider: string) => {
    setIsLoading(true);
    try {
      const res = await triggerSync(provider);
      sonnerToast.success(`Sync successful`, { 
        description: `Ingested ${res.items_synced} items from ${provider}.` 
      });
      loadStatuses();
    } catch (err: any) {
      sonnerToast.error("Sync Failed", { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestAction = async (provider: string) => {
    // For simplicity, if they click test on the card, we open the config modal 
    // where they can see specific errors or provide missing credentials.
    handleConfigure(provider === 'rss' ? "Global Tech News" : provider.toUpperCase(), provider);
  };

  const getStatusForProvider = (provider: string) => {
    return statuses.find(s => s.provider === provider) || {
      status: 'missing',
      connected: false,
      last_success_at: null,
      last_run: null
    };
  };

  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const healthyCount = statuses.filter(s => s.status === 'active').length;
  const activeCount = statuses.filter(s => s.status !== 'missing').length || 4; 
  const errorCount = statuses.filter(s => s.status === 'error').length;
  const totalVolume = statuses.reduce((acc, curr) => acc + (curr.last_run?.items_upserted || 0), 0);

  return (
    <div className="px-10 py-8 space-y-12 animate-in fade-in duration-1000">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">Connectors</h1>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            Manage external integrations, data ingestion points, and secure vault credentials for your AI pipelines.
          </p>
        </div>
        <div className="flex items-center gap-4 pt-2">
          <Button onClick={() => navigate('/vault')} variant="outline" className="h-12 bg-white/5 border-white/10 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white/80 flex items-center gap-2 px-6">
            <Key className="w-4 h-4 text-[#5789FF]" />
            Manage Vault Secrets
          </Button>
          <Button className="sa-button-primary h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest px-8 shadow-[0_10px_20px_rgba(87,137,255,0.2)]">
            <Plus className="w-4 h-4 mr-2" /> Add Connector
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard 
          icon={CheckCircle2} 
          label="Total Healthy" 
          value={`${healthyCount}/${activeCount}`} 
          colorClass="bg-emerald-500/10 text-emerald-500 border-emerald-500/10" 
        />
        <StatCard 
          icon={AlertCircle} 
          label="Active Errors" 
          value={errorCount.toString().padStart(2, '0')} 
          colorClass="bg-rose-500/10 text-rose-500 border-rose-500/10" 
        />
        <StatCard 
          icon={Zap} 
          label="Avg Latency (Mock)" 
          value="124ms" 
          colorClass="bg-amber-500/10 text-amber-500 border-amber-500/10" 
        />
        <StatCard 
          icon={RefreshCw} 
          label="Total Items Upserted" 
          value={totalVolume > 1000 ? `${(totalVolume/1000).toFixed(1)}k` : totalVolume.toString()} 
          colorClass="bg-indigo-500/10 text-indigo-500 border-indigo-500/10" 
        />
      </div>

      {/* Connectors Grid */}
      {isLoading ? (
        <div className="h-[400px] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 text-[#5789FF] animate-spin" />
          <p className="text-[10px] uppercase font-black tracking-widest text-white/20">Initializing Ecosystem...</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-8">
          <ConnectorCard 
            icon={Github}
            iconBg="bg-white/10 text-white"
            title="GitHub Enterprise"
            description="Automated code reviews and PR analysis synchronization."
            status={getStatusForProvider('github').status === 'error' ? 'error' : (getStatusForProvider('github').connected ? 'healthy' : 'warning')}
            statusLabel={getStatusForProvider('github').status === 'error' ? 'Error' : (getStatusForProvider('github').connected ? 'Healthy' : 'Disconnected')}
            stats={[{label: 'Last Sync', value: formatRelativeTime(getStatusForProvider('github').last_run?.started_at)}, {label: 'Items', value: (getStatusForProvider('github').last_run?.items_upserted || 0).toString()}]}
            onConfigure={() => handleConfigure("GitHub Enterprise", "github")}
            onTest={() => handleTestAction("github")}
            onSync={() => handleSyncAction("github")}
          />
          <ConnectorCard 
            icon={Mail}
            iconBg="bg-blue-500/20 text-blue-400"
            title="Google Workspace"
            description="Semantic search over inbox, calendar events, and task triage."
            status={getStatusForProvider('google').status === 'error' ? 'error' : (getStatusForProvider('google').connected ? 'healthy' : 'warning')}
            statusLabel={getStatusForProvider('google').status === 'error' ? 'Error' : (getStatusForProvider('google').connected ? 'Connected' : 'Requires OAuth')}
            stats={[{label: 'Last Sync', value: formatRelativeTime(getStatusForProvider('google').last_run?.started_at)}, {label: 'Items', value: (getStatusForProvider('google').last_run?.items_upserted || 0).toString()}]}
            onConfigure={() => handleConfigure("Google Workspace", "google")}
            onSync={() => handleSyncAction("google")}
          />
          <ConnectorCard 
            icon={Rss}
            iconBg="bg-orange-500/20 text-orange-400"
            title="Global Tech News"
            description="Multi-source RSS feed for real-time market sentiment analysis."
            status={getStatusForProvider('rss').status === 'error' ? 'error' : (getStatusForProvider('rss').connected ? 'healthy' : 'warning')}
            statusLabel={getStatusForProvider('rss').status === 'error' ? 'Error' : (getStatusForProvider('rss').connected ? 'Healthy' : 'Needs Config')}
            stats={[{label: 'Last Sync', value: formatRelativeTime(getStatusForProvider('rss').last_run?.started_at)}, {label: 'Items', value: (getStatusForProvider('rss').last_run?.items_upserted || 0).toString()}]}
            onConfigure={() => handleConfigure("Global Tech News", "rss")}
            onTest={() => handleTestAction("rss")}
            onSync={() => handleSyncAction("rss")}
          />
          <ConnectorCard 
            icon={Slack}
            iconBg="bg-[#3EB489]/20 text-[#3EB489]"
            title="Slack Dev Hub"
            description="Relay pipeline alerts and receive human-in-the-loop approvals."
            status={getStatusForProvider('slack').status === 'error' ? 'error' : (getStatusForProvider('slack').connected ? 'healthy' : 'warning')}
            statusLabel={getStatusForProvider('slack').status === 'error' ? 'Error' : (getStatusForProvider('slack').connected ? 'Healthy' : 'Disconnected')}
            stats={[{label: 'Last Sync', value: formatRelativeTime(getStatusForProvider('slack').last_run?.started_at)}, {label: 'Items', value: (getStatusForProvider('slack').last_run?.items_upserted || 0).toString()}]}
            onConfigure={() => handleConfigure("Slack Dev Hub", "slack")}
            onTest={() => handleTestAction("slack")}
            onSync={() => handleSyncAction("slack")}
          />
          <ConnectorCard 
            icon={Cloud}
            iconBg="bg-cyan-500/20 text-cyan-400"
            title="Local Weather"
            description="Real-time geo-located forecasts from Open-Meteo."
            status={getStatusForProvider('weather').status === 'error' ? 'error' : (getStatusForProvider('weather').connected ? 'healthy' : 'warning')}
            statusLabel={getStatusForProvider('weather').status === 'error' ? 'Error' : (getStatusForProvider('weather').connected ? 'Healthy' : 'Needs Config')}
            stats={[{label: 'Last Sync', value: formatRelativeTime(getStatusForProvider('weather').last_run?.started_at)}, {label: 'Items', value: (getStatusForProvider('weather').last_run?.items_upserted || 0).toString()}]}
            onConfigure={() => handleConfigure("Local Weather", "weather")}
            onTest={() => handleTestAction("weather")}
            onSync={() => handleSyncAction("weather")}
          />
          <ConnectorCard 
            icon={BookOpen}
            iconBg="bg-gray-500/10 text-gray-500"
            title="Notion Knowledge Base"
            description="Vector indexing of technical documentation and internal wikis."
            status="disabled"
            statusLabel="Coming Soon"
            stats={[{label: 'Release', value: 'Q4'}, {label: 'Status', value: 'Alpha'}]}
          />
          
          {/* Integrate New Service Card */}
          <div className="sa-card p-10 border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-4 group transition-all opacity-50 cursor-not-allowed">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/20 transition-all">
               <Plus className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-white/40">Integrate New Service</h4>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest pl-2 pr-2">S3, Postgres, Twilio coming soon.</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer System Panels */}
      <div className="grid grid-cols-3 gap-8 pb-12">
        <div className="col-span-2">
          <SystemEvents />
        </div>
        <div className="col-span-1 space-y-8">
          <OrchestrationHealth />
          
          <div className="sa-card p-8 bg-gradient-to-br from-[#111928] to-black border-none relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-20%] w-[150px] h-[150px] bg-[#5789FF]/5 rounded-full blur-[40px] group-hover:bg-[#5789FF]/10 transition-all duration-700" />
            <div className="space-y-4 relative z-10">
              <h4 className="text-white font-bold text-lg">Vault Auto-Rotate</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Automatic credential rotation is enabled for supported connectors. Your security posture is automated.
              </p>
              <button onClick={() => navigate('/vault')} className="text-[10px] font-black uppercase tracking-widest text-[#5789FF] hover:underline flex items-center gap-2">
                Audit Vault Settings <Zap className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfigModal 
        isOpen={isConfigOpen} 
        onClose={() => {
          setIsConfigOpen(false);
          loadStatuses(); // Refresh after modal closes
        }} 
        title={configTitle} 
        provider={selectedProvider}
      />
    </div>
  );
}
