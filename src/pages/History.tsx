import React, { useEffect, useState } from "react";
import { Clock, History as HistoryIcon, Play, RefreshCw, AlertCircle, Calendar, Share2 } from "lucide-react";
import { format } from "date-fns";
import { listHistory, HistoryItem, startRender } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ShareDialog from "@/components/share/ShareDialog";

export default function History() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareConfig, setShareConfig] = useState<{isOpen: boolean, scriptId: string | null, jobId: string | null}>({ isOpen: false, scriptId: null, jobId: null });
  const navigate = useNavigate();

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await listHistory();
      setItems(res.items);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleStartRender = async (scriptId: string) => {
    try {
      toast.info("Starting render job...");
      await startRender(scriptId);
      toast.success("Render job queued successfully");
      fetchHistory(); // refresh to show the new job
    } catch (err: any) {
      toast.error(`Failed to start render: ${err.message}`);
    }
  };

  const handleOpen = (item: HistoryItem) => {
    // Navigate to today page with script_id and job_id.
    const searchParams = new URLSearchParams();
    searchParams.set("script_id", item.id);
    if (item.render_job?.id) {
      searchParams.set("job_id", item.render_job.id);
    }
    navigate(`/today?${searchParams.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center animate-in fade-in duration-700 h-full">
         <div className="flex flex-col items-center gap-4 text-muted-foreground">
           <RefreshCw className="w-8 h-8 animate-spin" />
           <p>Loading History...</p>
         </div>
      </div>
    );
  }

  if (error) {
    return (
       <div className="flex-1 flex items-center justify-center p-8 text-center h-full">
         <div className="flex flex-col items-center gap-4 text-red-400">
           <AlertCircle className="w-8 h-8" />
           <p>{error}</p>
           <button onClick={fetchHistory} className="px-4 py-2 bg-white/10 rounded hover:bg-white/20 transition-colors">
              Retry
           </button>
         </div>
       </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-8 space-y-6 animate-in fade-in duration-700 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#5789FF]/20 flex items-center justify-center border border-[#5789FF]/30">
          <HistoryIcon className="w-5 h-5 text-[#5789FF]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Briefing History</h2>
          <p className="text-sm text-muted-foreground">Past scripts and scheduled generations</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-2xl py-16">
          <Calendar className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <p className="text-lg text-white font-medium">No history available</p>
          <p className="text-sm text-muted-foreground">Your generated scripts will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-[#12141A] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                
                {/* Meta */}
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">
                      {item.title || "Morning Briefing"}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground">
                       {item.segments_count} Segments
                    </span>
                    {item.trigger === 'scheduled' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Scheduled
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                     <div className="flex items-center gap-1.5 hover:text-white transition-colors">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(item.created_at), "MMM d, yyyy 'at' h:mm a")}
                     </div>
                     <span>•</span>
                     <span>{item.profile_name || item.persona}</span>
                  </div>
                </div>

                {/* Actions & Status */}
                <div className="flex items-center gap-4 w-full sm:w-auto">
                   <div className="flex flex-col items-end gap-1">
                      {item.render_job ? (
                        <div className="text-xs flex items-center gap-1.5">
                           <span className={`w-2 h-2 rounded-full ${
                             item.render_job.status === 'complete' ? 'bg-emerald-500' :
                             item.render_job.status === 'failed' ? 'bg-red-500' :
                             'bg-amber-500 animate-pulse'
                           }`} />
                           <span className="text-muted-foreground capitalize">
                             {item.render_job.status}
                           </span>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleStartRender(item.id)}
                          className="text-xs text-[#5789FF] hover:text-white transition-colors underline-offset-4 hover:underline"
                        >
                          Start Render
                        </button>
                      )}
                   </div>
                   
                   <button
                     onClick={() => setShareConfig({ isOpen: true, scriptId: item.id, jobId: item.render_job?.id || null })}
                     className="flex items-center justify-center w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all"
                   >
                     <Share2 className="w-4 h-4" />
                   </button>
                   <button
                     onClick={() => handleOpen(item)}
                     className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg text-sm text-white font-medium transition-all"
                   >
                     <Play className="w-4 h-4" />
                     Open
                   </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ShareDialog 
        isOpen={shareConfig.isOpen}
        onClose={() => setShareConfig({ ...shareConfig, isOpen: false })}
        scriptId={shareConfig.scriptId}
        jobId={shareConfig.jobId}
      />
    </div>
  );
}
