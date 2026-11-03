import * as React from "react";
import * as RechartsPrimitive from "recharts";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [key: string]: {
    label: string;
    theme: { [key in keyof typeof THEMES]: string };
    color?: string;
  };
};

const getPayloadConfigFromPayload = (config: ChartConfig, item: any, key: string) => {
  return config[key] || { label: key, theme: THEMES, color: undefined };
};

// Helper hook for chart context (mocked or imported from parent)
const useChart = () => {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a ChartProvider");
  }
  return context;
};

export type ChartContextType = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextType | null>(null);

const ChartTooltip = RechartsPrimitive.Tooltip;

// Use a generic type for the ref and props to avoid Recharts type issues
type ChartTooltipContentProps = React.ComponentProps<"div"> & {
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: "line" | "dot" | "dashed";
  nameKey?: string;
  labelKey?: string;
  label?: React.ReactNode;
  labelFormatter?: (value: any, payload: any) => React.ReactNode;
  labelClassName?: string;
  active?: boolean;
  formatter?: (value: any, name: string, item: any, index: number, payload: any) => React.ReactNode;
  color?: string;
  payload?: any[];
  verticalAlign?: "top" | "bottom" | "middle";
};

const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  ({
    className,
    hideLabel = false,
    payload = [],
    verticalAlign = "bottom",
    nameKey,
    label,
    labelFormatter,
    labelClassName,
    active,
    formatter,
    color,
    indicator = "line",
    hideIndicator = false,
  }, ref) => {
    const { config } = useChart();

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null;
      }

      const [item] = payload;
      // Use nameKey or dataKey or name or "value"
      const itemLabelKey = labelKey || item.dataKey || item.name || "value";
      const key = `${itemLabelKey}`;
      const itemConfig = getPayloadConfigFromPayload(config, item, key);
      const value =
        !itemLabelKey && typeof label === "string"
          ? config[label as keyof typeof config]?.label || label
          : itemConfig?.label;

      if (labelFormatter) {
        return <div className={cn("font-medium", labelClassName)}>{labelFormatter(value, payload)}</div>;
      }

      if (!value) {
        return null;
      }

      return <div className={cn("font-medium", labelClassName)}>{value}</div>;
    }, [label, labelFormatter, payload, hideLabel, labelClassName, config]);

    if (!active || !payload?.length) {
      return null;
    }

    const nestLabel = payload.length === 1 && indicator !== "dot";

    // Determine indicator color from config
    const [firstItem] = payload;
    const firstItemLabelKey = labelKey || firstItem.dataKey || firstItem.name || "value";
    const firstKey = `${firstItemLabelKey}`;
    const firstConfig = getPayloadConfigFromPayload(config, firstItem, firstKey);
    const indicatorColor = firstConfig?.color || color || firstItem.color || "muted";

    return (
      <ChartTooltip
        content={null}
        wrapperStyle={{ pointerEvents: "none" }}
      >
        <div
          ref={ref}
          className={cn(
            "relative z-50 overflow-hidden rounded-md border bg-popover p-2 text-sm shadow-md",
            className,
          )}
          style={{
            "--color-bg": indicatorColor,
            "--color-border": indicatorColor,
          } as CSSProperties}
        >
          {tooltipLabel}
          {payload.map((entry, index) => {
            const itemLabelKey = labelKey || entry.dataKey || entry.name || "value";
            const itemConfig = getPayloadConfigFromPayload(config, entry, `${itemLabelKey}`);
            const itemColor = itemConfig?.color || color || entry.color;
            const itemFormatter = formatter || itemConfig?.formatter;
            const itemValue = itemFormatter
              ? itemFormatter(entry.value, entry.name, entry, index, payload)
              : entry.value;

            return (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-2",
                  nestLabel && "pl-4",
                )}
              >
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    itemColor ? `bg-${itemColor}` : "bg-muted",
                  )}
                  style={{ backgroundColor: itemColor }}
                />
                <span className="text-muted-foreground">{entry.name}</span>
                <span className="font-medium">{itemValue}</span>
              </div>
            );
          })}
        </div>
      </ChartTooltip>
    );
  },
);
ChartTooltipContent.displayName = "ChartTooltipContent";

const ChartLegend = RechartsPrimitive.Legend;

type ChartLegendContentProps = React.ComponentProps<"div"> & {
  hideIcon?: boolean;
  nameKey?: string;
  label?: React.ReactNode;
  labelFormatter?: (value: any, payload: any) => React.ReactNode;
  labelClassName?: string;
  active?: boolean;
  formatter?: (value: any, name: string, item: any, index: number, payload: any) => React.ReactNode;
  color?: string;
  payload?: any[];
  verticalAlign?: "top" | "bottom" | "middle";
  indicator?: "line" | "dot" | "dashed";
  hideIndicator?: boolean;
};

const ChartLegendContent = React.forwardRef<HTMLDivElement, ChartLegendContentProps>(
  ({
    className,
    hideIcon = false,
    payload = [],
    verticalAlign = "bottom",
    nameKey,
    label,
    labelFormatter,
    labelClassName,
    active,
    formatter,
    color,
    indicator = "line",
    hideIndicator = false,
  }, ref) => {
    const { config } = useChart();

    if (!payload?.length) {
      return null;
    }

    return (
      <div ref={ref} className={cn("flex flex-wrap gap-2", className)}>
        {payload.map((entry, index) => {
          const itemLabelKey = labelKey || entry.dataKey || entry.name || "value";
          const itemConfig = getPayloadConfigFromPayload(config, entry, `${itemLabelKey}`);
          const itemColor = itemConfig?.color || color || entry.color;
          const itemFormatter = formatter || itemConfig?.formatter;
          const itemValue = itemFormatter
            ? itemFormatter(entry.value, entry.name, entry, index, payload)
            : entry.value;

          return (
            <div key={index} className="flex items-center gap-1">
              {!hideIcon && (
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    itemColor ? `bg-${itemColor}` : "bg-muted",
                  )}
                  style={{ backgroundColor: itemColor }}
                />
              )}
              <span className="text-sm">{entry.name}</span>
              <span className="font-medium">{itemValue}</span>
            </div>
          );
        })}
      </div>
    );
  },
);
ChartLegendContent.displayName = "ChartLegendContent";

export { ChartTooltipContent, ChartLegendContent };
