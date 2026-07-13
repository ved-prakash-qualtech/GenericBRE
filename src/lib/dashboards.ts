import { DashboardConfig } from "./types";

function widgets(ids: string[]): DashboardConfig["widgets"] {
  return ids.map((id, order) => ({ id, visible: true, order }));
}

// Seed data only — fully editable at runtime via Configuration Studio →
// Dashboard Management. Built from BRD §5.3's Persona-to-Module Mapping:
// each role's landing route is its primary module, its widget set favors
// the panels most relevant to that persona's responsibilities, and its
// KPIs/Quick Actions surface the numbers and shortcuts that role acts on.
export const DEFAULT_DASHBOARD_CONFIGS: Record<string, DashboardConfig> = {
  "business-analyst": {
    roleId: "business-analyst",
    landingRoute: "/dashboard",
    widgets: widgets(["kpis", "quick-actions", "draft-rules", "rules-awaiting-review", "recent-rules", "demo-scenarios"]),
    kpis: ["draft-rules", "pending-review", "active-rules", "rule-executions"],
    quickActions: ["create-rule", "open-repository", "run-simulator"],
  },
  "product-manager": {
    roleId: "product-manager",
    landingRoute: "/dashboard",
    widgets: widgets(["kpis", "domain-distribution", "rule-status", "approval-queue", "recent-deployments", "recent-activity"]),
    kpis: ["active-rules", "pending-approvals", "deployments", "rule-executions"],
    quickActions: ["decision-matrix", "view-approvals", "open-repository"],
  },
  "risk-manager": {
    roleId: "risk-manager",
    landingRoute: "/dashboard",
    widgets: widgets(["kpis", "rule-conflicts", "approval-queue", "rules-awaiting-review", "domain-distribution", "recent-activity"]),
    kpis: ["rule-conflicts", "pending-approvals", "pending-review", "active-rules"],
    quickActions: ["view-approvals", "open-repository", "run-simulator"],
  },
  underwriter: {
    roleId: "underwriter",
    landingRoute: "/simulator",
    widgets: widgets(["kpis", "recent-rules", "demo-scenarios", "recent-activity"]),
    kpis: ["rule-executions", "failed-simulations", "active-rules", "pending-review"],
    quickActions: ["run-simulator", "open-repository"],
  },
  operations: {
    roleId: "operations",
    landingRoute: "/simulator",
    widgets: widgets(["kpis", "decision-lookup", "execution-logs", "environment-status", "recent-activity"]),
    kpis: ["rule-executions", "failed-simulations", "deployments", "total-rules"],
    quickActions: ["run-simulator", "open-repository"],
  },
  sysadmin: {
    roleId: "sysadmin",
    landingRoute: "/settings",
    widgets: widgets(["kpis", "environment-status", "execution-logs", "domain-distribution", "rule-status", "recent-activity"]),
    kpis: ["total-rules", "active-rules", "business-categories", "deployments", "rule-executions"],
    quickActions: ["configuration-studio", "open-repository", "decision-matrix"],
  },
};
