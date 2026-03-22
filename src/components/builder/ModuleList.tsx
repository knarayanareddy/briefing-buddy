import React from "react";
import { cn } from "@/lib/utils";
import { 
  Rss, 
  Github, 
  Mail, 
  Check, 
  ChevronRight,
  Plus,
  GripVertical,
  Database
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SourceCard = ({ icon: Icon, title, description, active, selected, onToggle, onSelect, hasRequired, isReady, availability }: any) => {
  const isComingSoon = availability === "coming_soon";
  
  return (
  <div 
    onClick={isComingSoon ? undefined : onSelect}
    className={cn(
      "p-6 rounded-2xl transition-all duration-300 border relative group overflow-hidden",
      isComingSoon ? "opacity-50 cursor-not-allowed bg-black/20 border-white/5" : "cursor-pointer",
      selected && !isComingSoon
        ? "bg-[#111928] border-[#5789FF]/30 shadow-[0_0_30px_rgba(87,137,255,0.1)]" 
        : (!isComingSoon ? "bg-white/[0.02] border-white/5 hover:border-white/10" : "")
    )}
  >
    {/* Highlight for active selected state */}
    {selected && !isComingSoon && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#5789FF]" />}

    <div className="flex items-start gap-5">
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-lg",
        selected ? "bg-[#5789FF]/20 text-[#5789FF]" : "bg-white/5 text-muted-foreground group-hover:text-white"
      )}>
        <Icon className="w-6 h-6" />
      </div>

      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-lg text-white">{title}</h4>
          {isComingSoon ? (
            <Badge className="text-[9px] px-2 py-0.5 h-5 border font-bold uppercase tracking-wider bg-white/5 text-white/40 border-white/10">
              Coming Soon
            </Badge>
          ) : hasRequired ? (
            <Badge className={cn("text-[9px] px-2 py-0.5 h-5 border font-bold uppercase tracking-wider", isReady ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20")}>
              {isReady ? "Ready" : "Needs Connection"}
            </Badge>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
    
    <div className="absolute top-6 right-6 z-10">
      {isComingSoon ? null : (
        <div 
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer",
            active ? "bg-[#5789FF] border-[#5789FF] text-white" : "border-white/20 hover:border-white/40"
          )}
        >
          {active && <Check className="w-3.5 h-3.5" />}
        </div>
      )}
    </div>

    {/* Sub-items for RSS Card if selected and in Silent Layout */}
    {selected && title === "Technical RSS Feeds" && (
      <div className="mt-6 space-y-2 animate-in slide-in-from-top-2 duration-300">
        <SubSourceItem label="Hacker News - Top Stories" checked={true} />
        <SubSourceItem label="The Register - Enterprise IT" checked={true} />
      </div>
    )}

    {/* Sub-items for GitHub if selected */}
    {selected && title === "GitHub Repository Tracking" && (
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2 noscrollbar">
         <RepoPill name="langchain-ai/langchain" subs="Commits, Releases" />
         <RepoPill name="openai/whisper" subs="Major Releases only" />
      </div>
    )}
  </div>
  );
};

const SubSourceItem = ({ label, checked }: any) => (
  <div className="flex items-center gap-3 p-4 bg-black/40 border border-white/5 rounded-xl group/sub">
    <GripVertical className="w-4 h-4 text-white/10 group-hover/sub:text-white/30 transition-colors cursor-grab" />
    <span className="flex-1 text-[11px] font-semibold text-white/70">{label}</span>
    <div className={cn(
      "w-5 h-5 rounded flex items-center justify-center transition-all",
      checked ? "bg-[#5789FF] text-white" : "border border-white/20"
    )}>
      {checked && <Check className="w-3 h-3" />}
    </div>
  </div>
);

const RepoPill = ({ name, subs }: any) => (
  <div className="flex-shrink-0 p-4 bg-black/40 border border-white/5 rounded-xl space-y-2 min-w-[160px]">
    <div className="flex items-center gap-2">
       <div className="w-2 h-2 rounded-full bg-[#5789FF]" />
       <span className="text-[10px] font-bold text-white/80 line-clamp-1 truncate">{name}</span>
    </div>
    <p className="text-[9px] text-muted-foreground leading-tight">{subs}</p>
  </div>
);

export default function ModuleList({ 
  modules, 
  enabledModuleIds, 
  selectedModuleId, 
  onToggle, 
  onSelect, 
  connectorStatus,
  layout 
}: any) {
  if (layout === "silent") {
    return (
      <div className="space-y-4">
        {modules.map((mod: any) => {
          let Icon = Database;
          if (mod.id.includes("rss")) Icon = Rss;
          if (mod.id.includes("github")) Icon = Github;
          if (mod.id.includes("mail") || mod.id.includes("gmail") || mod.id.includes("inbox")) Icon = Mail;
          
          const hasRequired = mod.requiredConnectors && mod.requiredConnectors.length > 0;
          const isReady = hasRequired ? mod.requiredConnectors.every((c: any) => connectorStatus[c.provider] === "active") : true;

          return (
            <SourceCard 
              key={mod.id}
              icon={Icon}
              title={mod.label || mod.name}
              description={mod.description}
              selected={selectedModuleId === mod.id}
              active={enabledModuleIds.includes(mod.id)}
              onSelect={() => onSelect(mod.id)}
              onToggle={() => {
                if (mod.availability !== "coming_soon") {
                  onToggle(mod.id);
                }
              }}
              hasRequired={hasRequired}
              isReady={isReady}
              availability={mod.availability}
            />
          );
        })}
      </div>
    );
  }

  // Fallback to legacy layout if needed
  return null; 
}
