import React from "react";
import { 
  Bell, 
  ShieldCheck, 
  Rocket,
  User,
  Power,
  ChevronDown,
  RefreshCw,
  Search,
  Radio
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDevMode } from "@/lib/devMode";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

export default function AppHeader({ onSync }: { onSync: () => void }) {
  const { isDevMode, toggleDevMode } = useDevMode();
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
  }, []);

  return (
    <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[#0B0E14]/50 backdrop-blur-md sticky top-0 z-50">
      <div className="flex-1 flex items-center justify-center max-w-xl mx-auto order-2">
        <div className="relative w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-[#5789FF] transition-colors" />
          <input 
            type="text" 
            placeholder="Search insights..." 
            className="w-full bg-white/5 border border-white/5 h-11 pl-12 pr-4 rounded-xl text-sm focus:outline-none focus:border-[#5789FF]/30 focus:bg-white/10 transition-all placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-6 order-1">
        {/* Subtle Brand or Page Title */}
        <div className="flex items-center gap-2 text-white/40">
           <Radio className="w-4 h-4 text-indigo-500 animate-pulse" />
           <span className="text-[10px] uppercase font-black tracking-[0.2em]">Quantum Logistics</span>
        </div>
      </div>

      <div className="flex items-center gap-6 order-3">
        <div className="flex items-center gap-4 pr-6 border-r border-white/10">
          <button className="text-white/40 hover:text-white transition-colors relative">
            <Bell className="w-5 h-5" />
            <div className="absolute top-0 right-0 w-2 h-2 bg-indigo-500 rounded-full border-2 border-[#0B0E14]" />
          </button>
          <button className="text-white/40 hover:text-white transition-colors">
            <Radio className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Briefing Engine</span>
           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <button className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 hover:border-white/20 transition-all">
                  <User className="w-5 h-5 text-white/60" />
               </button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end" className="sa-card border-white/10 text-white p-2">
               <div className="px-2 py-1.5 text-xs text-muted-foreground uppercase font-bold tracking-widest">Account</div>
               <DropdownMenuItem className="focus:bg-white/5 focus:text-white cursor-pointer rounded-lg">
                 Profile Settings
               </DropdownMenuItem>
               <DropdownMenuSeparator className="bg-white/5" />
               <DropdownMenuItem 
                 onClick={() => supabase.auth.signOut()}
                 className="text-red-400 focus:bg-red-400/10 focus:text-red-400 cursor-pointer rounded-lg flex items-center gap-2"
               >
                 <Power className="w-4 h-4" />
                 Sign Out
               </DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
