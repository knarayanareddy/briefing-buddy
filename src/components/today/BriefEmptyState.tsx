import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { Link } from "react-router-dom";

interface BriefEmptyStateProps {
  onGenerate: () => void;
  isGenerating: boolean;
}

export default function BriefEmptyState({ onGenerate, isGenerating }: BriefEmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center space-y-6 max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-24 h-24 mx-auto rounded-3xl bg-primary/10 flex items-center justify-center group hover:bg-primary/20 transition-colors">
          <Zap className="w-12 h-12 text-primary group-hover:scale-110 transition-transform" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-foreground">Ready for your briefing?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Generate a personalized morning briefing featuring AI avatars, 
            bespoke B-roll imagery, and interactive productivity cards.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" variant="default" onClick={onGenerate} disabled={isGenerating}>
            {isGenerating ? "Preparing..." : "Get Started"}
          </Button>
          <Link to="/builder">
            <Button size="lg" variant="outline">
              Configure Profile
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
