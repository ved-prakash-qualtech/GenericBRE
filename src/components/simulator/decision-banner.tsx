"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { SimulationResult } from "@/lib/types";
import { cn } from "@/lib/utils";

const CONFIG = {
  Approved: {
    icon: CheckCircle2,
    classes: "from-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  Rejected: {
    icon: XCircle,
    classes: "from-red-500/15 border-red-500/30 text-red-700 dark:text-red-400",
    dot: "bg-red-500",
  },
  "Review Required": {
    icon: AlertCircle,
    classes: "from-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
} as const;

export function DecisionBanner({ result }: { result: SimulationResult }) {
  const cfg = CONFIG[result.outcome];
  const Icon = cfg.icon;

  return (
    <motion.div
      key={result.id}
      initial={{ opacity: 0, y: -8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={cn("rounded-xl border bg-gradient-to-br to-transparent p-5", cfg.classes)}
    >
      <div className="flex flex-wrap items-start gap-4">
        <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-full bg-current/10")}>
          <Icon className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold tracking-tight">{result.outcome.toUpperCase()}</p>
          <p className="mt-0.5 text-sm text-foreground/80">{result.summary}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground/60">
            <span>Reason: <span className="font-mono font-medium">{result.reasonCode}</span></span>
            <span>·</span>
            <span>Evaluated in {result.totalDurationMs.toFixed(1)}ms</span>
            <span>·</span>
            <span>{result.triggeredRules.length} rule{result.triggeredRules.length !== 1 ? "s" : ""} triggered</span>
          </div>
        </div>
        {Object.keys(result.calculatedValues).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(result.calculatedValues).map(([k, v]) => (
              <div key={k} className="rounded-lg border bg-background/70 px-3 py-1.5 text-right">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.replace(/_/g, " ")}</p>
                <p className="text-sm font-semibold text-foreground">{String(v)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
