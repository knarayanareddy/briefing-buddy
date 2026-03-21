import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  Settings2,
  ExternalLink,
  Github,
  Newspaper,
  Mail,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface ConnectorCardProps {
  type: "rss" | "github" | "gmail";
  title: string;
  description: string;
  status: "active" | "error" | "disconnected" | "syncing";
  lastSync?: string;
  error?: string;
  onSync: () => void;
  onManage: () => void;
  isSyncing: boolean;
  isDevMode: boolean;
  children?: React.ReactNode; 
}

const icons = {
  rss: Newspaper,
  github: Github,
  gmail: Mail
};

export default function ConnectorCard({
  type,
  title,
  description,
  status,
  lastSync,
  error,
  onSync,
  onManage,
  isSyncing,
  isDevMode,
  children
}: ConnectorCardProps) {
  const Icon = icons[type];

  return (
    <Card className="group overflow-hidden bg-card/40 border-border hover:border-primary/30 transition-all duration-300">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 shadow-lg shadow-black/20",
              status === "active" ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground border border-border"
            )}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "text-[10px] uppercase font-bold tracking-widest px-2 py-0.5",
              status === "active" && "text-emerald-500 border-emerald-500/20 bg-emerald-500/5",
              status === "error" && "text-destructive border-destructive/20 bg-destructive/5",
              status === "syncing" && "text-primary border-primary/20 bg-primary/5 animate-pulse"
            )}
          >
            {status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Last Sync
            </p>
            <p className="text-sm font-medium">
              {lastSync ? formatDistanceToNow(new Date(lastSync), { addSuffix: true }) : "Never"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> Strategy
            </p>
            <p className="text-sm font-medium">Incremental</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-destructive/5 border border-destructive/10 flex items-start gap-2 animate-in fade-in zoom-in-95">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-[11px] text-destructive leading-normal font-medium">
              {error}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button 
            className="flex-1 h-9 gap-2 shadow-inner" 
            onClick={onSync} 
            disabled={isSyncing || status === "disconnected"}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")} />
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>
          <Button 
            variant="outline" 
            className="h-9 gap-2 border-border hover:bg-muted"
            onClick={onManage}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Configure
          </Button>
        </div>
      </div>

      {isDevMode && children && (
        <div className="border-t border-border bg-muted/30 p-4 animate-in slide-in-from-top-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Settings2 className="w-3 h-3 text-primary" /> Developer Tools
          </p>
          {children}
        </div>
      )}
    </Card>
  );
}
