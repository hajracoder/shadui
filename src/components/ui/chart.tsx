"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { TooltipProps, LegendProps, LegendPayload } from "recharts";
import { cn } from "@/lib/utils";

// Themes
const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error("useChart must be used within a <ChartContainer />");
  return context;
}

/* ---------------- Container & Style ---------------- */
function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ReactNode;
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          <div>{children}</div></RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, cfg]) => (cfg as any).theme || (cfg as any).color
  );
  if (!colorConfig.length) return null;

  const css = Object.entries(THEMES)
    .map(([theme, prefix]) => {
      return `
${prefix} [data-chart=${id}] {
${Object.entries(config)
  .filter(([_, cfg]) => (cfg as any).theme || (cfg as any).color)
  .map(([key, itemConfig]) => {
    const cfg = itemConfig as { theme?: Record<string, string>; color?: string };
    const color = cfg.theme?.[theme] || cfg.color;
    return color ? `  --color-${key}: ${color};` : "";
  })
  .join("\n")}
}
`;
    })
    .join("\n");

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
};

/* ---------------- Tooltip ---------------- */
type RechartsTooltipPayload = Array<{
  value?: number | string;
  name?: string;
  dataKey?: string;
  payload?: Record<string, unknown>;
  color?: string;
}>;

type ChartTooltipContentProps = {
  active?: boolean;
  payload?: RechartsTooltipPayload;
  label?: string | number;
  formatter?: (value: any, name: any, entry: RechartsTooltipPayload[number], index: number) => React.ReactNode;
  labelFormatter?: (value: any, payload?: RechartsTooltipPayload) => React.ReactNode;
  indicator?: "line" | "dot" | "dashed";
  hideLabel?: boolean;
  hideIndicator?: boolean;
  color?: string;
  nameKey?: string;
  labelKey?: string;
  labelClassName?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children">;

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent(props: ChartTooltipContentProps) {
  const {
    active,
    payload,
    label,
    formatter,
    labelFormatter,
    className,
    indicator = "dot",
    hideLabel = false,
    hideIndicator = false,
    color,
    nameKey,
    labelKey,
    labelClassName,
  } = props;

  const { config } = useChart();

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !Array.isArray(payload) || payload.length === 0) return null;

    const item = payload[0];
    const key = `${labelKey || (item.dataKey ?? item.name ?? "value")}`;

    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value =
      !labelKey && typeof label === "string" ? (config[label as keyof typeof config]?.label || label) : itemConfig?.label;

    if (labelFormatter) return <div className={cn("font-medium", labelClassName)}>{labelFormatter(value, payload)}</div>;
    if (!value) return null;
    return <div className={cn("font-medium", labelClassName)}>{value}</div>;
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

  if (!active || !Array.isArray(payload) || payload.length === 0) return null;

  const nestLabel = payload.length === 1 && indicator !== "dot";

  return (
    <div
      className={cn(
        "border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl",
        className
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = `${nameKey || item.name || item.dataKey || "value"}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);
          const indicatorColor = color || (item.payload as any)?.fill || item.color;

          return (
            <div
              key={String(item.dataKey ?? index)}
              className={cn(
                "[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5",
                indicator === "dot" && "items-center"
              )}
            >
              {formatter && item.value !== undefined && item.name ? (
                (formatter as any)(item.value, item.name, item, index)
              ) : (
                <>
                  {itemConfig?.icon ? (
                    <itemConfig.icon />
                  ) : (
                    !hideIndicator && (
                      <div
                        className={cn("shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)", {
                          "h-2.5 w-2.5": indicator === "dot",
                          "w-1": indicator === "line",
                          "w-0 border-[1.5px] border-dashed bg-transparent": indicator === "dashed",
                          "my-0.5": nestLabel && indicator === "dashed",
                        })}
                        style={{ ["--color-bg" as any]: indicatorColor, ["--color-border" as any]: indicatorColor } as React.CSSProperties}
                      />
                    )
                  )}
                  <div className={cn("flex flex-1 justify-between leading-none", nestLabel ? "items-end" : "items-center")}>
                    <div className="grid gap-1.5">{nestLabel ? tooltipLabel : null}<span className="text-muted-foreground">{itemConfig?.label || item.name}</span></div>
                    {item.value !== undefined && (
                      <span className="text-foreground font-mono font-medium tabular-nums">{String(item.value).toLocaleString?.() ?? String(item.value)}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Legend ---------------- */
type ChartLegendContentProps = {
  payload?: Array<LegendPayload>;
  hideIcon?: boolean;
  verticalAlign?: "top" | "bottom" | "middle";
  nameKey?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children">;

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({ className, hideIcon = false, payload, verticalAlign = "bottom", nameKey }: ChartLegendContentProps) {
  const { config } = useChart();

  if (!payload?.length) return null;

  return (
    <div className={cn("flex items-center justify-center gap-4", verticalAlign === "top" ? "pb-3" : "pt-3", className)}>
      {payload.map((entry, idx) => {
     const key = `${nameKey || (entry.dataKey ?? entry.value ?? idx)}`;

        const itemConfig = getPayloadConfigFromPayload(config, entry, String(key));

        return (
          <div key={String(key)} className={cn("[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3")}>
            {itemConfig?.icon && !hideIcon ? <itemConfig.icon /> : <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: entry.color }} />}
            {itemConfig?.label}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- helper ---------------- */
function getPayloadConfigFromPayload(config: ChartConfig, payload: any, key: string) {
  if (!payload || typeof payload !== "object") return undefined;

  const payloadData = payload.payload && typeof payload.payload === "object" ? payload.payload : undefined;
  let configLabelKey: string = key;

  if (key in payload && typeof payload[key] === "string") configLabelKey = payload[key] as string;
  else if (payloadData && key in payloadData && typeof payloadData[key] === "string") configLabelKey = payloadData[key] as string;

  return config[configLabelKey] ?? config[key as keyof typeof config];
}

/* ---------------- exports ---------------- */
export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle };

























// "use client";

// import * as React from "react";
// import * as RechartsPrimitive from "recharts";
// import { TooltipProps, LegendProps } from "recharts";

// import { cn } from "@/lib/utils";

// // Themes
// const THEMES = { light: "", dark: ".dark" } as const;

// export type ChartConfig = {
//   [k: string]: {
//     label?: React.ReactNode;
//     icon?: React.ComponentType;
//   } & (
//     | { color?: string; theme?: never }
//     | { color?: never; theme: Record<keyof typeof THEMES, string> }
//   );
// };

// type ChartContextProps = { config: ChartConfig };
// const ChartContext = React.createContext<ChartContextProps | null>(null);

// function useChart() {
//   const context = React.useContext(ChartContext);
//   if (!context) throw new Error("useChart must be used within <ChartContainer />");
//   return context;
// }

// /* ---------------- Container & Style ---------------- */
// function ChartContainer({
//   id,
//   className,
//   children,
//   config,
//   ...props
// }: React.ComponentProps<"div"> & {
//   config: ChartConfig;
//   children: React.ReactNode;
// }) {
//   const uniqueId = React.useId();
//   const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

//   return (
//     <ChartContext.Provider value={{ config }}>
//       <div
//         data-slot="chart"
//         data-chart={chartId}
//         className={cn(
//           "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
//           className
//         )}
//         {...props}
//       >
//         <ChartStyle id={chartId} config={config} />
// <RechartsPrimitive.ResponsiveContainer>
//   {children as React.ReactElement} 
// </RechartsPrimitive.ResponsiveContainer>



//       </div>
//     </ChartContext.Provider>
//   );
// }

// const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
//   const colorConfig = Object.entries(config).filter(([, cfg]) => cfg.theme || cfg.color);
//   if (!colorConfig.length) return null;

// const css = (Object.entries(THEMES) as [keyof typeof THEMES, string][])
//   .map(([theme, prefix]) => {
//     return `
// ${prefix} [data-chart=${id}] {
// ${Object.entries(config)
//   .filter(([_, cfg]) => cfg.theme || cfg.color)
//   .map(([key, cfg]) => {
//     const color = cfg.theme?.[theme] || cfg.color; // ✅ now safe
//     return color ? `  --color-${key}: ${color};` : "";
//   })
//   .join("\n")}
// }
// `;
//   })
//   .join("\n");


//   return <style dangerouslySetInnerHTML={{ __html: css }} />;
// };

// /* ---------------- Tooltip Types ---------------- */
// type TooltipItem = {
//   value?: number | string;
//   name?: string;
//   dataKey?: string;
//   payload?: Record<string, any>;
//   color?: string;
// };

// type ChartTooltipContentProps = {
//   active?: boolean;
//   payload?: TooltipItem[];
//   label?: string | number;
//   formatter?: (value: any, name: any, entry: TooltipItem, index: number) => React.ReactNode;
//   labelFormatter?: (value: any, payload?: TooltipItem[]) => React.ReactNode;
//   indicator?: "line" | "dot" | "dashed";
//   hideLabel?: boolean;
//   hideIndicator?: boolean;
//   color?: string;
//   nameKey?: string;
//   labelKey?: string;
//   labelClassName?: string;
// } & Omit<React.HTMLAttributes<HTMLDivElement>, "children">;

// const ChartTooltip = RechartsPrimitive.Tooltip;

// function ChartTooltipContent(props: ChartTooltipContentProps) {
//   const {
//     active,
//     payload,
//     label,
//     formatter,
//     labelFormatter,
//     className,
//     indicator = "dot",
//     hideLabel = false,
//     hideIndicator = false,
//     color,
//     nameKey,
//     labelKey,
//     labelClassName,
//   } = props;

//   const { config } = useChart();

//   const tooltipLabel = React.useMemo(() => {
//     if (hideLabel || !payload?.length) return null;

//     const item = payload[0];
//     const key = `${labelKey || item.dataKey || item.name || "value"}`;
//     const itemConfig = getPayloadConfigFromPayload(config, item, key);
//     const value = !labelKey && typeof label === "string" ? (config[label as keyof typeof config]?.label || label) : itemConfig?.label;

//     if (labelFormatter) return <div className={cn("font-medium", labelClassName)}>{labelFormatter(value, payload)}</div>;
//     if (!value) return null;
//     return <div className={cn("font-medium", labelClassName)}>{value}</div>;
//   }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

//   if (!active || !payload?.length) return null;

//   const nestLabel = payload.length === 1 && indicator !== "dot";

//   return (
//     <div className={cn("border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl", className)}>
//       {!nestLabel ? tooltipLabel : null}
//       <div className="grid gap-1.5">
//         {payload.map((item, index) => {
//           const key = `${nameKey || item.name || item.dataKey || "value"}`;
//           const itemConfig = getPayloadConfigFromPayload(config, item, key);
//           const indicatorColor = color || item.payload?.fill || item.color;

//           return (
//             <div
//               key={String(item.dataKey ?? index)}
//               className={cn(
//                 "[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5",
//                 indicator === "dot" && "items-center"
//               )}
//             >
//               {formatter && item.value !== undefined && item.name ? (
//                 formatter(item.value, item.name, item, index)
//               ) : (
//                 <>
//                   {itemConfig?.icon ? (
//                     <itemConfig.icon />
//                   ) : (
//                     !hideIndicator && (
//                       <div
//                         className={cn("shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)", {
//                           "h-2.5 w-2.5": indicator === "dot",
//                           "w-1": indicator === "line",
//                           "w-0 border-[1.5px] border-dashed bg-transparent": indicator === "dashed",
//                           "my-0.5": nestLabel && indicator === "dashed",
//                         })}
//                         style={{ ["--color-bg" as any]: indicatorColor, ["--color-border" as any]: indicatorColor } as React.CSSProperties}
//                       />
//                     )
//                   )}
//                   <div className={cn("flex flex-1 justify-between leading-none", nestLabel ? "items-end" : "items-center")}>
//                     <div className="grid gap-1.5">
//                       {nestLabel ? tooltipLabel : null}
//                       <span className="text-muted-foreground">{itemConfig?.label || item.name}</span>
//                     </div>
//                     {item.value !== undefined && (
//                       <span className="text-foreground font-mono font-medium tabular-nums">{String(item.value).toLocaleString?.() ?? String(item.value)}</span>
//                     )}
//                   </div>
//                 </>
//               )}
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// /* ---------------- Legend ---------------- */
// type LegendItem = { value?: string | number; dataKey?: string; color?: string; };

// type ChartLegendContentProps = {
//   payload?: LegendItem[];
//   hideIcon?: boolean;
//   verticalAlign?: "top" | "bottom" | "middle";
//   nameKey?: string;
// } & Omit<React.HTMLAttributes<HTMLDivElement>, "children">;

// const ChartLegend = RechartsPrimitive.Legend;

// function ChartLegendContent({ className, hideIcon = false, payload, verticalAlign = "bottom", nameKey }: ChartLegendContentProps) {
//   const { config } = useChart();

//   if (!payload?.length) return null;

//   return (
//     <div className={cn("flex items-center justify-center gap-4", verticalAlign === "top" ? "pb-3" : "pt-3", className)}>
//       {payload.map((entry, idx) => {
//         const key = `${nameKey || ((entry.dataKey ?? entry.value) ?? idx)}`;
//         const itemConfig = getPayloadConfigFromPayload(config, entry, key);

//         return (
//           <div key={String(key)} className={cn("[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3")}>
//             {itemConfig?.icon && !hideIcon ? (
//               <itemConfig.icon />
//             ) : (
//               <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: entry.color }} />
//             )}
//             {itemConfig?.label}
//           </div>
//         );
//       })}
//     </div>
//   );
// }

// /* ---------------- helper ---------------- */
// function getPayloadConfigFromPayload(config: ChartConfig, payload: any, key: string) {
//   if (!payload || typeof payload !== "object") return undefined;

//   const payloadPayload = typeof payload.payload === "object" ? payload.payload : undefined;
//   let configLabelKey: string = key;

//   if (key in payload && typeof payload[key] === "string") {
//     configLabelKey = payload[key] as string;
//   } else if (payloadPayload && key in payloadPayload && typeof payloadPayload[key] === "string") {
//     configLabelKey = payloadPayload[key] as string;
//   }

//   return (configLabelKey in config ? config[configLabelKey] : config[key as keyof typeof config]) as any;
// }

// /* ---------------- exports ---------------- */
// export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle };
