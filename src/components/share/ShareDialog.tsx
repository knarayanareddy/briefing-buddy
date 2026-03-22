import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createShareLink } from "@/lib/api";
import { toast } from "sonner";
import { Copy, Share2, Check } from "lucide-react";

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  scriptId: string | null;
  jobId?: string | null;
}

export default function ShareDialog({ isOpen, onClose, scriptId, jobId }: ShareDialogProps) {
  const [loading, setLoading] = useState(false);
  const [expiry, setExpiry] = useState("24");
  const [includeTranscript, setIncludeTranscript] = useState(true);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset state when opening a new dialog
  React.useEffect(() => {
    if (isOpen) {
      setShareUrl(null);
      setCopied(false);
      setLoading(false);
      setExpiry("24");
      setIncludeTranscript(true);
    }
  }, [isOpen, scriptId]);

  const handleGenerate = async () => {
    if (!scriptId) return;
    setLoading(true);
    try {
      const res = await createShareLink(scriptId, jobId, {
        expires_in_hours: parseInt(expiry, 10),
        allow_transcript: includeTranscript,
        allow_action_cards: false // Action cards remain disabled in v1 for safety
      });
      // Construct full URL
      const fullUrl = `${window.location.origin}${res.share_url}`;
      setShareUrl(fullUrl);
      toast.success("Ready to share!");
    } catch (err: any) {
      toast.error("Failed to generate link: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied to clipboard");
    } catch (e) {
      toast.error("Failed to copy list");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#12141A] border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#5789FF]" />
            Distribute Briefing
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Create a public, read-only link to share this intelligence briefing with stakeholders. No login required.
          </DialogDescription>
        </DialogHeader>

        {shareUrl ? (
          <div className="space-y-4 py-4 animate-in fade-in zoom-in duration-300">
            <div className="p-4 bg-white/5 border border-emerald-500/30 rounded-xl relative">
              <p className="text-xs text-emerald-400 mb-2 font-bold uppercase tracking-widest">Active Link Generated</p>
              <div className="flex items-center gap-2">
                <input 
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                />
                <Button 
                  onClick={handleCopy} 
                  variant="outline" 
                  size="icon"
                  className={`border border-white/10 ${copied ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30 hover:text-emerald-300' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            
            <div className="text-xs text-white/50 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
               <span className="text-amber-500 font-bold">Warning:</span> Anyone with this link can view the rendered video and transcript until it expires.
            </div>

            <Button onClick={onClose} className="w-full bg-white/10 hover:bg-white/20 text-white">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            
            <div className="flex flex-col gap-3">
              <Label className="text-white/80">Expiration</Label>
              <Select value={expiry} onValueChange={setExpiry}>
                <SelectTrigger className="w-full bg-black/40 border-white/10 text-white">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1D24] border-white/10 text-white">
                  <SelectItem value="1">1 Hour</SelectItem>
                  <SelectItem value="24">24 Hours</SelectItem>
                  <SelectItem value="168">7 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between border border-white/5 p-4 rounded-xl bg-white/5">
              <div className="flex flex-col gap-1">
                <Label className="text-white/90">Include Transcript</Label>
                <span className="text-xs text-muted-foreground">Allow viewers to read the full generated dialogue</span>
              </div>
              <Switch 
                checked={includeTranscript} 
                onCheckedChange={setIncludeTranscript}
                className="data-[state=checked]:bg-[#5789FF]"
              />
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={loading}
              className="w-full sa-button-primary bg-[#5789FF] hover:bg-[#4673DF] text-white font-bold tracking-wide"
            >
              {loading ? "Generating Signed Token..." : "Create Public Link"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
