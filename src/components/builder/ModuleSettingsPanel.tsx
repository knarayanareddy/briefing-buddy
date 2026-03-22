import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Save, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SettingsUi {
  type: "string_list" | "int";
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
  };
  settings: Record<string, any>;
  onUpdate: (key: string, value: any) => void;
  onSave: () => void;
  isSaving: boolean;
}

export default function ModuleSettingsPanel({ 
  module, 
  settings, 
  onUpdate, 
  onSave,
  isSaving 
}: ModuleSettingsPanelProps) {
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
        <h2 className="text-2xl font-bold text-foreground">{module.name}</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          {module.description}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {!module.settingsUi || Object.keys(module.settingsUi).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center space-y-3 bg-card/20 rounded-2xl border border-dashed border-border p-6">
            <Info className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">This module doesn't require extra configuration.</p>
          </div>
        ) : (
          Object.entries(module.settingsUi).map(([key, ui]) => (
            <div key={key} className="space-y-3 max-w-xl group">
              <div className="space-y-1">
                <Label htmlFor={key} className="text-sm font-bold group-hover:text-primary transition-colors">
                  {ui.label}
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {ui.description}
                </p>
              </div>

              {ui.type === "int" ? (
                <div className="flex items-center gap-4">
                  <Input
                    id={key}
                    type="number"
                    min={ui.min}
                    max={ui.max}
                    value={settings[key] ?? ""}
                    onChange={(e) => onUpdate(key, parseInt(e.target.value) || 0)}
                    className="w-32 bg-secondary border-border"
                  />
                  {(ui.min !== undefined || ui.max !== undefined) && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Range: {ui.min ?? "0"}-{ui.max ?? "∞"}
                    </span>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    id={key}
                    placeholder={ui.placeholder || "Enter items separated by commas..."}
                    value={Array.isArray(settings[key]) ? settings[key].join(", ") : ""}
                    onChange={(e) => onUpdate(key, e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                    className="bg-secondary border-border"
                  />
                  <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
                    {(settings[key] as string[] || []).map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] px-2 py-0 h-5 bg-primary/5 text-primary border-primary/10">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
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
    </div>
  );
}
