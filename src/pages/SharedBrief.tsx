import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSharedBriefing } from "@/lib/api";
import { Shield, Loader2, Sparkles, Terminal } from "lucide-react";
import VideoStage from "@/components/today/VideoStage";
import SegmentTimeline from "@/components/today/SegmentTimeline";

export default function SharedBrief() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [scriptData, setScriptData] = useState<any>(null);
  const [segments, setSegments] = useState<any[]>([]);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement }>({});

  useEffect(() => {
    if (!token) {
      setError("No access token provided.");
      setLoading(false);
      return;
    }

    const fetchSharedData = async () => {
      try {
        const res = await getSharedBriefing(token);
        setScriptData(res.script);
        setExpiresAt(res.share.expires_at);

        if (res.render && res.render.status === 'complete' && res.render.segments) {
          setSegments(res.render.segments);
        } else if (res.script.script_json.timeline_segments) {
          // Render not ready or not scoped, but we can show the timeline
          const baseSegs = res.script.script_json.timeline_segments.map((seg: any, i: number) => ({
            segment_id: i,
            dialogue: seg.dialogue,
            ui_action_card: seg.ui_action_card,
            status: res.render ? res.render.status : "unrendered",
            avatar_video_url: null,
            b_roll_image_url: null
          }));
          setSegments(baseSegs);
        }

      } catch (err: any) {
        setError(err.message || "Failed to load shared briefing");
      } finally {
        setLoading(false);
      }
    };

    fetchSharedData();
    // In a fully polished version, if `res.render.status === 'processing'`, we would poll.
  }, [token]);

  const handlePlayPause = () => {
    if (segments.length === 0) return;
    const currentVid = videoRefs.current[segments[activeSegmentIndex]?.segment_id];
    if (currentVid) {
      if (isPlaying) currentVid.pause();
      else currentVid.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (index: number) => {
    const currentVid = videoRefs.current[segments[activeSegmentIndex]?.segment_id];
    if (currentVid) {
      currentVid.pause();
      currentVid.currentTime = 0;
    }
    setActiveSegmentIndex(index);
    setIsPlaying(false);
    
    setTimeout(() => {
      const newVid = videoRefs.current[segments[index]?.segment_id];
      if (newVid && isPlaying) newVid.play();
    }, 50);
  };

  if (loading) {
    return (
      <div className="flex bg-[#0A0C10] text-[#E0E2E6] h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-white/50 animate-pulse">
           <Loader2 className="w-8 h-8 animate-spin text-[#5789FF]" />
           <p className="tracking-widest uppercase text-xs font-bold">Decrypting Payload...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex bg-[#0A0C10] text-[#E0E2E6] h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-6 max-w-md text-center">
           <div className="w-16 h-16 rounded-full border border-red-500/30 bg-red-500/10 flex flex-col items-center justify-center">
              <Shield className="w-6 h-6 text-red-500" />
           </div>
           <div>
             <h2 className="text-xl font-bold text-white uppercase tracking-widest mb-2">Access Denied</h2>
             <p className="text-white/50">{error}</p>
           </div>
           <button 
             onClick={() => navigate('/auth')}
             className="mt-4 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs uppercase tracking-widest font-bold transition-all"
           >
             Open Silent Architect
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0A0C10] text-[#E0E2E6] overflow-hidden">
      {/* PREMIUM HEADER */}
      <div className="h-16 px-6 bg-black/40 border-b border-white/5 backdrop-blur-3xl flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Sparkles className="w-5 h-5 text-[#5789FF]" />
          <h1 className="font-bold text-lg tracking-tight uppercase">
            {scriptData?.title || "Shared Briefing"}
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
           {expiresAt && (
             <span className="text-xs text-amber-500/70 border border-amber-500/20 bg-amber-500/10 px-3 py-1 rounded-full uppercase tracking-widest font-semibold flex items-center justify-center">
               Expires {new Date(expiresAt).toLocaleDateString()}
             </span>
           )}
           <button 
             onClick={() => navigate('/auth')}
             className="px-4 py-2 bg-[#5789FF]/10 text-[#5789FF] hover:bg-[#5789FF]/20 border border-[#5789FF]/30 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
           >
             Get Silent Architect
           </button>
        </div>
      </div>

      {/* STAGE & TIMELINE */}
      <div className="flex flex-1 min-h-0 bg-[#0F1115]">
         <div className="flex-1 shrink-0 bg-black min-h-0 flex flex-col relative">
           {segments.length > 0 ? (
             <VideoStage 
               segments={segments}
               activeIndex={activeSegmentIndex}
               isPlaying={isPlaying}
               onPlayPause={handlePlayPause}
               videoRefs={videoRefs}
             />
           ) : (
             <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm italic">
               No visual media attached to this brief.
             </div>
           )}
           
           {/* Subtle Status Bar */}
           <div className="absolute top-4 right-4 flex items-center gap-2">
              <Terminal className="w-3 h-3 text-[#5789FF]" />
              <span className="text-[10px] font-mono text-white/40 tracking-tighter uppercase">READ_ONLY SEQUENCE</span>
           </div>
         </div>
         
         {/* SIDEBAR */}
         <div className="w-96 shrink-0 bg-[#12141A] border-l border-white/5 flex flex-col min-h-0 relative">
            <div className="absolute inset-0 flex flex-col">
               <SegmentTimeline 
                 segments={segments}
                 activeIndex={activeSegmentIndex}
                 onSeek={handleSeek}
               />
            </div>
         </div>
      </div>
    </div>
  );
}
