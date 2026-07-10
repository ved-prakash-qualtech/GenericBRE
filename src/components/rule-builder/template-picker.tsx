"use client";

import { LayoutTemplate, FileText } from "lucide-react";
import { RuleTemplate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

export function TemplatePicker({
  open,
  onOpenChange,
  templates,
  onUse,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  templates: RuleTemplate[];
  onUse: (template: RuleTemplate) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="size-4 text-primary" /> Start from a Template
          </DialogTitle>
          <DialogDescription>
            Pre-fills the condition and action builder below — everything stays fully editable afterward.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-100 space-y-2 overflow-y-auto">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => onUse(t)}
              className="flex w-full items-start gap-3 rounded-xl border bg-card p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
              </div>
            </button>
          ))}
          {templates.length === 0 && (
            <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
              No templates configured yet.
            </p>
          )}
        </div>
        <DialogClose render={<Button variant="outline" className="w-full" />}>Start Blank Instead</DialogClose>
      </DialogContent>
    </Dialog>
  );
}
