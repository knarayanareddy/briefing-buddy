import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Globe, Tag, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Feed {
  url: string;
  title: string;
}

interface FeedManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  feeds: Feed[];
  onSave: (feeds: Feed[]) => void;
  isSaving: boolean;
}

export default function FeedManagementModal({
  isOpen,
  onClose,
  feeds = [],
  onSave,
  isSaving
}: FeedManagementModalProps) {
  const [currentFeeds, setCurrentFeeds] = useState<Feed[]>(feeds);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");

  const handleAdd = () => {
    if (!newUrl) {
      toast.error("URL is required");
      return;
    }
    if (!newUrl.startsWith("http")) {
      toast.error("Invalid URL format");
      return;
    }
    setCurrentFeeds([...currentFeeds, { url: newUrl, title: newTitle || newUrl }]);
    setNewUrl("");
    setNewTitle("");
  };

  const handleRemove = (url: string) => {
    setCurrentFeeds(currentFeeds.filter(f => f.url !== url));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-card border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Manage RSS Feeds
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Add or remove news sources for your daily briefing. We support standard RSS and Atom feeds.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-12 gap-3 p-4 rounded-xl bg-muted/30 border border-border">
            <div className="col-span-5 space-y-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Feed URL</Label>
              <Input 
                placeholder="https://example.com/rss" 
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                className="bg-background border-border h-9"
              />
            </div>
            <div className="col-span-11 md:col-span-5 space-y-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Display Title</Label>
              <Input 
                placeholder="Tech News" 
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="bg-background border-border h-9"
              />
            </div>
            <div className="col-span-12 md:col-span-2 flex items-end">
              <Button onClick={handleAdd} className="w-full h-9 gap-2">
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {currentFeeds.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-muted/10 rounded-xl border border-dashed border-border text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No feeds configured yet.</p>
              </div>
            ) : (
              currentFeeds.map((feed) => (
                <div key={feed.url} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border group hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded bg-background flex items-center justify-center border border-border">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{feed.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{feed.url}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemove(feed.url)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="bg-muted/30 -mx-6 -mb-6 p-4 border-t border-border rounded-b-lg">
          <Button variant="outline" onClick={onClose} className="border-border">Cancel</Button>
          <Button onClick={() => onSave(currentFeeds)} disabled={isSaving} className="min-w-[100px]">
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
