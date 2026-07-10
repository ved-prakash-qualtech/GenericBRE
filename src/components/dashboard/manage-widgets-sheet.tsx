"use client";

import { Reorder } from "framer-motion";
import { GripVertical, RotateCcw, Eye, EyeOff } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export const WIDGET_LABELS: Record<string, string> = {
  kpis: "KPI Cards",
  "quick-actions": "Quick Actions",
  "recent-rules": "Recently Modified Rules",
  "recent-activity": "Recent Activity",
  "domain-distribution": "Domain Distribution",
  "rule-status": "Rule Status Breakdown",
  "recent-deployments": "Recent Deployments",
  "demo-scenarios": "Preconfigured Demo Scenarios",
};

export function ManageWidgetsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const widgets = useAppStore((s) => s.widgets);
  const setWidgets = useAppStore((s) => s.setWidgets);
  const resetWidgets = useAppStore((s) => s.resetWidgets);

  const ordered = [...widgets].sort((a, b) => a.order - b.order);

  const handleReorder = (newOrder: typeof ordered) => {
    setWidgets(newOrder.map((w, i) => ({ ...w, order: i })));
  };

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
          <Reorder.Group axis="y" values={ordered} onReorder={handleReorder} className="space-y-2">
            {ordered.map((w) => (
              <Reorder.Item
                key={w.id}
                value={w}
                className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 shadow-sm"
              >
                <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" />
                <span className={`flex-1 text-sm ${w.visible ? "" : "text-muted-foreground/60 line-through"}`}>
                  {WIDGET_LABELS[w.id] ?? w.id}
                </span>
                <Button variant="ghost" size="icon-sm" onClick={() => toggleVisible(w.id)} aria-label={w.visible ? "Hide widget" : "Show widget"}>
                  {w.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5 text-muted-foreground" />}
                </Button>
              </Reorder.Item>
            ))}
          </Reorder.Group>
          <Button variant="outline" size="sm" className="mt-4 w-full gap-1.5" onClick={resetWidgets}>
            <RotateCcw className="size-3.5" /> Reset to Default Layout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
