import { NotifyStep } from "@/lib/types";
import { NOTIFY_STEP_STYLES } from "@/lib/notify-vocabulary";
import { cn } from "@/lib/utils";

// Canonical read-only rendering of one workflow step — used by the detail
// view. Colors come from the shared NOTIFY_STEP_STYLES map so this can never
// drift out of dark-mode sync with the builder's editable rows (NOTIFYX
// blueprint gap G-11).
export function StepBlock({ step }: { step: NotifyStep }) {
  const style = NOTIFY_STEP_STYLES[step.kind];

  return (
    <div className={cn("flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm", style.classes)}>
      <span className="shrink-0 rounded-full bg-background/60 px-1.5 py-0.5 text-sm font-bold tracking-wide">
        {style.label}
      </span>
      <p className="min-w-0 flex-1 leading-relaxed">
        {step.kind === "condition" && (
          <>
            <span className="font-semibold">{step.field}</span> {step.operator}{" "}
            <span className="font-semibold">{step.value || "…"}</span>
          </>
        )}
        {step.kind === "action" && (
          <>
            <span className="font-semibold">{step.actionType}</span> → {step.recipient}
            {step.message && <>: &quot;{step.message}&quot;</>}
          </>
        )}
        {step.kind === "wait" && (
          <>
            Wait <span className="font-semibold">{step.duration}</span>
          </>
        )}
      </p>
    </div>
  );
}
