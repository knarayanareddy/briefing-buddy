import React from "react";
import { cn } from "@/lib/utils";
import { 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  RefreshCw,
  MoreVertical,
  Settings2,
  AlertTriangle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ConnectorCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  status: 'healthy' | 'warning' | 'error';
  statusLabel: string;
  stats: { label: string; value: string }[];
  onConfigure: () => void;
  iconBg?: string;
}

export default function ConnectorCard({ 
  icon: Icon, 
  title, 
  description, 
  status, 
  statusLabel, 
  stats, 
  onConfigure,
  iconBg = "bg-white/5"
}: ConnectorCardProps) {
  
  const statusColors = {
    healthy: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    warning: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    error: "text-rose-400 bg-rose-400/10 border-rose-400/20"
  };

  const statusDot = {
    healthy: "bg-emerald-400",
    warning: "bg-amber-400",
    error: "bg-rose-400"
  };

  return (
    <div className="sa-card p-8 group transition-all duration-300 hover:shadow-[0_0_40px_rgba(87,137,255,0.1)] relative overflow-hidden flex flex-col h-full">
      {/* Status Badge */}
      <div className="absolute top-6 right-6">
        <Badge className={cn("px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border", statusColors[status])}>
          <div className={cn("w-1.5 h-1.5 rounded-full mr-2", statusDot[status])} />
          {statusLabel}
        </Badge>
      </div>

      <div className="flex items-start gap-5 mb-6">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-inner border border-white/5", iconBg)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 pr-16">
          <h4 className="font-extrabold text-xl text-white tracking-tight -mb-1">{title}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-2">{description}</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 mb-8 pt-4 border-t border-white/5">
        {stats.map((stat, i) => (
          <div key={i} className="space-y-1">
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{stat.label}</span>
            <p className="text-xs font-bold text-white/90 tracking-wide">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-auto flex items-center gap-3">
        <Button 
          onClick={onConfigure}
          variant="outline" 
          className="flex-1 h-12 bg-white/[0.03] border-white/5 hover:bg-white/10 hover:border-white/10 text-white font-bold uppercase tracking-widest text-[10px] rounded-xl transition-all"
        >
          {status === 'error' ? 'Re-authenticate' : 'Configure'}
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className="w-12 h-12 bg-white/[0.03] border-white/5 hover:bg-white/10 rounded-xl"
        >
          {status === 'healthy' ? <MoreVertical className="w-4 h-4 text-white/40" /> : <Settings2 className="w-4 h-4 text-white/40" />}
        </Button>
      </div>
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, colorClass }: any) {
  return (
    <div className="sa-card p-6 flex items-center gap-6 group hover:translate-y-[-2px] transition-all duration-300">
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border border-white/5", colorClass)}>
        <Icon className="w-7 h-7" />
      </div>
      <div className="space-y-1">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{label}</span>
        <h3 className="text-2xl font-black text-white tracking-tight">{value}</h3>
      </div>
    </div>
  );
}
