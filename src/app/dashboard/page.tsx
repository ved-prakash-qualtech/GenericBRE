"use client";

import { useState } from "react";
import { Download, LayoutGrid, Sparkles } from "lucide-react";
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
import { ManageWidgetsSheet } from "@/components/dashboard/manage-widgets-sheet";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { downloadCsv } from "@/lib/csv";

// Each widget declares its own span within a 6-column grid (so the previous
// 3-col/2-col/1+2-col rows all become spans of one shared, reorderable flow).
// This is the store's `widgets` state actually driving the layout — visible +
// order come from Manage Widgets, not a hardcoded JSX arrangement.
//
// Every widget is capped at a uniform 240px (see the wrapper below) — content
// that runs longer scrolls internally rather than growing the card, so a
// dense role dashboard (5-6 widgets) never forces the page taller than needed.
const WIDGET_REGISTRY: Record<string, { span: string; heading?: string; render: () => React.ReactNode }> = {
  kpis: { span: "col-span-full", render: () => <KpiCards /> },
  "quick-actions": {
    span: "col-span-full md:col-span-1 xl:col-span-2",
    heading: "Quick Actions",
    render: () => <QuickActions /> },
  "recent-rules": { span: "col-span-full md:col-span-1 xl:col-span-2", render: () => <RecentRulesPanel /> },
  "recent-activity": { span: "col-span-full md:col-span-2 xl:col-span-2", render: () => <RecentActivityPanel /> },
  "domain-distribution": { span: "col-span-full md:col-span-1 xl:col-span-3", render: () => <DomainDistributionChart /> },
  "rule-status": { span: "col-span-full md:col-span-1 xl:col-span-3", render: () => <RuleStatusChart /> },
  "recent-deployments": { span: "col-span-full md:col-span-1 xl:col-span-2", render: () => <RecentDeploymentsPanel /> },
  "demo-scenarios": { span: "col-span-full md:col-span-1 xl:col-span-4", render: () => <DemoScenariosPanel /> },
  "draft-rules": { span: "col-span-full md:col-span-1 xl:col-span-2", render: () => <DraftRulesPanel /> },
  "rules-awaiting-review": { span: "col-span-full md:col-span-1 xl:col-span-2", render: () => <RulesAwaitingReviewPanel /> },
  "approval-queue": { span: "col-span-full md:col-span-1 xl:col-span-2", render: () => <ApprovalQueuePanel /> },
  "rule-conflicts": { span: "col-span-full md:col-span-1 xl:col-span-2", render: () => <RuleConflictsPanel /> },
  "execution-logs": { span: "col-span-full md:col-span-1 xl:col-span-2", render: () => <ExecutionLogsPanel /> },
  "environment-status": { span: "col-span-full md:col-span-1 xl:col-span-2", render: () => <EnvironmentStatusPanel /> },
  "decision-lookup": { span: "col-span-full md:col-span-1 xl:col-span-2", render: () => <DecisionLookupPanel /> },
};

export default function DashboardPage() {
  const rules = useAppStore((s) => s.rules);
  const widgets = useAppStore((s) => s.widgets);
  const showInsights = useAppStore((s) => s.appearance.showInsights);
  const [manageOpen, setManageOpen] = useState(false);

  const orderedVisible = [...widgets].filter((w) => w.visible).sort((a, b) => a.order - b.order);
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
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setManageOpen(true)}>
            <LayoutGrid className="size-3.5" /> Manage Widgets
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportSummary}>
            <Download className="size-3.5" /> Export
          </Button>
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
          <div className="grid grid-cols-1 items-start gap-2.5 md:grid-cols-2 xl:grid-cols-6">
            {orderedVisible.map((w) => {
              const widget = WIDGET_REGISTRY[w.id];
              if (!widget) return null;
              return (
                <div key={w.id} className={`flex max-h-60 flex-col gap-1.5 overflow-y-auto ${widget.span}`}>
                  {widget.heading && (
                    <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{widget.heading}</h2>
                  )}
                  <div className="min-h-0 flex-1">{widget.render()}</div>
                </div>
              );
            })}
            {orderedVisible.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                All widgets are hidden. Open Manage Widgets to bring some back.
              </div>
            )}
          </div>
        </div>
      </div>

      <ManageWidgetsSheet open={manageOpen} onOpenChange={setManageOpen} />
    </div>
  );
}
