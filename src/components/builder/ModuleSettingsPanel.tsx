import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Save, Info, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { cn } from "@/lib/utils";
import ConfigModal from "@/components/connectors/ConfigModal";

interface SettingsUi {
  type: "string_list" | "int" | "number" | "boolean" | "multiselect" | "text";
  label: string;
  description: string;
  placeholder?: string;
  min?: number;
  max?: number;
}

interface ModuleSettingsPanelProps {
  module: {
    id: string;
    name: string;
    description: string;
    settingsUi?: Record<string, SettingsUi>;
    requiredConnectors?: Array<{ provider: string }>;
  };
  settings: Record<string, any>;
  onUpdate: (key: string, value: any) => void;
  onSave: () => void;
  isSaving: boolean;
  connectorStatus?: Record<string, string>;
}

export default function ModuleSettingsPanel({ 
  module, 
  settings, 
  onUpdate, 
  onSave,
  isSaving,
  connectorStatus 
}: ModuleSettingsPanelProps) {
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);

  const handleOpenConfig = (provider: string) => {
    setActiveProvider(provider);
    setConfigModalOpen(true);
  };

  if (!module) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 text-center space-y-4 animate-pulse">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Settings className="w-6 h-6 text-white/20 animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">Initializing engine configuration...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="p-6 border-b border-border bg-card/50">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold text-primary border-primary/20 bg-primary/5">
            Module Settings
          </Badge>
          <Button size="sm" onClick={onSave} disabled={isSaving} className="h-8 gap-2">
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
        <h2 className="text-2xl font-bold text-foreground">{module.name || (module as any).label}</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          {module.description}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {module.requiredConnectors && module.requiredConnectors.length > 0 && (
          <div className="space-y-4 mb-8">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/50 mb-4">Intelligence Pipelines</h3>
            <div className="grid gap-3">
              {module.requiredConnectors.map((c: any) => {
                const status = (connectorStatus || {})[c.provider] || "missing";
                const isReady = status === "active";
                return (
                  <div key={c.provider} className="flex items-center justify-between p-4 rounded-xl bg-card/20 border border-border">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-2 h-2 rounded-full", isReady ? "bg-green-500" : "bg-yellow-500")} />
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold capitalize text-foreground">{c.provider}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                          {isReady ? "Connected & Ready" : "Configuration Required"}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs h-8"
                      onClick={() => handleOpenConfig(c.provider)}
                    >
                      {isReady ? "Configure" : "Connect"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!module.settingsUi || Object.keys(module.settingsUi).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center space-y-3 bg-card/20 rounded-2xl border border-dashed border-border p-6">
            <Info className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">This module doesn't require extra configuration.</p>
          </div>
        ) : (
          Object.entries(module.settingsUi).map(([key, ui]) => (
            <div key={key} className="space-y-4 max-w-xl group relative">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor={key} className="text-sm font-bold group-hover:text-primary transition-colors">
                    {ui.label}
                  </Label>
                  {ui.type === "boolean" && (
                    <Switch
                      id={key}
                      checked={!!settings[key]}
                      onCheckedChange={(val) => onUpdate(key, val)}
                      className="data-[state=checked]:bg-primary"
                    />
                  )}
                </div>
                {ui.description && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed pr-12">
                     {ui.description}
                  </p>
                )}
              </div>

              {ui.type === "int" || ui.type === "number" ? (
                <div className="flex items-center gap-4">
                  <Input
                    id={key}
                    type="number"
                    min={ui.min}
                    max={ui.max}
                    value={settings[key] ?? ""}
                    onChange={(e) => onUpdate(key, parseInt(e.target.value) || 0)}
                    className="w-32 bg-secondary/50 border-border h-11 px-4 rounded-xl"
                  />
                  {(ui.min !== undefined || ui.max !== undefined) && (
                    <span className="text-[10px] font-mono text-muted-foreground/50">
                      Range: {ui.min ?? "0"}-{ui.max ?? "∞"}
                    </span>
                  )}
                </div>
              ) : ui.type === "multiselect" || ui.type === "string_list" ? (
                <div className="space-y-3">
                  <Input
                    id={key}
                    placeholder={ui.placeholder || "Enter items separated by commas..."}
                    value={Array.isArray(settings[key]) ? settings[key].join(", ") : ""}
                    onChange={(e) => onUpdate(key, e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                    className="bg-secondary/50 border-border h-11 px-4 rounded-xl placeholder:text-muted-foreground/30"
                  />
                  <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
                    {(Array.isArray(settings[key]) ? settings[key] : []).map((tag: any, i: number) => (
                      <Badge key={i} variant="secondary" className="text-[10px] px-2.5 py-0.5 h-6 bg-primary/10 text-primary border-primary/20 rounded-lg">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : ui.type === "boolean" ? null : (
                <Input
                  id={key}
                  placeholder={ui.placeholder}
                  value={settings[key] ?? ""}
                  onChange={(e) => onUpdate(key, e.target.value)}
                  className="bg-secondary/50 border-border h-11 px-4 rounded-xl"
                />
              )}
            </div>
          ))
        )}

        <div className="pt-8 border-t border-border mt-auto">
          <div className="p-4 rounded-xl bg-muted/50 border border-border flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Privacy Note</p>
              <p className="text-[11px] text-muted-foreground leading-normal">
                These settings are stored securely in your private briefing profile.
                Personal identifiers used for filtering (keywords, repos) are never exposed to public contexts.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ConfigModal 
        isOpen={configModalOpen} 
        onClose={() => setConfigModalOpen(false)} 
        title={`${(activeProvider || "").toUpperCase()} Integration`} 
        provider={activeProvider} 
      />
    </div>
  );
}
