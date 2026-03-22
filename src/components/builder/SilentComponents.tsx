import React from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  title: string;
  description?: string;
  active?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}

export const ProfileCard = ({ title, description, active, onClick }: CardProps) => (
  <div 
    onClick={onClick}
    className={cn(
      "p-5 rounded-2xl cursor-pointer transition-all duration-300 group relative border",
      active 
        ? "bg-[#111928]/80 border-[#5789FF]/50 shadow-[0_0_20px_rgba(87,137,255,0.1)] sticky" 
        : "bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]"
    )}
  >
    <div className="flex items-start gap-4">
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
        active ? "bg-[#5789FF]/20 text-[#5789FF]" : "bg-white/5 text-muted-foreground group-hover:text-white"
      )}>
        <title className="text-lg font-bold">👤</title>
      </div>
      <div className="flex-1 space-y-1">
        <h4 className={cn("font-bold transition-colors", active ? "text-white" : "text-white/60 group-hover:text-white")}>
          {title}
        </h4>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </div>
    {active && <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#5789FF]" />}
  </div>
);

export const TokenStatus = ({ used, total }: { used: number, total: number }) => {
  const percent = Math.min(100, (used / total) * 100);
  return (
    <div className="space-y-4 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#5789FF] animate-pulse" />
          <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">System Status</span>
        </div>
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Synced</span>
      </div>
      
      <div className="space-y-3">
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#5789FF] to-[#3B5BFF] transition-all duration-1000"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] font-bold tracking-widest uppercase">
          <span className="text-muted-foreground">Token Usage</span>
          <span className="text-white">{percent.toFixed(0)}% ({used.toLocaleString()}/{total.toLocaleString()})</span>
        </div>
      </div>
    </div>
  );
};
