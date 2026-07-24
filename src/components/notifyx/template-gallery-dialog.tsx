"use client";

import { Zap, LayoutTemplate } from "lucide-react";
import { NotifyWorkflowTemplate, NotifyCategory, NotifyTrigger } from "@/lib/types";
import { categoryClasses } from "@/lib/notify-vocabulary";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Reachable via a real "Import Template" button next to "+ New" (see
// workflow-catalog.tsx) — the source blueprint's own template dialog exists
// but nothing in its UI ever opens it (gap G-03); fixed here at the design
// stage by always wiring a visible entry point.
export function TemplateGalleryDialog({
  open,
  onOpenChange,
  templates,
  categories,
  triggers,
  onImport,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  templates: NotifyWorkflowTemplate[];
  categories: NotifyCategory[];
  triggers: NotifyTrigger[];
  onImport: (template: NotifyWorkflowTemplate) => void;
}) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const triggerById = new Map(triggers.map((t) => [t.id, t]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="size-4 text-primary" /> Import from Template
          </DialogTitle>
          <DialogDescription>Start from a prebuilt workflow — fully editable after import.</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-100 grid-cols-1 gap-2.5 overflow-y-auto sm:grid-cols-2">
          {templates.map((t) => {
            const category = categoryById.get(t.categoryId);
            const trigger = triggerById.get(t.triggerId);
            return (
              <button
                key={t.id}
                onClick={() => onImport(t)}
                className="group flex flex-col gap-1.5 rounded-xl border bg-card p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{t.name}</p>
                  <Zap className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
                {category && (
                  <Badge variant="outline" className={cn("w-fit text-sm", categoryClasses(category.colorToken))}>
                    {category.name}
                  </Badge>
                )}
                <p className="text-sm text-muted-foreground">Trigger: {trigger?.label ?? t.triggerId}</p>
                <p className="text-sm text-muted-foreground/70">{t.steps.length} steps configured</p>
              </button>
            );
          })}
          {templates.length === 0 && (
            <p className="col-span-full rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No templates available yet.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
