import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listHistory, type HistoryItem } from "@/lib/api";
import { format } from "date-fns";
import { 
  Archive, 
  Share2, 
  Search, 
  Bell, 
  Radio, 
  User,
  Activity,
  Zap,
  TrendingUp,
  Database,
  Cloud,
  Shield,
  MessageSquare,
  Sparkles,
  Link as LinkIcon,
  ChevronRight,
  ChevronDown,
  Play
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const MetricCard = ({ title, value, unit, children, footer, className }: any) => (
  <div className={cn("bg-[#111928] border border-white/5 rounded-2xl p-6 space-y-4", className)}>
    <div className="flex items-center justify-between">
      <h4 className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/30">{title}</h4>
      <div className="w-4 h-4 rounded bg-white/5 flex items-center justify-center border border-white/10">
         <Activity className="w-2.5 h-2.5 text-white/20" />
      </div>
    </div>
    <div className="flex items-baseline gap-2">
      <span className="text-4xl font-bold tracking-tight text-white">{value}</span>
      <span className="text-sm font-semibold text-white/40">{unit}</span>
    </div>
    {children}
    {footer && (
       <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{footer}</span>
       </div>
    )}
  </div>
);

const SourceClusterItem = ({ icon: Icon, title, subtitle }: any) => (
  <div className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all cursor-pointer group">
    <div className="flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
        <Icon className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-bold text-white/90 leading-tight">{title}</span>
        <span className="text-[10px] text-white/30 font-medium leading-tight mt-1">{subtitle}</span>
      </div>
    </div>
    <ChevronDown className="w-4 h-4 text-white/0 group-hover:text-white/20 -rotate-90 transition-all" />
  </div>
);

export default function YourBrief() {
  const [activeTab, setActiveTab] = useState("SUMMARY");
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  
  const navigate = useNavigate();
  const [latestBrief, setLatestBrief] = useState<HistoryItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listHistory(1).then(res => {
      if (res.items.length > 0) setLatestBrief(res.items[0]);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleAction = () => {
    if (latestBrief) {
      const sp = new URLSearchParams();
      sp.set("script_id", latestBrief.id);
      if (latestBrief.render_job?.id) sp.set("job_id", latestBrief.render_job.id);
      navigate(`/today?${sp.toString()}`);
    } else {
      navigate('/today');
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
    // Also trigger action on click of the player
    handleAction();
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0E14] text-white overflow-hidden p-8 gap-8 animate-in fade-in duration-700">
      
      {/* Header Info */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            LIVE BRIEFING • QUANTUM LOGISTICS
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-extrabold tracking-tighter text-white mb-2">
              {loading ? "Loading..." : (latestBrief?.title || (latestBrief ? "Morning Briefing" : "Welcome to Project Spark"))}
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              {loading ? "Fetching latest intel..." : (latestBrief ? `Generated ${format(new Date(latestBrief.created_at), "MMM d, h:mm a")}. Contains ${latestBrief.segments_count} segments.` : "No briefings yet. Time to generate your first.")}
            </p>
          </div>
          <div className="flex items-center gap-3">
             <Button 
                onClick={handleAction}
                className="sa-button-primary h-12 px-8 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2"
              >
               <Play className="w-4 h-4 fill-current" />
               {latestBrief ? "Play Latest" : "Generate & Render"}
             </Button>
          </div>
        </div>
      </div>      <div className="grid grid-cols-12 gap-10 flex-1 min-h-0">
        
        {/* Main Content Area */}
        <div className="col-span-9 flex flex-col gap-8 overflow-y-auto pr-6 scrollbar-hide">
          
          {/* Briefing Player */}
          <div 
            className="relative aspect-video rounded-[32px] bg-black overflow-hidden border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] group cursor-pointer"
            onClick={togglePlay}
          >
            {/* Real Video Component */}
            <video 
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover opacity-70"
              loop
              muted
              playsInline
              src="https://assets.mixkit.co/videos/preview/mixkit-abstract-form-of-blue-and-purple-dots-31742-large.mp4"
            />
            
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 via-transparent to-transparent pointer-events-none" />
            
            {/* Wave Visuals Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
               <div className="flex items-end gap-1.5 h-32">
                  {[...Array(60)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1.5 bg-[#5789FF]/60 rounded-full animate-pulse capitalize" 
                      style={{ 
                        height: isPlaying ? `${Math.random() * 80 + 20}%` : "12%", 
                        animationDelay: `${i * 0.03}s`,
                        transition: "height 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                      }}
                    />
                  ))}
               </div>
            </div>

            {/* Status Overlays */}
            <div className="absolute top-8 left-10 flex items-center gap-6 pointer-events-none">
                <div className="px-4 py-2 rounded-xl bg-black/60 backdrop-blur-xl border border-white/10 text-[10px] uppercase font-black tracking-[0.2em] text-white/90 shadow-2xl">
                    NODE FEED: HQ-SECURE-01
                </div>
            </div>

            <div className="absolute top-8 right-10 flex flex-col items-end gap-1.5 pointer-events-none text-right">
                <span className="text-[10px] uppercase font-black tracking-[0.2em] text-[#5789FF]">Security Protocol</span>
                <span className="text-[11px] font-mono font-black text-white/60">AES-256 LEVEL 4</span>
            </div>

            {/* Playback Controls */}
            <div className="absolute inset-x-0 bottom-0 p-10 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col gap-6 translate-y-4 group-hover:translate-y-0 transition-all duration-700">
               <div className="flex items-center gap-8">
                  <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.4)] hover:scale-105 transition-transform active:scale-95 duration-500">
                    {isPlaying ? (
                      <div className="flex gap-2">
                        <div className="w-2.5 h-8 bg-[#0B0E14] rounded-full" />
                        <div className="w-2.5 h-8 bg-[#0B0E14] rounded-full" />
                      </div>
                    ) : (
                      <Zap className="w-10 h-10 text-[#0B0E14] fill-current ml-1" />
                    )}
                  </div>
                  <div className="flex flex-col flex-1 gap-3">
                     <div className="flex justify-between items-end">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50">Synthesized Audio Stream</span>
                        <span className="text-[11px] font-mono font-bold text-white/80">04:12 / 12:45</span>
                     </div>
                     <div className="h-2 bg-white/10 flex-1 rounded-full overflow-hidden relative group/bar cursor-pointer">
                        <div 
                          className="absolute inset-y-0 left-0 bg-[#5789FF] rounded-full shadow-[0_0_20px_rgba(87,137,255,0.6)]" 
                          style={{ width: '38%' }}
                        />
                     </div>
                  </div>
               </div>
            </div>

            {/* Pause Overlay indicator */}
            {!isPlaying && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px] flex items-center justify-center transition-all duration-500">
                <div className="w-28 h-28 rounded-full border border-white/20 flex items-center justify-center bg-white/5 animate-in zoom-in duration-500">
                   <Zap className="w-12 h-12 text-white fill-white/10" />
                </div>
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-col gap-10">
            <div className="flex items-center gap-12 border-b border-white/5">
              {["SUMMARY", "KEY INSIGHTS", "GROUNDING SOURCES", "TRANSCRIPT"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "pb-5 text-[12px] font-black uppercase tracking-[0.2em] transition-all relative",
                    activeTab === tab ? "text-white" : "text-white/30 hover:text-white/60"
                  )}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 animate-in fade-in slide-in-from-bottom-1 duration-500" />
                  )}
                </button>
              ))}
            </div>

            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                    <Sparkles className="w-5 h-5 text-[#5789FF]" />
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight">Executive Summary</h3>
               </div>
               <div className="space-y-6 max-w-4xl">
                  <p className="text-lg text-white/60 leading-relaxed font-medium">
                    The Q3 infrastructure briefing highlights a critical 12% optimization in data routing across the Northern European sector. AI-driven load balancing has successfully mitigated potential latency spikes during peak transaction hours, ensuring seamless operation for high-frequency trading clusters.
                  </p>
                  <p className="text-lg text-white/60 leading-relaxed font-medium">
                    Preliminary analysis suggests that current throughput exceeds forecasts by 8.4%. This surplus capacity is being dynamically reallocated to enhance real-time threat detection patterns without impacting core responsiveness.
                  </p>
               </div>
            </div>
          </div>
        </div>

        {/* Sidebar / Stats Panel */}
        <div className="col-span-3 flex flex-col gap-8 h-full">
          
          <MetricCard title="Node Performance" value="42.8" unit="Tflops" footer="Optimal">
             <div className="flex items-center gap-6 pt-2">
                <div className="flex-1 flex flex-col gap-1">
                   <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-[#5789FF] rounded-full" style={{ width: '85%' }} />
                   </div>
                   <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.1em]">Processing Load</span>
                </div>
                <div className="flex items-end gap-1 h-10">
                   {[...Array(6)].map((_, i) => (
                     <div 
                       key={i} 
                       className="w-1.5 bg-white/10 rounded-sm" 
                       style={{ height: `${30 + (i * 20) % 70}%` }}
                     />
                   ))}
                </div>
             </div>
          </MetricCard>

          <section className="space-y-6 pt-4">
            <h3 className="text-[10px] uppercase font-black tracking-[0.2em] text-white/30">Source Clusters</h3>
            <div className="space-y-3">
              <SourceClusterItem icon={Database} title="Financial Ledger 09" subtitle="Market Data Node" />
              <SourceClusterItem icon={Cloud} title="Cloud Mesh V4" subtitle="Latency Reporting" />
              <SourceClusterItem icon={Shield} title="Risk Mitigator AI" subtitle="Threat Intelligence" />
            </div>
          </section>

          <MetricCard title="Synthetix Confidence" value="98.4" unit="%" className="mt-auto">
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-black text-[#5789FF] uppercase tracking-widest">+0.2% variance</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-white rounded-full" style={{ width: '94%' }} />
                </div>
             </div>
          </MetricCard>

        </div>
      </div>
    </div>
  );
}
