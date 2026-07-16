"use client";

import { useState } from "react";
import { ArrowLeft, ChevronDown, ChevronRight, PlayCircle, PauseCircle, Pencil, Trash2, Zap, History } from "lucide-react";
import { NotifyWorkflow, NotifyCategory, NotifyTrigger } from "@/lib/types";
import { categoryClasses, NOTIFY_STATUS_STYLES } from "@/lib/notify-vocabulary";
import { StepBlock } from "@/components/notifyx/step-block";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const RESULT_STYLES: Record<string, string> = {
  Success: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  Failed: "bg-red-500/12 text-red-600 dark:text-red-400 border-red-500/25",
  Skipped: "bg-slate-500/12 text-slate-600 dark:text-slate-400 border-slate-500/25",
};

export function WorkflowDetail({
  workflow,
  category,
  trigger,
  canEdit,
  canToggle,
  onBack,
  onEdit,
  onToggle,
  onDelete,
}: {
  workflow: NotifyWorkflow;
  category?: NotifyCategory;
  trigger?: NotifyTrigger;
  canEdit: boolean;
  canToggle: boolean;
  onBack: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [historyOpen, setHistoryOpen] = useState(true);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2 border-b pb-2.5">
        <Button variant="ghost" size="icon-sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <p className="text-sm font-semibold">{workflow.name}</p>
        <div className="ml-auto flex gap-1.5">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onEdit} disabled={!canEdit}>
            <Pencil className="size-3.5" /> Edit
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onToggle} disabled={!canToggle}>
            {workflow.status === "Active" ? <PauseCircle className="size-3.5" /> : <PlayCircle className="size-3.5" />}
            {workflow.status === "Active" ? "Pause" : "Activate"}
          </Button>
          {workflow.status === "Draft" && (
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={onDelete} disabled={!canEdit}>
              <Trash2 className="size-3.5" /> Delete
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm font-semibold">{workflow.name}</p>
                {category && (
                  <Badge variant="outline" className={cn("text-[9px]", categoryClasses(category.colorToken))}>{category.name}</Badge>
                )}
                <Badge variant="outline" className={cn("text-[9px]", NOTIFY_STATUS_STYLES[workflow.status])}>{workflow.status}</Badge>
              </div>
            </div>
            <div className="text-right text-[11px] text-muted-foreground">
              <p>{workflow.runCount} run{workflow.runCount === 1 ? "" : "s"} total</p>
              <p>Modified {new Date(workflow.updatedAt).toLocaleDateString()}</p>
              <p>By {workflow.createdBy}</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Trigger</p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <Zap className="size-3" /> WHEN: {trigger?.label ?? workflow.triggerId}
            </span>
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Automation Steps</p>
            {workflow.steps.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">No steps configured.</p>
            ) : (
              <div className="space-y-1.5">
                {workflow.steps.map((step, i) => (
                  <div key={step.id}>
                    <StepBlock step={step} />
                    {i < workflow.steps.length - 1 && <p className="py-0.5 text-center text-muted-foreground/50">↓</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card">
          <button
            onClick={() => setHistoryOpen((o) => !o)}
            className="flex w-full items-center gap-2 p-3.5 text-left"
            aria-expanded={historyOpen}
          >
            {historyOpen ? <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
            <History className="size-3.5 shrink-0 text-muted-foreground" />
            <p className="text-xs font-semibold">Execution History</p>
            <span className="ml-auto text-[11px] text-muted-foreground">{workflow.logs.length} entries</span>
          </button>
          {historyOpen && (
            <div className="divide-y border-t">
              {workflow.logs.length === 0 ? (
                <p className="p-4 text-center text-xs text-muted-foreground">No executions recorded yet.</p>
              ) : (
                workflow.logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs">
                    <div className="min-w-0">
                      <p className="truncate">{log.description}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                    <Badge variant="outline" className={cn("shrink-0 text-[9px]", RESULT_STYLES[log.result])}>{log.result}</Badge>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
