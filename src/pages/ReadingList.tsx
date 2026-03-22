import React, { useState, useEffect } from "react";
import { 
  BookOpen, 
  ExternalLink, 
  Trash2, 
  Clock, 
  Search, 
  Filter,
  Newspaper,
  Github,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getReadingList, removeFromReadingList } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function ReadingList() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    try {
      const data = await getReadingList();
      setItems(data || []);
    } catch (err: any) {
      toast.error("Failed to load reading list: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(sourceId: string) {
    try {
      await removeFromReadingList(sourceId);
      setItems(prev => prev.filter(item => item.source_id !== sourceId));
      toast.success("Item removed from list");
    } catch (err: any) {
      toast.error("Failed to remove item: " + err.message);
    }
  }

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.source_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="px-10 py-8 space-y-12 animate-in fade-in duration-1000">
      
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-[#5789FF]/10 flex items-center justify-center text-[#5789FF]">
                <BookOpen className="w-5 h-5" />
             </div>
             <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Intelligence Archives</h4>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">Reading List</h1>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            Personalized repository of high-signal items flagged for retrospective analysis and deeper investigation.
          </p>
        </div>
        
        <div className="relative w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <Input 
            placeholder="Search archives..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-14 pl-12 bg-white/[0.02] border-white/5 rounded-2xl text-xs focus:ring-[#5789FF]/30" 
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-white/[0.02] rounded-3xl animate-pulse border border-white/5" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 opacity-40">
           <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10">
              <Newspaper className="w-10 h-10" />
           </div>
           <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Archives Empty</h3>
              <p className="text-sm max-w-xs mx-auto">
                No items have been flagged for the reading list yet. Save high-signal content during your morning briefing.
              </p>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const isGithub = item.source_id.includes("github");
            const Icon = isGithub ? Github : Newspaper;
            
            return (
              <div 
                key={item.id} 
                className="sa-card p-8 bg-white/[0.02] border-none group hover:bg-[#5789FF]/5 transition-all duration-500 flex flex-col justify-between h-56 relative overflow-hidden"
              >
                <div className="space-y-4 relative z-10">
                   <div className="flex items-center justify-between">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center border transition-colors",
                        isGithub ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      )}>
                         <Icon className="w-5 h-5" />
                      </div>
                      <Badge className="bg-white/5 border-none text-[8px] font-black tracking-widest text-white/40 group-hover:text-white transition-colors">
                        {new Date(item.created_at).toLocaleDateString()}
                      </Badge>
                   </div>
                   
                   <div className="space-y-2">
                      <h3 className="text-md font-bold text-white group-hover:text-[#5789FF] transition-colors line-clamp-2 leading-tight">
                        {item.title}
                      </h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20">
                        {item.source_id}
                      </p>
                   </div>
                </div>

                <div className="flex items-center gap-2 pt-4 relative z-10 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                   <Button 
                    className="flex-1 sa-button-primary h-10 rounded-xl text-[9px] font-bold uppercase tracking-widest gap-2"
                    onClick={() => window.open(item.url, '_blank')}
                   >
                      <ExternalLink className="w-3.5 h-3.5" /> Read
                   </Button>
                   <Button 
                    variant="outline" 
                    className="w-10 h-10 p-0 bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl"
                    onClick={() => handleDelete(item.source_id)}
                   >
                      <Trash2 className="w-4 h-4" />
                   </Button>
                </div>

                {/* Decorative background icon */}
                <Icon className="absolute bottom-[-10px] right-[-10px] w-24 h-24 text-white/[0.02] -rotate-12 transition-transform group-hover:scale-110 group-hover:text-[#5789FF]/5" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
