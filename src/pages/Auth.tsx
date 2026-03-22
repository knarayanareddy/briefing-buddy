import React, { useState } from "react";
import { 
  Shield, 
  Mail, 
  ArrowRight, 
  Terminal, 
  Lock, 
  AlertTriangle, 
  Globe, 
  Database,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDevMode } from "@/lib/devMode";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toggleDevMode } = useDevMode();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your work email");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      toast.success("Secure login code sent to your email");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBypass = () => {
    toggleDevMode();
    toast.info("Technical Preview Mode Enabled");
    navigate("/today");
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0E14] flex flex-col items-center justify-center p-6 relative overflow-hidden font-outfit">
      
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#5789FF]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#3B5BFF]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Left: Build Info */}
      <div className="absolute top-10 right-10 flex flex-col items-end opacity-20">
         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">V1.0.4 Production Build</span>
      </div>

      {/* Brand Header */}
      <div className="mb-12 flex flex-col items-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-1000">
         <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#5789FF]/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="grid grid-cols-2 gap-1.5 p-3">
               <div className="w-2.5 h-2.5 rounded-full bg-[#5789FF]" />
               <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
               <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
               <div className="w-2.5 h-2.5 rounded-full bg-[#5789FF]" />
            </div>
         </div>
         <div className="text-center space-y-1">
            <h1 className="text-3xl font-black text-white tracking-[0.2em] uppercase">Synthetix</h1>
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Orchestration Console</p>
         </div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-[460px] sa-card p-12 bg-white/[0.02] border border-white/5 rounded-[32px] shadow-[0_40px_100px_rgba(0,0,0,0.6)] space-y-10 animate-in zoom-in-95 duration-700">
         <div className="space-y-2">
            <h2 className="text-2xl font-black text-white tracking-tight">Welcome Back</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">Enter your email to receive a secure login code.</p>
         </div>

         <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2.5">
               <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Work Email Address</label>
               <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <Input 
                    type="email"
                    placeholder="name@company.com"
                    className="h-14 pl-14 bg-black/40 border-white/10 rounded-2xl text-sm focus:border-[#5789FF]/30 transition-all placeholder:text-white/10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
               </div>
            </div>

            <Button 
              type="submit" 
              className="sa-button-primary w-full h-14 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-[0_15px_35px_rgba(87,137,255,0.2)] group"
              disabled={isLoading}
            >
              {isLoading ? "Verifying Identity..." : "Send Code"}
              <ArrowRight className="w-4 h-4 ml-3 group-hover:translate-x-1 transition-transform" />
            </Button>
         </form>

         <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
            <span className="relative px-6 bg-transparent text-[10px] font-black text-white/10 uppercase tracking-widest">or</span>
         </div>

         <Button 
           variant="outline"
           onClick={handleBypass}
           className="w-full h-14 bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest gap-3 transition-all"
         >
           <Terminal className="w-4 h-4 text-[#5789FF]" />
           Dev Mode Bypass
         </Button>

         {/* Technical Preview Notice */}
         <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex gap-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500/80">Technical Preview Notice</h4>
               <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Bypassing authentication provides a read-only environment. Data persistence is disabled and specific orchestration hooks are simulated.
               </p>
            </div>
         </div>
      </div>

      {/* Global Metadata Footer */}
      <div className="absolute bottom-10 left-10 right-10 flex justify-between items-center animate-in fade-in duration-1000">
         <div className="flex gap-16">
            <div className="flex items-center gap-10">
               <button className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors">System Status</button>
               <button className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors">Security Policy</button>
            </div>
         </div>

         <div className="flex items-center gap-12">
            <div className="flex flex-col items-end">
               <span className="text-[8px] font-black text-white/10 uppercase tracking-widest">Instance</span>
               <span className="text-[10px] font-bold text-white/40 uppercase">SYN-CORE-ALPHA-4</span>
            </div>
            <div className="flex flex-col items-end">
               <span className="text-[8px] font-black text-white/10 uppercase tracking-widest">Region</span>
               <span className="text-[10px] font-bold text-white/40 uppercase">US-EAST-GLOBAL</span>
            </div>
            <div className="h-10 w-px bg-white/10 mx-2" />
            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10 shadow-lg">
               <div className="w-2 h-2 rounded-full bg-[#5789FF] shadow-[0_0_10px_rgba(87,137,255,0.5)] animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Secure Connection</span>
            </div>
         </div>
      </div>
    </div>
  );
}
