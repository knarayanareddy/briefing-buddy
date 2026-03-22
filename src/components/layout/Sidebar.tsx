import React from "react";
import { cn } from "@/lib/utils";
import { 
  FileText,
  Zap,
  Network,
  Lock,
  Settings,
  Plus,
  Box
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const SidebarItem = ({ icon: Icon, label, href, active }: any) => (
  <Link 
    to={href}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
      active 
        ? "bg-white/5 text-white shadow-[0_0_20px_rgba(87,137,255,0.15)]" 
        : "text-muted-foreground hover:text-white hover:bg-white/5"
    )}
  >
    <Icon className={cn("w-5 h-5 transition-colors", active ? "text-[#5789FF]" : "group-hover:text-white")} />
    <span className="font-medium text-sm">{label}</span>
    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#5789FF] rounded-r-full" />}
  </Link>
);

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 h-full bg-[#0B0E14] border-r border-white/5 flex flex-col p-6 animate-in slide-in-from-left duration-700">
      {/* Brand */}
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-8 h-8 rounded-lg bg-[#5789FF]/20 flex items-center justify-center border border-[#5789FF]/30">
          <Box className="w-5 h-5 text-[#5789FF]" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-sm font-bold tracking-tight text-white leading-tight">
            Silent Architect
          </h1>
          <p className="text-[9px] uppercase font-black tracking-[0.2em] text-muted-foreground opacity-50">
            AI ORCHESTRATION
          </p>
        </div>
      </div>

      {/* Primary Action */}
      <div className="mb-10 px-2">
        <Button className="w-full sa-button-primary rounded-xl py-6 flex items-center justify-start gap-3 group px-4">
          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
          <span className="font-bold text-sm">New Brief</span>
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 space-y-1">
        <SidebarItem 
          icon={FileText} 
          label="Your Brief" 
          href="/brief" 
          active={location.pathname === "/brief"} 
        />
        <SidebarItem 
          icon={Zap} 
          label="Builder" 
          href="/builder" 
          active={location.pathname === "/builder"} 
        />
        <SidebarItem 
          icon={Network} 
          label="Connectors" 
          href="/connectors" 
          active={location.pathname === "/connectors"} 
        />
        <SidebarItem 
          icon={Lock} 
          label="Vault" 
          href="/vault" 
          active={location.pathname === "/vault"} 
        />
        <SidebarItem 
          icon={Settings} 
          label="Settings" 
          href="/settings" 
          active={location.pathname === "/settings"} 
        />
      </div>

      {/* User Profile Footer */}
      <div className="mt-auto pt-6 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-1 group cursor-pointer">
          <Avatar className="w-10 h-10 border border-white/10 ring-2 ring-transparent group-hover:ring-[#5789FF]/20 transition-all">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback className="bg-white/5 text-[10px]">JV</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-white truncate">Julian Vane</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium opacity-70">Principal Architect</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
