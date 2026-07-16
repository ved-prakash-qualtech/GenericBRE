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
      <div className="space-y-2 p-5 sm:p-6">
        {simulations.map((sim) => {
          const expanded = expandedId === sim.id;
          return (
            <div key={sim.id} className="rounded-xl border bg-card">
              <button
                onClick={() => setExpandedId(expanded ? null : sim.id)}
                className="flex w-full items-center gap-3 p-3.5 text-left"
              >
                {expanded ? (
                  <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                <OutcomeBadge outcome={sim.outcome} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{sim.summary}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(sim.timestamp).toLocaleString()} · {sim.totalDurationMs.toFixed(1)}ms ·{" "}
                    {sim.triggeredRules.length} rule{sim.triggeredRules.length === 1 ? "" : "s"} triggered
                    {sim.sandbox && " · sandbox"}
                  </p>
                </div>
                <span className={cn("shrink-0 font-mono text-[10px] text-muted-foreground")}>{sim.reasonCode}</span>
              </button>
              {expanded && (
                <div className="border-t p-3.5">
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
