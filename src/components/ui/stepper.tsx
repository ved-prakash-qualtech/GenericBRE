"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepperStep {
  id: string;
  label: string;
}

// A numbered-circle + connector-line progress indicator — generalized from
// the static "Rule Lifecycle" pattern on the login page (src/app/login/page.tsx)
// into a real, reusable, interactive primitive (click-to-jump + live
// completed/current state instead of one hardcoded stage index).
export function Stepper({
  steps,
  currentStepId,
  completedStepIds,
  onStepClick,
  className,
}: {
  steps: StepperStep[];
  currentStepId?: string;
  completedStepIds: string[];
  onStepClick?: (id: string) => void;
  className?: string;
}) {
  const completed = new Set(completedStepIds);

  return (
    <div className={cn("flex items-start", className)}>
      {steps.map((step, i) => {
        const isCompleted = completed.has(step.id);
        const isCurrent = step.id === currentStepId;
        const clickable = !!onStepClick;
        return (
          <div key={step.id} className="flex flex-1 items-center last:flex-none">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onStepClick?.(step.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-md px-1 py-0.5",
                clickable && "cursor-pointer hover:opacity-80"
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                      ? "border-2 border-primary text-primary"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "max-w-20 text-center text-[10.5px] leading-tight text-wrap",
                  isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div className={cn("mx-1.5 mt-3.5 h-px min-w-4 flex-1", isCompleted ? "bg-primary" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
