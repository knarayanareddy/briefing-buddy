import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronRight, Settings2, Link2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Module {
  id: string;
  name: string;
  description: string;
  required_connectors?: string[];
}

interface ModuleListProps {
  modules: Module[];
  enabledModuleIds: string[];
  selectedModuleId: string | null;
  onToggle: (moduleId: string) => void;
  onSelect: (moduleId: string) => void;
  connectorStatus: Record<string, any>;
}

export default function ModuleList({ 
  modules = [], 
  enabledModuleIds = [], 
  selectedModuleId, 
  onToggle, 
  onSelect,
  connectorStatus = {} 
}: ModuleListProps) {
  const [search, setSearch] = useState("");

  const filteredModules = (modules || []).filter(m => 
    m.name?.toLowerCase().includes(search.toLowerCase()) || 
    m.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-card/30 border-r border-border overflow-hidden">
      <div className="p-4 space-y-4 border-b border-border bg-background/50">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search modules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-secondary border-border"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredModules.map((module) => {
          const isEnabled = enabledModuleIds.includes(module.id);
          const isSelected = selectedModuleId === module.id;
          
          // Check connector health for this module
          const missingConnectors = module.required_connectors?.filter(c => !connectorStatus[c]?.active) || [];
          const hasError = missingConnectors.length > 0;

          return (
            <div
              key={module.id}
              className={cn(
                "group relative flex items-start gap-3 p-3 rounded-lg transition-all",
                isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-secondary/50 border border-transparent"
              )}
            >
              <div className="flex items-center h-5 mt-0.5">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => onToggle(module.id)}
                  className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary/20"
                />
              </div>

              <div 
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => onSelect(module.id)}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className={cn(
                    "text-sm font-semibold truncate",
                    isEnabled ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {module.name}
                  </span>
                  {hasError && isEnabled && (
                    <AlertCircle className="w-3.5 h-3.5 text-destructive animate-pulse" />
                  )}
                </div>
                
                <p className="text-[11px] text-muted-foreground line-clamp-1 mb-2">
                  {module.description}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {module.required_connectors?.map(conn => (
                    <Badge 
                      key={conn} 
                      variant="outline" 
                      className={cn(
                        "text-[9px] px-1.5 py-0 h-4 border-dashed",
                        connectorStatus[conn]?.active 
                          ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/5" 
                          : "text-muted-foreground border-border"
                      )}
                    >
                      <Link2 className="w-2.5 h-2.5 mr-1" />
                      {conn}
                    </Badge>
                  ))}
                </div>
              </div>

              {isSelected && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-primary">
                  <ChevronRight className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
