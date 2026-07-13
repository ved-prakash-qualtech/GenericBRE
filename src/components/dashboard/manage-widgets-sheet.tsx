"use client";

import { RotateCcw } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { WidgetReorderList } from "./widget-reorder-list";

export const WIDGET_LABELS: Record<string, string> = {
  kpis: "KPI Cards",
  "quick-actions": "Quick Actions",
  "recent-rules": "Recently Modified Rules",
  "recent-activity": "Recent Activity",
  "domain-distribution": "Domain Distribution",
  "rule-status": "Rule Status Breakdown",
  "recent-deployments": "Recent Deployments",
  "demo-scenarios": "Preconfigured Demo Scenarios",
  "draft-rules": "Draft Rules",
  "rules-awaiting-review": "Rules Awaiting Review",
  "approval-queue": "Approval Queue",
  "rule-conflicts": "Rule Conflicts",
  "execution-logs": "Execution Logs",
  "environment-status": "Environment Status",
  "decision-lookup": "Decision Lookup",
};

export function ManageWidgetsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const widgets = useAppStore((s) => s.widgets);
  const setWidgets = useAppStore((s) => s.setWidgets);
  const resetWidgets = useAppStore((s) => s.resetWidgets);

  const toggleVisible = (id: string) => {
    setWidgets(widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Manage Widgets</SheetTitle>
          <SheetDescription>Drag to reorder, toggle to show or hide. Changes save automatically.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <WidgetReorderList items={widgets} labels={WIDGET_LABELS} onReorder={setWidgets} onToggleVisible={toggleVisible} />
          <Button variant="outline" size="sm" className="mt-4 w-full gap-1.5" onClick={resetWidgets}>
            <RotateCcw className="size-3.5" /> Reset to Default Layout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
