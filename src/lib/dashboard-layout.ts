"use client";

import { useMemo } from "react";
import { useAppStore } from "./store";
import { WidgetDef, WidgetSize, DashboardWidgetLayoutState } from "./types";

export const WIDGET_SIZE_LABEL: Record<WidgetSize, string> = { SM: "SM", MD: "MD", LG: "LG" };

// Grid column spans for each size token, within the dashboard's 6-column
// xl grid — SM/MD/LG map to roughly a third/half/two-thirds of a row.
export const WIDGET_SIZE_SPAN: Record<WidgetSize, string> = {
  SM: "col-span-full md:col-span-1 xl:col-span-2",
  MD: "col-span-full md:col-span-2 xl:col-span-3",
  LG: "col-span-full md:col-span-2 xl:col-span-4",
};

function defaultLayout(widgetDefs: WidgetDef[]): DashboardWidgetLayoutState[] {
  return widgetDefs
    .map((d) => ({ id: d.id, order: d.defaultOrder, size: d.defaultSize, hidden: false }))
    .sort((a, b) => a.order - b.order);
}

// Merges the page's current widget catalog with whatever's persisted for
// this key — additive in both directions, so neither side has to migrate:
// a widget added to the page after a user already customized their layout
// just appears at the back; one removed from the page's catalog is
// silently dropped from a persisted layout that still references it.
function resolveLayout(widgetDefs: WidgetDef[], persisted: DashboardWidgetLayoutState[] | undefined): DashboardWidgetLayoutState[] {
  if (!persisted || persisted.length === 0) return defaultLayout(widgetDefs);
  const defsById = new Map(widgetDefs.map((d) => [d.id, d]));
  const known = persisted.filter((p) => defsById.has(p.id));
  const knownIds = new Set(known.map((p) => p.id));
  const missing = defaultLayout(widgetDefs.filter((d) => !knownIds.has(d.id)));
  return [...known, ...missing].sort((a, b) => a.order - b.order);
}

export interface UseDashboardLayoutResult {
  /** Full resolved layout (visible + hidden), in display order. */
  layout: DashboardWidgetLayoutState[];
  /** `layout` minus hidden widgets — what the page should actually render. */
  visibleWidgets: DashboardWidgetLayoutState[];
  defsById: Map<string, WidgetDef>;
  totalCount: number;
  visibleCount: number;
  reorder: (orderedIds: string[]) => void;
  toggleVisibility: (id: string) => void;
  setSize: (id: string, size: WidgetSize) => void;
  resetLayout: () => void;
}

// Drop this on any dashboard-style page: give it a unique key and the
// page's widget catalog, and it resolves + persists that page's per-user
// layout (order, size, visibility) — order/hide/resize writes apply
// immediately, no manual save step.
export function useDashboardLayout(dashboardKey: string, widgetDefs: WidgetDef[]): UseDashboardLayoutResult {
  const persisted = useAppStore((s) => s.dashboardLayouts[dashboardKey]);
  const setDashboardLayout = useAppStore((s) => s.setDashboardLayout);
  const resetDashboardLayout = useAppStore((s) => s.resetDashboardLayout);

  const layout = useMemo(() => resolveLayout(widgetDefs, persisted), [widgetDefs, persisted]);
  const defsById = useMemo(() => new Map(widgetDefs.map((d) => [d.id, d])), [widgetDefs]);

  const reorder = (orderedIds: string[]) => {
    const byId = new Map(layout.map((w) => [w.id, w]));
    const next = orderedIds.map((id, i) => ({ ...byId.get(id)!, order: i }));
    setDashboardLayout(dashboardKey, next);
  };

  const toggleVisibility = (id: string) => {
    setDashboardLayout(dashboardKey, layout.map((w) => (w.id === id ? { ...w, hidden: !w.hidden } : w)));
  };

  const setSize = (id: string, size: WidgetSize) => {
    setDashboardLayout(dashboardKey, layout.map((w) => (w.id === id ? { ...w, size } : w)));
  };

  const resetLayout = () => resetDashboardLayout(dashboardKey);

  const visibleWidgets = layout.filter((w) => !w.hidden);

  return {
    layout,
    visibleWidgets,
    defsById,
    totalCount: layout.length,
    visibleCount: visibleWidgets.length,
    reorder,
    toggleVisibility,
    setSize,
    resetLayout,
  };
}
