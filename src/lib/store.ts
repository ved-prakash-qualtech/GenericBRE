"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ALL_RULES,
  AUDIT_LOG,
  MATRICES,
  NOTIFICATIONS,
} from "./mock-data";
import {
  AppNotification,
  AuditEntry,
  BusinessRule,
  CurrentUser,
  DecisionMatrix,
  Domain,
  MatrixRow,
  RuleStatus,
  SimulationResult,
  UserRole,
} from "./types";

export type ThemePreset = "client" | "enterprise-blue" | "modern-purple" | "emerald-green" | "midnight-navy";

export interface AppearanceSettings {
  preset: ThemePreset;
  colorMode: "light" | "dark";
  wallpaper: string | null; // data URI
  wallpaperOpacity: number;
  wallpaperBlur: number;
  wallpaperBrightness: number;
  logo: string | null; // data URI, overrides default brand mark
  glassPanels: boolean;
}

export interface DashboardWidgetState {
  id: string;
  visible: boolean;
  order: number;
}

const DEFAULT_APPEARANCE: AppearanceSettings = {
  preset: "client",
  colorMode: "light",
  wallpaper: null,
  wallpaperOpacity: 20,
  wallpaperBlur: 8,
  wallpaperBrightness: 100,
  logo: null,
  glassPanels: false,
};

const DEFAULT_WIDGETS: DashboardWidgetState[] = [
  { id: "kpis", visible: true, order: 0 },
  { id: "quick-actions", visible: true, order: 1 },
  { id: "recent-rules", visible: true, order: 2 },
  { id: "recent-activity", visible: true, order: 3 },
  { id: "domain-distribution", visible: true, order: 4 },
  { id: "rule-status", visible: true, order: 5 },
  { id: "recent-deployments", visible: true, order: 6 },
  { id: "demo-scenarios", visible: true, order: 7 },
];

const DEFAULT_USER: CurrentUser = { name: "Jyoti Sonani", role: "Business Analyst", initials: "JS" };

export interface GlobalFilters {
  domains: Domain[];
  statuses: RuleStatus[];
}

const DEFAULT_GLOBAL_FILTERS: GlobalFilters = { domains: [], statuses: [] };

interface AppState {
  rules: BusinessRule[];
  matrices: DecisionMatrix[];
  notifications: AppNotification[];
  auditLog: AuditEntry[];
  simulations: SimulationResult[];
  appearance: AppearanceSettings;
  widgets: DashboardWidgetState[];
  currentUser: CurrentUser;
  sidebarCollapsed: boolean;
  globalFilters: GlobalFilters;
  setGlobalFilters: (patch: Partial<GlobalFilters>) => void;
  resetGlobalFilters: () => void;

  // rules
  addRule: (rule: BusinessRule) => void;
  updateRule: (id: string, updater: (r: BusinessRule) => BusinessRule) => void;
  setRuleStatus: (id: string, status: RuleStatus) => void;
  cloneRule: (id: string) => string | undefined;
  archiveRule: (id: string) => void;
  deleteRule: (id: string) => void;

  // matrices
  updateMatrixRows: (matrixId: string, rows: MatrixRow[]) => void;
  addMatrixRow: (matrixId: string, row: MatrixRow) => void;
  updateMatrixRow: (matrixId: string, rowId: string, values: MatrixRow["values"]) => void;
  deleteMatrixRow: (matrixId: string, rowId: string) => void;
  duplicateMatrixRow: (matrixId: string, rowId: string) => void;

  // simulations
  addSimulation: (result: SimulationResult) => void;

  // notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  pushNotification: (n: Omit<AppNotification, "id" | "timestamp" | "read">) => void;

  // audit
  logAudit: (entry: Omit<AuditEntry, "id" | "timestamp">) => void;

  // appearance
  setAppearance: (patch: Partial<AppearanceSettings>) => void;
  resetAppearance: () => void;

  // dashboard widgets
  setWidgets: (widgets: DashboardWidgetState[]) => void;
  resetWidgets: () => void;

  // user
  setUserRole: (role: UserRole) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

let ruleIdSeq = 900;
let matrixRowSeq = 900;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      rules: ALL_RULES,
      matrices: MATRICES,
      notifications: NOTIFICATIONS,
      auditLog: AUDIT_LOG,
      simulations: [],
      appearance: DEFAULT_APPEARANCE,
      widgets: DEFAULT_WIDGETS,
      currentUser: DEFAULT_USER,
      sidebarCollapsed: false,
      globalFilters: DEFAULT_GLOBAL_FILTERS,
      setGlobalFilters: (patch) => set((s) => ({ globalFilters: { ...s.globalFilters, ...patch } })),
      resetGlobalFilters: () => set({ globalFilters: DEFAULT_GLOBAL_FILTERS }),

      addRule: (rule) => set((s) => ({ rules: [rule, ...s.rules] })),

      updateRule: (id, updater) =>
        set((s) => ({
          rules: s.rules.map((r) => (r.id === id ? updater(r) : r)),
        })),

      setRuleStatus: (id, status) => {
        set((s) => ({
          rules: s.rules.map((r) =>
            r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r
          ),
        }));
        const rule = get().rules.find((r) => r.id === id);
        get().logAudit({
          user: get().currentUser.name,
          action: `Status → ${status}`,
          entity: "BusinessRule",
          entityId: id,
          details: `${rule?.name ?? id} status changed to ${status}.`,
        });
      },

      cloneRule: (id) => {
        const source = get().rules.find((r) => r.id === id);
        if (!source) return undefined;
        ruleIdSeq += 1;
        const newId = `RL-${ruleIdSeq}`;
        const clone: BusinessRule = {
          ...source,
          id: newId,
          name: `${source.name} (Copy)`,
          status: "Draft",
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ rules: [clone, ...s.rules] }));
        get().logAudit({
          user: get().currentUser.name,
          action: "Cloned Rule",
          entity: "BusinessRule",
          entityId: newId,
          details: `Cloned from ${id} as Draft.`,
        });
        return newId;
      },

      archiveRule: (id) => get().setRuleStatus(id, "Archived"),

      deleteRule: (id) => set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),

      updateMatrixRows: (matrixId, rows) =>
        set((s) => ({
          matrices: s.matrices.map((m) =>
            m.id === matrixId ? { ...m, rows, updatedAt: new Date().toISOString() } : m
          ),
        })),

      addMatrixRow: (matrixId, row) =>
        set((s) => ({
          matrices: s.matrices.map((m) =>
            m.id === matrixId ? { ...m, rows: [...m.rows, row], updatedAt: new Date().toISOString() } : m
          ),
        })),

      updateMatrixRow: (matrixId, rowId, values) =>
        set((s) => ({
          matrices: s.matrices.map((m) =>
            m.id === matrixId
              ? {
                  ...m,
                  rows: m.rows.map((r) => (r.id === rowId ? { ...r, values } : r)),
                  updatedAt: new Date().toISOString(),
                }
              : m
          ),
        })),

      deleteMatrixRow: (matrixId, rowId) =>
        set((s) => ({
          matrices: s.matrices.map((m) =>
            m.id === matrixId
              ? { ...m, rows: m.rows.filter((r) => r.id !== rowId), updatedAt: new Date().toISOString() }
              : m
          ),
        })),

      duplicateMatrixRow: (matrixId, rowId) => {
        const matrix = get().matrices.find((m) => m.id === matrixId);
        const row = matrix?.rows.find((r) => r.id === rowId);
        if (!matrix || !row) return;
        matrixRowSeq += 1;
        const newRow: MatrixRow = { id: `R${matrixRowSeq}`, values: { ...row.values } };
        set((s) => ({
          matrices: s.matrices.map((m) =>
            m.id === matrixId ? { ...m, rows: [...m.rows, newRow], updatedAt: new Date().toISOString() } : m
          ),
        }));
      },

      addSimulation: (result) => set((s) => ({ simulations: [result, ...s.simulations].slice(0, 50) })),

      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),

      markAllNotificationsRead: () =>
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

      pushNotification: (n) =>
        set((s) => ({
          notifications: [
            { ...n, id: `N-${Date.now()}`, timestamp: new Date().toISOString(), read: false },
            ...s.notifications,
          ],
        })),

      logAudit: (entry) =>
        set((s) => ({
          auditLog: [
            { ...entry, id: `A-${Date.now()}`, timestamp: new Date().toISOString() },
            ...s.auditLog,
          ],
        })),

      setAppearance: (patch) => set((s) => ({ appearance: { ...s.appearance, ...patch } })),
      resetAppearance: () => set({ appearance: DEFAULT_APPEARANCE }),

      setWidgets: (widgets) => set({ widgets }),
      resetWidgets: () => set({ widgets: DEFAULT_WIDGETS }),

      setUserRole: (role) =>
        set((s) => ({
          currentUser: {
            ...s.currentUser,
            role,
            initials: role
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase(),
          },
        })),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: "bre-prototype-store",
      version: 1,
      skipHydration: true,
    }
  )
);
