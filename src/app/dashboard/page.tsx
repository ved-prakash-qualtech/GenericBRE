"use client";

import { Download } from "lucide-react";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentRulesPanel, RecentActivityPanel, RecentDeploymentsPanel } from "@/components/dashboard/recent-panels";
import { DomainDistributionChart, RuleStatusChart } from "@/components/dashboard/charts";
import { DemoScenariosPanel } from "@/components/dashboard/demo-scenarios";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { downloadCsv } from "@/lib/csv";

export default function DashboardPage() {
  const rules = useAppStore((s) => s.rules);

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
      <div className="flex shrink-0 items-center justify-between border-b bg-card/40 px-5 py-3.5 sm:px-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground">Central workspace for the Business Rules Engine</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={exportSummary}>
          <Download className="size-3.5" /> Export
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        <div className="mx-auto flex max-w-350 flex-col gap-5">
          <KpiCards />

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="flex flex-col gap-2">
              <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick Actions</h2>
              <QuickActions />
            </div>
            <div className="h-90">
              <RecentRulesPanel />
            </div>
            <div className="h-90">
              <RecentActivityPanel />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="h-64">
              <DomainDistributionChart />
            </div>
            <div className="h-64">
              <RuleStatusChart />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="h-56 xl:col-span-1">
              <RecentDeploymentsPanel />
            </div>
            <div className="h-56 xl:col-span-2">
              <DemoScenariosPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
