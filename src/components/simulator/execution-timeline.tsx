"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, MinusCircle, CircleSlash, ChevronDown } from "lucide-react";
import { TraceStep } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  Passed: { icon: CheckCircle2, color: "text-emerald-500", line: "bg-emerald-500/40", label: "Passed" },
  Failed: { icon: XCircle, color: "text-red-500", line: "bg-red-500/40", label: "Failed" },
  Skipped: { icon: MinusCircle, color: "text-muted-foreground", line: "bg-border", label: "Skipped" },
  "Not Applicable": { icon: CircleSlash, color: "text-muted-foreground/60", line: "bg-border", label: "N/A" },
} as const;

function coerceNum(v: string) {
  const n = parseFloat(v.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function ThresholdBar({ actual, expected, passed }: { actual: string; expected: string; passed: boolean }) {
  const a = coerceNum(actual);
  const e = coerceNum(expected.split(/[–-]/)[0]);
  if (a === null || e === null || e === 0) return null;
  const ratio = Math.min(1.4, a / e);
  return (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full", passed ? "bg-emerald-500" : "bg-red-500")}
        style={{ width: `${Math.min(100, ratio * 100)}%` }}
      />
    </div>
  );
}

function TimelineStep({ step, index }: { step: TraceStep; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const cfg = STATUS_CONFIG[step.status];
  const Icon = cfg.icon;
  const hasDetails = step.conditionSummaries.length > 0;

  return (
    <div className="relative flex gap-3 pb-4 last:pb-0">
      <div className="flex flex-col items-center">
        <Icon className={cn("size-5 shrink-0", cfg.color)} />
        <div className={cn("mt-1 w-px flex-1", cfg.line)} />
      </div>
      <div className="min-w-0 flex-1 pb-1">
        <button
          onClick={() => hasDetails && setOpen((o) => !o)}
          className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left", hasDetails && "hover:bg-accent/50")}
        >
          <span className="font-mono text-xs text-muted-foreground">{step.ruleId}</span>
          <span className="truncate text-[13px] font-medium">{step.ruleName}</span>
          {step.sandbox && (
            <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              Sandbox
            </span>
          )}
          <span className={cn("ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", cfg.color)}>{cfg.label}</span>
          {step.durationMs > 0 && <span className="shrink-0 text-[10px] text-muted-foreground">{step.durationMs.toFixed(2)}ms</span>}
          {hasDetails && <ChevronDown className={cn("size-3 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />}
        </button>

        {open && hasDetails && (
          <div className="ml-2 mt-1 space-y-2 border-l pl-3">
            {step.conditionSummaries.map((c, i) => (
              <div key={i} className="rounded-md bg-muted/30 px-2.5 py-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.field}</span>
                  {c.passed ? (
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                  ) : (
                    <XCircle className="size-3.5 text-red-500" />
                  )}
                </div>
                <p className="mt-0.5 text-muted-foreground">
                  Expected <span className="font-mono text-foreground">{c.operator} {c.expected}</span> · Actual{" "}
                  <span className="font-mono text-foreground">{c.actual}</span>
                </p>
                <ThresholdBar actual={c.actual} expected={c.expected} passed={c.passed} />
              </div>
            ))}
            {step.actionsApplied.length > 0 && (
              <div className="text-[11px] text-muted-foreground">
                Action{step.actionsApplied.length > 1 ? "s" : ""} applied: {step.actionsApplied.map((a) => a.type).join(", ")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ExecutionTimeline({ trace }: { trace: TraceStep[] }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Rule Trace — Evaluation Order &amp; Execution Timeline
      </p>
      <div>
        {trace.map((step, i) => (
          <TimelineStep key={step.ruleId} step={step} index={i} />
        ))}
      </div>
    </div>
  );
}
