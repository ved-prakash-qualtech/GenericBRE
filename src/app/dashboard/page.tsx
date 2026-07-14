"use client";

import { useState } from "react";
import { Download, Sparkles } from "lucide-react";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentRulesPanel, RecentActivityPanel, RecentDeploymentsPanel } from "@/components/dashboard/recent-panels";
import { DomainDistributionChart, RuleStatusChart } from "@/components/dashboard/charts";
import { DemoScenariosPanel } from "@/components/dashboard/demo-scenarios";
import {
  DraftRulesPanel,
  RulesAwaitingReviewPanel,
  ApprovalQueuePanel,
  RuleConflictsPanel,
  ExecutionLogsPanel,
  EnvironmentStatusPanel,
  DecisionLookupPanel,
} from "@/components/dashboard/persona-widgets";
import { WIDGET_LABELS } from "@/components/dashboard/manage-widgets-sheet";
import { DashboardControls } from "@/components/dashboard/dashboard-controls";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useDashboardLayout, WIDGET_SIZE_SPAN } from "@/lib/dashboard-layout";
import { WidgetDef, WidgetSize } from "@/lib/types";
import { downloadCsv } from "@/lib/csv";

// The render function for every widget except `kpis` (which stays pinned,
// full-width, outside the reorderable/resizable set — see DASHBOARD_WIDGET_DEFS
// below). Every one of these is built on Base UI's <ScrollArea> or otherwise
// needs a genuinely fixed card height, not max-height — ScrollArea's internal
// Viewport is styled `height: 100%`, and a CSS percentage height only
// resolves against an ancestor with an explicit `height`; one derived from
// max-height/flex-grow doesn't count, per spec.
const WIDGET_RENDERERS: Record<string, () => React.ReactNode> = {
  "quick-actions": () => <QuickActions />,
  "recent-rules": () => <RecentRulesPanel />,
  "recent-activity": () => <RecentActivityPanel />,
  "domain-distribution": () => <DomainDistributionChart />,
  "rule-status": () => <RuleStatusChart />,
  "recent-deployments": () => <RecentDeploymentsPanel />,
  "demo-scenarios": () => <DemoScenariosPanel />,
  "draft-rules": () => <DraftRulesPanel />,
  "rules-awaiting-review": () => <RulesAwaitingReviewPanel />,
  "approval-queue": () => <ApprovalQueuePanel />,
  "rule-conflicts": () => <RuleConflictsPanel />,
  "execution-logs": () => <ExecutionLogsPanel />,
  "environment-status": () => <EnvironmentStatusPanel />,
  "decision-lookup": () => <DecisionLookupPanel />,
};

const WIDGET_DEFAULT_SIZE: Record<string, WidgetSize> = { "demo-scenarios": "LG" };

export default function DashboardPage() {
  const rules = useAppStore((s) => s.rules);
  const showInsights = useAppStore((s) => s.appearance.showInsights);
  const roleId = useAppStore((s) => s.currentUser.role);
  const dashboardConfigs = useAppStore((s) => s.dashboardConfigs);
  const [editMode, setEditMode] = useState(false);

  // The widget catalog for this page is scoped to the current role's
  // admin-configured defaults (Configuration Studio → Dashboard Management,
  // BRD §5.3) — a Business Analyst can reorder/hide/resize the widgets
  // curated for them, not reveal a different persona's widgets entirely.
  const roleWidgets = dashboardConfigs[roleId]?.widgets ?? [];
  const widgetDefs: WidgetDef[] = roleWidgets
    .filter((w) => w.visible && w.id !== "kpis")
    .map((w) => ({
      id: w.id,
      label: WIDGET_LABELS[w.id] ?? w.id,
      defaultSize: WIDGET_DEFAULT_SIZE[w.id] ?? "SM",
      defaultOrder: w.order,
    }));
  const dashboardKey = `bre-overview:${roleId}`;
  const { visibleWidgets, reorder } = useDashboardLayout(dashboardKey, widgetDefs);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const handleGridDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }
    const ids = visibleWidgets.map((w) => w.id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    ids.splice(from, 1);
    ids.splice(to, 0, draggedId);
    reorder(ids);
    setDraggedId(null);
  };

  const pendingReview = rules.filter((r) => r.status === "Testing").length;
  const criticalDrafts = rules.filter((r) => r.status === "Draft" && r.priority === 1).length;

  const exportSummary = () => {
    downloadCsv(
      "bre_dashboard_summary",
      rules.map((r) => ({
        RuleID: r.id,
        Name: r.name,
        Domain: r.domain,
        Category: r.category,
        Priority: r.priority,
        Status: r.status,
        Owner: r.owner,
        UpdatedAt: r.updatedAt,
      }))
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b bg-card/40 px-4 py-2.5 sm:px-5">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground">Central workspace for the Business Rules Engine</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportSummary}>
            <Download className="size-3.5" /> Export
          </Button>
          <DashboardControls
            dashboardKey={dashboardKey}
            widgetDefs={widgetDefs}
            editMode={editMode}
            onEditModeChange={setEditMode}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2.5 sm:px-5">
        <div className="mx-auto max-w-350">
          {showInsights && (pendingReview > 0 || criticalDrafts > 0) && (
            <div className="mb-2.5 flex items-center gap-2.5 rounded-xl border bg-accent px-3.5 py-1.5 text-xs text-accent-foreground">
              <Sparkles className="size-4 shrink-0 text-primary" />
              <p>
                <span className="font-semibold">Smart Insight:</span>{" "}
                {pendingReview > 0 && (
                  <>
                    {pendingReview} rule{pendingReview === 1 ? "" : "s"} awaiting review
                    {criticalDrafts > 0 ? " · " : "."}
                  </>
                )}
                {criticalDrafts > 0 && <>{criticalDrafts} critical-priority rule{criticalDrafts === 1 ? "" : "s"} still in Draft.</>}
              </p>
            </div>
          )}
          <div className="mb-2.5">
            <KpiCards />
          </div>
          <div className="grid grid-cols-1 items-start gap-2.5 md:grid-cols-2 xl:grid-cols-6">
            {visibleWidgets.map((w) => {
              const render = WIDGET_RENDERERS[w.id];
              if (!render) return null;
              return (
                <div
                  key={w.id}
                  draggable={editMode}
                  onDragStart={() => editMode && setDraggedId(w.id)}
                  onDragOver={(e) => editMode && e.preventDefault()}
                  onDrop={() => editMode && handleGridDrop(w.id)}
                  onDragEnd={() => setDraggedId(null)}
                  className={`flex h-60 flex-col gap-1.5 ${WIDGET_SIZE_SPAN[w.size]} ${
                    editMode ? "cursor-grab rounded-xl outline-dashed outline-2 outline-primary/30 active:cursor-grabbing" : ""
                  }`}
                >
                  <div className="min-h-0 flex-1">{render()}</div>
                </div>
              );
            })}
            {visibleWidgets.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                All widgets are hidden. Open Dashboard Controls → Manage Widgets to bring some back.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
