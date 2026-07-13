"use client";

import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { DashboardConfig } from "@/lib/types";
import { WIDGET_LABELS } from "@/components/dashboard/manage-widgets-sheet";
import { WidgetReorderList } from "@/components/dashboard/widget-reorder-list";
import { KPI_LABELS, DEFAULT_KPI_IDS } from "@/components/dashboard/kpi-cards";
import { ACTION_LABELS, DEFAULT_ACTION_IDS } from "@/components/dashboard/quick-actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { iconForRole } from "@/lib/role-icons";

const LANDING_ROUTES: { value: string; label: string }[] = [
  { value: "/dashboard", label: "Dashboard" },
  { value: "/rule-builder", label: "Rule Builder" },
  { value: "/repository", label: "Rule Repository" },
  { value: "/matrix", label: "Decision Matrix" },
  { value: "/simulator", label: "Rule Simulator" },
  { value: "/settings", label: "Configuration Studio" },
];

const ALL_WIDGET_IDS = Object.keys(WIDGET_LABELS);
const ALL_KPI_IDS = Object.keys(KPI_LABELS);
const ALL_ACTION_IDS = Object.keys(ACTION_LABELS);

function CheckboxPicker({
  allIds,
  labels,
  selected,
  onToggle,
}: {
  allIds: string[];
  labels: Record<string, string>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {allIds.map((id) => (
        <label key={id} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-muted">
          <Checkbox checked={selected.includes(id)} onCheckedChange={() => onToggle(id)} />
          {labels[id] ?? id}
        </label>
      ))}
    </div>
  );
}

export function DashboardManagementManager() {
  const roles = useAppStore((s) => s.roles);
  const dashboardConfigs = useAppStore((s) => s.dashboardConfigs);
  const setDashboardConfig = useAppStore((s) => s.setDashboardConfig);

  const configFor = (roleId: string): DashboardConfig =>
    dashboardConfigs[roleId] ?? {
      roleId,
      landingRoute: "/dashboard",
      widgets: ALL_WIDGET_IDS.map((id, order) => ({ id, visible: true, order })),
      kpis: DEFAULT_KPI_IDS,
      quickActions: DEFAULT_ACTION_IDS,
    };

  const updateConfig = (roleId: string, patch: Partial<DashboardConfig>) => {
    setDashboardConfig(roleId, { ...configFor(roleId), roleId, ...patch });
    toast.success(`Dashboard defaults for "${roles.find((r) => r.id === roleId)?.name}" updated.`);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        For each role: where they land after signing in or switching roles, and which dashboard widgets are visible by
        default. A user can still personalize their own layout afterward from Manage Widgets — this just sets the
        starting point per BRD §5.3&apos;s Persona-to-Module Mapping.
      </p>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {roles.map((role) => {
          const config = configFor(role.id);
          const Icon = iconForRole(role.icon);

          const setLandingRoute = (route: string) => updateConfig(role.id, { landingRoute: route });
          const reorder = (widgets: DashboardConfig["widgets"]) => updateConfig(role.id, { widgets });
          const toggleVisible = (id: string) =>
            updateConfig(role.id, {
              widgets: config.widgets.some((w) => w.id === id)
                ? config.widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w))
                : [...config.widgets, { id, visible: true, order: config.widgets.length }],
            });
          const kpis = config.kpis?.length ? config.kpis : DEFAULT_KPI_IDS;
          const toggleKpi = (id: string) =>
            updateConfig(role.id, { kpis: kpis.includes(id) ? kpis.filter((k) => k !== id) : [...kpis, id] });
          const actions = config.quickActions?.length ? config.quickActions : DEFAULT_ACTION_IDS;
          const toggleAction = (id: string) =>
            updateConfig(role.id, { quickActions: actions.includes(id) ? actions.filter((a) => a !== id) : [...actions, id] });

          return (
            <div key={role.id} className="space-y-3 rounded-xl border bg-card p-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{role.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{role.personaName}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Landing Route</label>
                <Select value={config.landingRoute} onValueChange={(v) => setLandingRoute((v as string) ?? "/dashboard")}>
                  <SelectTrigger size="sm" className="h-8 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANDING_ROUTES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">KPI Cards</label>
                <CheckboxPicker allIds={ALL_KPI_IDS} labels={KPI_LABELS} selected={kpis} onToggle={toggleKpi} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Quick Actions</label>
                <CheckboxPicker allIds={ALL_ACTION_IDS} labels={ACTION_LABELS} selected={actions} onToggle={toggleAction} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Default Widgets</label>
                <div className="max-h-72 overflow-y-auto pr-1">
                  <WidgetReorderList items={config.widgets} labels={WIDGET_LABELS} onReorder={reorder} onToggleVisible={toggleVisible} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
