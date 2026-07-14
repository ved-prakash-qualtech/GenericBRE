"use client";

import { DecisionResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Target, GitCommitHorizontal, Zap } from "lucide-react";

const OPERATOR_TEXT: Record<string, string> = {
  "=": "equals",
  "!=": "does not equal",
  ">": "is greater than",
  "<": "is less than",
  ">=": "is at least",
  "<=": "is at most",
  contains: "contains",
  starts_with: "starts with",
  in: "is one of",
  between: "falls within",
};

export function DecisionCallout({ result }: { result: DecisionResult }) {
  const decidingStep = result.flatTrace.find((t) => t.ruleId === result.decidingRuleId);
  if (!decidingStep) return null;

  // The deciding rule's status is always "Passed" (its conditions matched, which is
  // why its action fired) — the first condition is the primary driver to surface here;
  // the full breakdown for every condition is available in the trace below.
  const keyCondition = decidingStep.conditionSummaries[0];

  const accent =
    result.outcome === "Approved"
      ? "text-emerald-600 dark:text-emerald-400"
      : result.outcome === "Rejected"
      ? "text-red-600 dark:text-red-400"
      : "text-amber-600 dark:text-amber-400";

  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Decision Explanation — Transparency Breakdown
      </p>
      <div className="space-y-2.5 text-[13px]">
        <div className="flex items-start gap-2.5">
          <Target className={cn("mt-0.5 size-4 shrink-0", accent)} />
          <div>
            <p className="text-muted-foreground">Target Rule Node</p>
            <p className="font-mono font-medium">{decidingStep.ruleId} <span className="font-sans font-normal text-foreground/80">— {decidingStep.ruleName}</span></p>
          </div>
        </div>
        {keyCondition && (
          <div className="flex items-start gap-2.5">
            <GitCommitHorizontal className={cn("mt-0.5 size-4 shrink-0", accent)} />
            <div>
              <p className="text-muted-foreground">Boundary Comparison</p>
              <p>
                Evaluated <span className="font-semibold">{keyCondition.field}</span> [
                <span className="font-mono">{keyCondition.actual}</span>] — configured condition:{" "}
                <span className="font-mono">
                  {OPERATOR_TEXT[keyCondition.operator] ?? keyCondition.operator} {keyCondition.expected}
                </span>
              </p>
            </div>
          </div>
        )}
        <div className="flex items-start gap-2.5">
          <Zap className={cn("mt-0.5 size-4 shrink-0", accent)} />
          <div>
            <p className="text-muted-foreground">Assigned System Action</p>
            <p>{result.summary}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
