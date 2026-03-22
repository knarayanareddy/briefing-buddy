import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  listHistory, type HistoryItem, 
  getBriefing, getBriefingArtifacts, getBriefingSources, archiveBriefing
} from "@/lib/api";
import { format } from "date-fns";
import { 
  Archive, Share2, Search, Bell, Radio, User, Activity, Zap, TrendingUp,
  Database, Cloud, Shield, MessageSquare, Sparkles, Link as LinkIcon, 
  ChevronRight, ChevronDown, Play, FileText, CheckCircle2, Loader2, Github, Mail, Rss, RefreshCw, Clock, Copy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const getProviderIcon = (provider: string) => {
  switch (provider) {
    case 'github': return Github;
    case 'slack': return MessageSquare;
    case 'google': return Mail;
    case 'rss': return Rss;
    case 'weather': return Cloud;
    default: return Database;
  }
};

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

const SourceClusterItem = ({ provider, title, subtitle, url, segmentsCount }: any) => {
  const Icon = getProviderIcon(provider);
  return (
    <div 
      onClick={() => url && window.open(url, "_blank")}
      className={cn(
        "flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 transition-all group",
        url ? "hover:bg-white/[0.04] cursor-pointer" : ""
      )}
    >
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
          <Icon className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white/90 leading-tight line-clamp-1">{title}</span>
          <span className="text-[10px] text-white/30 font-medium leading-tight mt-1 truncate max-w-[200px]">{subtitle}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {segmentsCount > 0 && (
          <div className="px-2 py-1 rounded bg-white/5 text-[9px] font-black text-white/40 tracking-widest uppercase">
            {segmentsCount} Ref
          </div>
        )}
        {url && <ChevronDown className="w-4 h-4 text-white/0 group-hover:text-white/20 -rotate-90 transition-all" />}
      </div>
    </div>
  );
};

export default function YourBrief() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("SUMMARY");
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  
  // Selection and History State
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  
  // Content State
  const [scriptJson, setScriptJson] = useState<any>(null);
  const [artifacts, setArtifacts] = useState<any>(null);
  const [sourcesData, setSourcesData] = useState<any>({ sources: [], missing_source_ids: [] });

  const selectedBrief = historyItems.find(h => h.id === selectedScriptId) || null;

  // 1. Fetch History List
  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await listHistory(25, 0, includeArchived);
      setHistoryItems(res.items);

      // Determine selection if not set, or if current selection is invalid
      let targetId = selectedScriptId;
      const urlScriptId = searchParams.get("script_id");

      if (urlScriptId && res.items.some(i => i.id === urlScriptId)) {
        targetId = urlScriptId;
      } else if (!targetId || !res.items.some(i => i.id === targetId)) {
        const cached = localStorage.getItem("selected_briefing_script_id");
        if (cached && res.items.some(i => i.id === cached && !i.archived)) {
          targetId = cached;
        } else {
          // Fallback to the latest non-archived
          const latestNonArchived = res.items.find(i => !i.archived);
          targetId = latestNonArchived?.id || (res.items.length > 0 ? res.items[0].id : null);
        }
      }

      if (targetId !== selectedScriptId) {
        handleScriptSelect(targetId);
      }
    } catch (err: any) {
      toast({ title: "Failed to load history", description: err.message });
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line
  }, [includeArchived]);

  // 2. Fetch specific Briefing Content when Selection changes
  useEffect(() => {
    if (!selectedScriptId) {
      setScriptJson(null);
      setArtifacts(null);
      setSourcesData({ sources: [], missing_source_ids: [] });
      return;
    }

    let isMounted = true;
    const fetchContent = async () => {
      try {
        setIsSwitching(true);
        const [scriptRes, artRes, srcRes] = await Promise.all([
          getBriefing(selectedScriptId),
          getBriefingArtifacts(selectedScriptId).catch(() => ({ error: true })),
          getBriefingSources(selectedScriptId).catch(() => ({ sources: [], missing_source_ids: [] }))
        ]);

        if (isMounted) {
          setScriptJson(scriptRes.script?.script_json || null);
          setArtifacts(artRes);
          setSourcesData(srcRes);
        }
      } catch (err: any) {
        if (isMounted) toast({ title: "Failed to load content", description: err.message });
      } finally {
        if (isMounted) setIsSwitching(false);
      }
    };

    fetchContent();
    return () => { isMounted = false; };
  }, [selectedScriptId, toast]);

  const handleScriptSelect = (id: string | null) => {
    setSelectedScriptId(id);
    if (id) {
      localStorage.setItem("selected_briefing_script_id", id);
      // clean url
      if (searchParams.has("script_id")) {
         navigate('/brief', { replace: true });
      }
    } else {
      localStorage.removeItem("selected_briefing_script_id");
    }
  };

  const selectLatestNonArchived = () => {
    const latest = historyItems.find(i => !i.archived);
    if (latest) handleScriptSelect(latest.id);
  };

  const handleAction = () => {
    if (selectedBrief) {
      const sp = new URLSearchParams();
      sp.set("script_id", selectedBrief.id);
      if (selectedBrief.render_job?.id) sp.set("job_id", selectedBrief.render_job.id);
      navigate(`/today?${sp.toString()}`);
    } else {
      navigate('/today');
    }
  };

  const handleArchive = async () => {
    if (!selectedBrief) return;
    try {
      await archiveBriefing(selectedBrief.id);
      toast({ title: "Briefing Archived", description: "Successfully removed from active history." });
      
      // Remove from visual list locally to prevent jump, then refetch
      setHistoryItems(prev => prev.filter(i => i.id !== selectedBrief.id));
      const remaining = historyItems.filter(i => i.id !== selectedBrief.id && !i.archived);
      handleScriptSelect(remaining.length > 0 ? remaining[0].id : null);
      
      fetchHistory(); // sync
    } catch (err: any) {
      toast({ title: "Failed to archive", description: err.message, variant: "destructive" });
    }
  };

  const handleDistribute = () => {
    if (!selectedBrief) return;
    const sp = new URLSearchParams();
    sp.set("script_id", selectedBrief.id);
    if (selectedBrief.render_job?.id) sp.set("job_id", selectedBrief.render_job.id);
    
    // Copy the replay deep link
    const url = `${window.location.origin}/today?${sp.toString()}`;
    navigator.clipboard.writeText(url);
    toast({ 
      title: "Link Copied", 
      description: "Replay link has been copied successfully.",
      duration: 4000
    });
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
    handleAction();
  };

  if (loadingHistory && historyItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0B0E14]">
         <div className="flex flex-col items-center gap-4 opacity-50">
           <Loader2 className="w-8 h-8 text-[#5789FF] animate-spin" />
           <span className="text-[10px] uppercase tracking-widest text-white/80 font-bold">Synchronizing Vault...</span>
         </div>
      </div>
    );
  }

  if (historyItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 h-full bg-[#0B0E14]">
        <div className="sa-card max-w-lg w-full p-12 flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
             <FileText className="w-10 h-10 text-white/20" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">No Briefings Yet</h2>
          <p className="text-white/60 leading-relaxed max-w-md">
            Your intelligence pipeline hasn't generated any briefings. Start your day by rendering your first automated executive summary.
          </p>
          <Button onClick={() => navigate('/today')} className="sa-button-primary mt-4 h-14 px-10 rounded-xl font-bold text-sm">
            Initialize Briefing
          </Button>
        </div>
      </div>
    );
  }

  // Derive counts dynamically for currently selected script
  const segments = scriptJson?.timeline_segments || [];
  const segmentsCount = segments.length;
  const sourcesCount = Object.keys(
    segments.reduce((acc: any, s: any) => {
      if (s.grounding_source_id) {
        s.grounding_source_id.split(',').forEach((i: string) => acc[i.trim()] = true);
      }
      return acc;
    }, {})
  ).length;

  const getSegmentRefs = (sourceId: string) => {
    const refs: number[] = [];
    segments.forEach((seg: any) => {
      if (seg.grounding_source_id?.includes(sourceId)) {
        refs.push(seg.segment_id);
      }
    });
    return refs;
  };

  const renderStatusBadge = (job: any) => {
    if (!job) return <Badge variant="outline" className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 text-[9px] uppercase font-black ml-2">No Job</Badge>;
    switch (job.status) {
      case 'complete': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] uppercase font-black ml-2">Rendered</Badge>;
      case 'failed': return <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[9px] uppercase font-black ml-2">Failed</Badge>;
      default: return <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[9px] uppercase font-black ml-2">Rendering</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0E14] text-white overflow-hidden p-8 gap-8 animate-in fade-in duration-700">
      
      {/* Top Banner & Selector */}
      <div className="flex items-center justify-between pointer-events-auto bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
         <div className="flex items-center gap-4">
           <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
             <Clock className="w-4 h-4 text-indigo-400" />
           </div>
           
           <div className="flex flex-col min-w-[300px]">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Select Historical Brief</span>
             <Select value={selectedScriptId || ""} onValueChange={handleScriptSelect}>
               <SelectTrigger className="w-[450px] bg-black/40 border-white/10 h-10 focus:ring-0 focus:ring-offset-0 text-sm font-semibold selection:bg-indigo-500/30">
                 <SelectValue placeholder="Select a briefing..." />
               </SelectTrigger>
               <SelectContent className="bg-[#111928] border-white/10">
                 {historyItems.map((item) => (
                   <SelectItem key={item.id} value={item.id} className="focus:bg-white/5 cursor-pointer">
                     <div className="flex items-center justify-between w-[400px]">
                       <span className={cn("font-medium", item.archived ? "text-white/40 line-through decoration-white/20" : "text-white/90")}>
                         {item.profile_name || item.persona} — {format(new Date(item.created_at), "MMM d, h:mm a")}
                       </span>
                       <div className="flex items-center gap-2 shrink-0">
                         {item.trigger === 'scheduled' && <Badge variant="outline" className="text-[9px] uppercase">SCHED</Badge>}
                         {renderStatusBadge(item.render_job)}
                       </div>
                     </div>
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
           
           <Button variant="ghost" size="icon" className="h-10 w-10 text-white/40 hover:text-white" onClick={fetchHistory}>
             <RefreshCw className={cn("w-4 h-4", loadingHistory && "animate-spin")} />
           </Button>

           <Button variant="outline" size="sm" onClick={selectLatestNonArchived} className="h-10 bg-white/5 hover:bg-white/10 border-white/10 text-xs font-bold px-4">
              Jump to Latest
           </Button>
         </div>

         <div className="flex items-center gap-3 pr-4">
           <Switch checked={includeArchived} onCheckedChange={setIncludeArchived} id="include-archived" />
           <label htmlFor="include-archived" className="text-xs font-semibold text-white/50 cursor-pointer hover:text-white/80 transition-colors">
              Include Archived
           </label>
         </div>
      </div>

      {!selectedBrief ? (
        <div className="flex-1 flex items-center justify-center opacity-50">
           <span className="text-sm font-medium">Please select a briefing from the vault.</span>
        </div>
      ) : (
        <>
          {/* Header Info */}
          <div className="flex flex-col gap-2 relative">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                LIVE BRIEFING • {selectedBrief.profile_name || selectedBrief.persona.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between pointer-events-auto">
              <div>
                <h1 className="text-5xl font-extrabold tracking-tighter text-white mb-2">
                  {selectedBrief.title || "Executive Briefing"} {selectedBrief.archived && <span className="text-2xl text-rose-500 ml-2">(ARCHIVED)</span>}
                </h1>
                <p className="text-muted-foreground text-sm font-medium">
                  {isSwitching ? "Syncing nodes..." : `Synthesized from ${sourcesCount} source nodes`} • Generated {format(new Date(selectedBrief.created_at), "MMM d, h:mm a")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                 <Button 
                    onClick={handleArchive}
                    variant="outline"
                    disabled={selectedBrief.archived}
                    className="h-12 border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl text-xs font-bold px-6 disabled:opacity-30"
                 >
                   <Archive className="w-4 h-4 mr-2" />
                   Archive
                 </Button>
                 <Button 
                    onClick={handleDistribute}
                    variant="outline"
                    className="h-12 border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl text-xs font-bold px-6"
                 >
                   <Share2 className="w-4 h-4 mr-2" />
                   Distribute
                 </Button>
                 <Button 
                    onClick={handleAction}
                    className="sa-button-primary h-12 px-8 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2"
                  >
                   <Play className="w-4 h-4 fill-current" />
                   Play Selected
                 </Button>
              </div>
            </div>
          </div>      
          
          <div className="grid grid-cols-12 gap-10 flex-1 min-h-0 relative">
            
            {/* Main Content Area */}
            <div className="col-span-9 flex flex-col gap-8 overflow-y-auto pr-6 scrollbar-hide">
              
              {/* Briefing Player Mockup / Hotlink */}
              <div 
                className="relative aspect-video rounded-[32px] bg-black overflow-hidden border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] group cursor-pointer shrink-0"
                onClick={togglePlay}
              >
                <video 
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover opacity-70"
                  loop
                  muted
                  playsInline
                  src="https://assets.mixkit.co/videos/preview/mixkit-abstract-form-of-blue-and-purple-dots-31742-large.mp4"
                />
                
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 via-transparent to-transparent pointer-events-none" />
                
                <div className="absolute inset-x-0 bottom-0 p-10 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col gap-6 translate-y-4 group-hover:translate-y-0 transition-all duration-700">
                   <div className="flex items-center gap-8">
                      <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.4)] hover:scale-105 transition-transform active:scale-95 duration-500">
                        <Zap className="w-10 h-10 text-[#0B0E14] fill-current ml-1" />
                      </div>
                      <div className="flex flex-col flex-1 gap-3">
                         <div className="flex justify-between items-end">
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50">Synthesized Audio Stream</span>
                            <span className="text-[11px] font-mono font-bold text-white/80">{segmentsCount} Segments</span>
                         </div>
                         <div className="h-2 bg-white/10 flex-1 rounded-full overflow-hidden relative group/bar">
                            <div className="absolute inset-y-0 left-0 bg-[#5789FF] rounded-full shadow-[0_0_20px_rgba(87,137,255,0.6)]" style={{ width: '10%' }} />
                         </div>
                      </div>
                   </div>
                </div>
                
                {!isPlaying && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px] flex items-center justify-center transition-all duration-500">
                    <div className="w-28 h-28 rounded-full border border-white/20 flex items-center justify-center bg-white/5 animate-in zoom-in duration-500">
                       <Play className="w-12 h-12 text-white fill-white ml-2" />
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Tabs */}
              <div className="flex flex-col gap-10 pb-20">
                <div className="flex items-center gap-12 border-b border-white/5 sticky top-0 bg-[#0B0E14] z-10 pt-2">
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

                {isSwitching ? (
                  <div className="space-y-4 animate-pulse opacity-40 py-8">
                     <div className="h-4 bg-white/20 rounded-full w-3/4 max-w-2xl"></div>
                     <div className="h-4 bg-white/10 rounded-full w-full max-w-3xl"></div>
                     <div className="h-4 bg-white/10 rounded-full w-5/6 max-w-xl"></div>
                  </div>
                ) : (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[300px]">
                     {activeTab === "SUMMARY" && (
                       <>
                         <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                             <Sparkles className="w-5 h-5 text-[#5789FF]" />
                           </div>
                           <h3 className="text-2xl font-black text-white tracking-tight">Executive Summary</h3>
                         </div>
                         {artifacts?.error ? (
                            <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
                               Summary generation unavailable for this content. See Transcript for raw segments.
                            </div>
                         ) : (
                           <div className="space-y-6 max-w-4xl">
                             {artifacts?.summary_paragraphs?.map((p: string, idx: number) => (
                               <p key={idx} className="text-lg text-white/70 leading-relaxed font-medium">
                                 {p}
                               </p>
                             ))}
                             {(!artifacts || !artifacts.summary_paragraphs) && (
                               <p className="text-white/40 italic">Summary artifacts resolving...</p>
                             )}
                           </div>
                         )}
                       </>
                     )}

                     {activeTab === "KEY INSIGHTS" && (
                       <div className="space-y-6">
                           {artifacts?.error ? (
                              <p className="text-rose-400 font-medium">No automated insights available.</p>
                           ) : (
                              <>
                                {artifacts?.key_insights?.map((insight: any, idx: number) => (
                                  <div key={idx} className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col gap-4 group">
                                    <div className="flex gap-4 items-start">
                                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                      <p className="text-base font-semibold text-white/90 leading-relaxed">{insight.text}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pl-9">
                                      {insight.segment_ids?.map((id: number) => (
                                        <Badge key={id} variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px] uppercase font-black cursor-pointer hover:bg-indigo-500/20"
                                          onClick={() => { setActiveTab("TRANSCRIPT"); }}
                                        >
                                          SEG {String(id).padStart(2, '0')}
                                        </Badge>
                                      ))}
                                      {insight.source_ids?.map((src: string) => (
                                        <Badge key={src} variant="outline" className="bg-white/5 text-white/40 border-white/10 text-[10px] lowercase cursor-pointer hover:bg-white/10"
                                          onClick={() => { setActiveTab("GROUNDING SOURCES"); }}
                                        >
                                          {src.split(':')[0]} source
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                                {(!artifacts || !artifacts.key_insights?.length) && (
                                   <p className="text-white/40 italic">Key insights pending analysis...</p>
                                )}
                              </>
                           )}
                       </div>
                     )}

                     {activeTab === "GROUNDING SOURCES" && (
                       <div className="space-y-6">
                          {sourcesData.sources.map((src: any) => (
                            <div key={src.source_id} className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col gap-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                     {React.createElement(getProviderIcon(src.provider), { className: "w-4 h-4 text-white/40" })}
                                  </div>
                                  <div>
                                     <h4 className="font-bold text-white text-sm hover:underline cursor-pointer" onClick={() => src.url && window.open(src.url, '_blank')}>{src.title}</h4>
                                     <p className="text-xs text-white/40">{format(new Date(src.occurred_at), "MMM d, h:mm a")} • {src.provider.toUpperCase()}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {getSegmentRefs(src.source_id).map(segId => (
                                     <Badge key={segId} variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[9px] uppercase font-black">
                                       SEG {String(segId).padStart(2, '0')}
                                     </Badge>
                                  ))}
                                </div>
                              </div>
                              <p className="text-sm text-white/60 line-clamp-3 bg-white/5 p-4 rounded-xl font-medium">
                                {src.summary || "No automated summary generated for this node."}
                              </p>
                            </div>
                          ))}

                          {sourcesData.missing_source_ids?.length > 0 && (
                            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 border-dashed">
                              <h4 className="text-xs font-bold text-white/60 mb-2 uppercase tracking-widest flex items-center gap-2">
                                 <Shield className="w-3 h-3" /> System Artifacts ({sourcesData.missing_source_ids.length})
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {sourcesData.missing_source_ids.map((id:string) => (
                                   <Badge key={id} variant="outline" className="bg-transparent border-white/10 text-white/30 text-[10px] lowercase">
                                     {id}
                                   </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                       </div>
                     )}

                     {activeTab === "TRANSCRIPT" && (
                       <div className="space-y-12">
                         {segments.map((seg: any) => (
                           <div key={seg.segment_id} className="flex gap-6 group relative">
                             <div className="w-16 flex-shrink-0 flex flex-col items-end gap-2 pt-1 border-r border-white/10 pr-6 relative">
                               <div className="absolute top-2 right-[-5px] w-2 h-2 rounded-full bg-white/20 group-hover:bg-indigo-500 transition-colors" />
                               <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">
                                 {String(seg.segment_id).padStart(2, '0')}
                               </span>
                             </div>
                             <div className="flex-1 space-y-4 pb-12">
                               <p className="text-xl leading-relaxed text-white/80 font-medium">{seg.dialogue}</p>
                               <div className="flex flex-wrap items-center gap-2">
                                  {seg.grounding_source_id && seg.grounding_source_id.split(',').map((id:string) => (
                                    <Badge key={id} variant="outline" onClick={() => setActiveTab("GROUNDING SOURCES")} className="bg-white/5 hover:bg-white/10 text-white/40 cursor-pointer border-white/10 text-[9px] lowercase transition-colors">
                                      <LinkIcon className="w-3 h-3 mr-1.5" /> {id.trim().substring(0, 20)}...
                                    </Badge>
                                  ))}
                               </div>
                             </div>
                           </div>
                         ))}
                         <Button variant="outline" className="w-full h-14 border-dashed border-white/20 text-white/50 bg-transparent hover:bg-white/5 hover:text-white rounded-xl uppercase tracking-widest font-black text-xs gap-2">
                           <Copy className="w-4 h-4" /> Copy Transcript Payload
                         </Button>
                       </div>
                     )}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar / Stats Panel */}
            <div className="col-span-3 flex flex-col gap-6 h-full pb-8 overflow-y-auto scrollbar-hide">
              <MetricCard title="Telemetry Coverage" value="98.4" unit="%" footer="Active Stream">
                 <div className="flex items-center gap-6 pt-2">
                    <div className="flex-1 flex flex-col gap-1">
                       <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-[#5789FF] rounded-full" style={{ width: '98%' }} />
                       </div>
                    </div>
                    <div className="flex items-end gap-1 h-10">
                       {[...Array(6)].map((_, i) => (
                         <div key={i} className="w-1.5 bg-white/10 rounded-sm" style={{ height: `${30 + (i * 20) % 70}%` }} />
                       ))}
                    </div>
                 </div>
              </MetricCard>

              <section className="space-y-4 pt-4">
                <h3 className="text-[10px] uppercase font-black tracking-[0.2em] text-white/30">Primary Dependencies</h3>
                {isSwitching ? (
                   <div className="h-24 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse"></div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(
                       sourcesData.sources.reduce((acc: any, src: any) => { 
                         acc[src.provider] = (acc[src.provider] || 0) + 1; return acc; 
                       }, {})
                    ).map(([prov, count]: any) => (
                      <SourceClusterItem key={prov} provider={prov} title={`${prov.toUpperCase()} Source`} subtitle={`${count} unique references detected`} segmentsCount={0} />
                    ))}
                    {sourcesData.sources.length === 0 && (
                      <p className="text-white/30 text-xs italic px-2">No dependencies captured.</p>
                    )}
                  </div>
                )}
              </section>

              <MetricCard title="System Metrics" value={isSwitching ? "-" : segmentsCount} unit="Nodes" className="mt-auto">
                 <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between text-xs text-white/60 font-medium">
                       <span>Grounding Vectors</span>
                       <span>{isSwitching ? "-" : sourcesCount} Active</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/60 font-medium">
                       <span>Artifact Status</span>
                       <span className={isSwitching ? "text-white/30" : "text-emerald-400"}>{isSwitching ? "Syncing" : "Locked"}</span>
                    </div>
                 </div>
              </MetricCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
