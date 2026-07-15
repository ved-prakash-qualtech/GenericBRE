// Shared execution mode labels and colors used by DecisionResultView.
// Extracted from rule-set-mapping-manager.tsx when the Execution Manager
// Studio components were removed. ExecutionMode itself lives in types.ts
// and is still used by DecisionFlowStep.mode.
import { ExecutionMode } from "./types";

export const MODE_LABELS: Record<ExecutionMode, string> = {
  sequential: "Sequential",
  parallel: "Parallel",
  "stop-on-first-match": "Stop on First Match",
  "execute-all": "Continue Execution",
  conditional: "Conditional",
};

export const MODE_COLORS: Record<ExecutionMode, string> = {
  sequential: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  parallel: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30",
  "stop-on-first-match": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  "execute-all": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  conditional: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
};
