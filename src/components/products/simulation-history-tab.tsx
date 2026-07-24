"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, History } from "lucide-react";
import { SimulationResult } from "@/lib/types";
import { OutcomeBadge } from "@/components/status-badge";
import { ExecutionTimeline } from "@/components/simulator/execution-timeline";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Per-Product simulation history — filters the store's global `simulations`
// array (see src/lib/store.ts's addSimulation) down to this product via the
// `productId` stamped by executeRulesByProduct (src/lib/product-rule-engine.ts).
export function SimulationHistoryTab({ simulations }: { simulations: SimulationResult[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (simulations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center">
        <History className="size-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No simulations run for this product yet</p>
        <p className="text-xs text-muted-foreground/70">Runs from the Run Simulator tab appear here, newest first</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2.5 p-5 sm:p-6">
        {simulations.map((sim) => {
          const expanded = expandedId === sim.id;
          return (
            <div key={sim.id} className="rounded-xl border bg-card transition-all duration-150 hover:border-primary/40 hover:shadow-2xs">
              <button
                onClick={() => setExpandedId(expanded ? null : sim.id)}
                className="flex w-full items-center gap-3 p-3.5 text-left"
              >
                {expanded ? (
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                )}
                <OutcomeBadge outcome={sim.outcome} className="shrink-0 text-xs px-2 py-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground tracking-tight">{sim.summary}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {new Date(sim.timestamp).toLocaleString()} · <span className="font-mono text-foreground font-medium">{sim.totalDurationMs.toFixed(1)}ms</span> ·{" "}
                    <span className="font-medium text-foreground">{sim.triggeredRules.length} rule{sim.triggeredRules.length === 1 ? "" : "s"} triggered</span>
                    {sim.sandbox && <span className="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">sandbox</span>}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xs font-medium text-muted-foreground bg-muted/50 border border-border/80 px-2 py-0.5 rounded-md">
                  {sim.reasonCode}
                </span>
              </button>
              {expanded && (
                <div className="border-t p-3.5 bg-muted/10">
                  <ExecutionTimeline trace={sim.trace} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
