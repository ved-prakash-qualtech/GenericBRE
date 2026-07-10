"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ALL_RULES,
  AUDIT_LOG,
  DEFAULT_ROLES,
  DEFAULT_RULE_GROUPS,
  DEFAULT_RULE_TEMPLATES,
  MATRICES,
  NOTIFICATIONS,
} from "./mock-data";
import {
  AppNotification,
  AppearanceSettings,
  ApprovalRequest,
  AuditEntry,
  BusinessField,
  BusinessRule,
  Capability,
  ColorMode,
  CurrentUser,
  DecisionMatrix,
  Domain,
  Industry,
  MatrixRow,
  Role,
  RuleGroup,
  RuleStatus,
  RuleTemplate,
  SimulationResult,
} from "./types";
import { DEFAULT_INDUSTRIES } from "./industries";
import { DEFAULT_FIELD_CATALOG, DEFAULT_CATEGORIES, DEFAULT_OWNERS } from "./fields";

export type {
  ThemePreset,
  ColorMode,
  DensityMode,
  FontScale,
  CustomColors,
  BackgroundPrefs,
  BackgroundTarget,
  BackgroundDisplayMode,
  AppearanceSettings,
} from "./types";

export interface DashboardWidgetState {
  id: string;
  visible: boolean;
  order: number;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  preset: "client",
  colorMode: "light",
  customColors: {},
  background: {
    imageData: null,
    target: "app",
    displayMode: "cover",
    opacity: 20,
    blur: 8,
    brightness: 100,
    dimOverlay: 0,
  },
  density: "compact",
  fontScale: "md",
  highContrast: false,
  largeClickTargets: false,
  showInsights: true,
  logo: null,
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

const DEFAULT_USER: CurrentUser = { name: "Ananya Verma", role: "business-analyst", initials: "AV" };

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

  // session — client-side only (no backend). `hasHydrated` tells consumers
  // (route guards) when the persisted value of `isAuthenticated` is actually
  // trustworthy, so we never bounce a real session to /login on first paint.
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  login: (roleId?: string) => void;
  logout: () => void;

  // configuration studio — the "no hardcoding" layer. Every industry/vertical,
  // business field, category and owner in the app is data here, not code.
  industries: Industry[];
  fieldCatalog: BusinessField[];
  categories: string[];
  owners: string[];
  addIndustry: (industry: Industry) => void;
  updateIndustry: (id: string, patch: Partial<Industry>) => void;
  deleteIndustry: (id: string) => void;
  addField: (field: BusinessField) => void;
  updateField: (key: string, patch: Partial<BusinessField>) => void;
  deleteField: (key: string) => void;
  addCategory: (name: string) => void;
  deleteCategory: (name: string) => void;
  addOwner: (name: string) => void;
  deleteOwner: (name: string) => void;

  // roles & capabilities — client-side RBAC preview (no backend enforcement)
  roles: Role[];
  addRole: (role: Role) => void;
  updateRole: (id: string, patch: Partial<Role>) => void;
  deleteRole: (id: string) => void;

  // rule groups (organizational collections, independent of Category)
  ruleGroups: RuleGroup[];
  addRuleGroup: (group: RuleGroup) => void;
  updateRuleGroup: (id: string, patch: Partial<RuleGroup>) => void;
  deleteRuleGroup: (id: string) => void;

  // rule templates (reusable starting shapes for the Rule Builder)
  ruleTemplates: RuleTemplate[];
  addRuleTemplate: (template: RuleTemplate) => void;
  deleteRuleTemplate: (id: string) => void;

  // approval workflow (BRD §5.5 governance: Draft -> Testing -> Review -> Publish)
  approvalRequests: ApprovalRequest[];
  submitForReview: (ruleId: string) => void;
  approveRule: (ruleId: string) => void;
  rejectRule: (ruleId: string, comment?: string) => void;

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
  setUserRole: (roleId: string) => void;
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

      isAuthenticated: false,
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),
      login: (roleId) => {
        if (roleId) get().setUserRole(roleId);
        set({ isAuthenticated: true });
        const { name, role } = get().currentUser;
        get().logAudit({ user: name, action: "Signed In", entity: "Session", entityId: role, details: `${name} signed in.` });
      },
      logout: () => {
        get().logAudit({ user: get().currentUser.name, action: "Signed Out", entity: "Session", entityId: get().currentUser.role, details: `${get().currentUser.name} signed out.` });
        set({ isAuthenticated: false });
      },

      industries: DEFAULT_INDUSTRIES,
      fieldCatalog: DEFAULT_FIELD_CATALOG,
      categories: DEFAULT_CATEGORIES,
      owners: DEFAULT_OWNERS,

      addIndustry: (industry) => {
        set((s) => ({ industries: [...s.industries, industry] }));
        get().logAudit({ user: get().currentUser.name, action: "Created Industry", entity: "Industry", entityId: industry.id, details: `Added "${industry.name}" as a new configurable industry.` });
      },
      updateIndustry: (id, patch) => {
        set((s) => ({ industries: s.industries.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
        get().logAudit({ user: get().currentUser.name, action: "Updated Industry", entity: "Industry", entityId: id, details: `Industry "${id}" updated.` });
      },
      deleteIndustry: (id) => {
        set((s) => ({ industries: s.industries.filter((i) => i.id !== id) }));
        get().logAudit({ user: get().currentUser.name, action: "Deleted Industry", entity: "Industry", entityId: id, details: `Industry "${id}" removed.` });
      },

      addField: (field) => {
        set((s) => ({ fieldCatalog: [...s.fieldCatalog, field] }));
        get().logAudit({ user: get().currentUser.name, action: "Created Field", entity: "BusinessField", entityId: field.key, details: `Added field "${field.label}" to the catalog.` });
      },
      updateField: (key, patch) => {
        set((s) => ({ fieldCatalog: s.fieldCatalog.map((f) => (f.key === key ? { ...f, ...patch } : f)) }));
        get().logAudit({ user: get().currentUser.name, action: "Updated Field", entity: "BusinessField", entityId: key, details: `Field "${key}" updated.` });
      },
      deleteField: (key) => {
        set((s) => ({ fieldCatalog: s.fieldCatalog.filter((f) => f.key !== key) }));
        get().logAudit({ user: get().currentUser.name, action: "Deleted Field", entity: "BusinessField", entityId: key, details: `Field "${key}" removed from the catalog.` });
      },

      addCategory: (name) => {
        set((s) => (s.categories.includes(name) ? s : { categories: [...s.categories, name] }));
        get().logAudit({ user: get().currentUser.name, action: "Created Category", entity: "Category", entityId: name, details: `Added category "${name}".` });
      },
      deleteCategory: (name) => {
        set((s) => ({ categories: s.categories.filter((c) => c !== name) }));
        get().logAudit({ user: get().currentUser.name, action: "Deleted Category", entity: "Category", entityId: name, details: `Removed category "${name}".` });
      },

      addOwner: (name) => {
        set((s) => (s.owners.includes(name) ? s : { owners: [...s.owners, name] }));
        get().logAudit({ user: get().currentUser.name, action: "Created Owner", entity: "Owner", entityId: name, details: `Added owner "${name}".` });
      },
      deleteOwner: (name) => {
        set((s) => ({ owners: s.owners.filter((o) => o !== name) }));
        get().logAudit({ user: get().currentUser.name, action: "Deleted Owner", entity: "Owner", entityId: name, details: `Removed owner "${name}".` });
      },

      roles: DEFAULT_ROLES,
      addRole: (role) => {
        set((s) => ({ roles: [...s.roles, role] }));
        get().logAudit({ user: get().currentUser.name, action: "Created Role", entity: "Role", entityId: role.id, details: `Added role "${role.name}".` });
      },
      updateRole: (id, patch) => {
        set((s) => ({ roles: s.roles.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
        get().logAudit({ user: get().currentUser.name, action: "Updated Role", entity: "Role", entityId: id, details: `Role "${id}" updated.` });
      },
      deleteRole: (id) => {
        set((s) => ({ roles: s.roles.filter((r) => r.id !== id) }));
        get().logAudit({ user: get().currentUser.name, action: "Deleted Role", entity: "Role", entityId: id, details: `Role "${id}" removed.` });
      },

      ruleGroups: DEFAULT_RULE_GROUPS,
      addRuleGroup: (group) => {
        set((s) => ({ ruleGroups: [...s.ruleGroups, group] }));
        get().logAudit({ user: get().currentUser.name, action: "Created Rule Group", entity: "RuleGroup", entityId: group.id, details: `Added rule group "${group.name}".` });
      },
      updateRuleGroup: (id, patch) => {
        set((s) => ({ ruleGroups: s.ruleGroups.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
        get().logAudit({ user: get().currentUser.name, action: "Updated Rule Group", entity: "RuleGroup", entityId: id, details: `Rule group "${id}" updated.` });
      },
      deleteRuleGroup: (id) => {
        set((s) => ({ ruleGroups: s.ruleGroups.filter((g) => g.id !== id) }));
        get().logAudit({ user: get().currentUser.name, action: "Deleted Rule Group", entity: "RuleGroup", entityId: id, details: `Rule group "${id}" removed.` });
      },

      ruleTemplates: DEFAULT_RULE_TEMPLATES,
      addRuleTemplate: (template) => {
        set((s) => ({ ruleTemplates: [...s.ruleTemplates, template] }));
        get().logAudit({ user: get().currentUser.name, action: "Created Rule Template", entity: "RuleTemplate", entityId: template.id, details: `Added rule template "${template.name}".` });
      },
      deleteRuleTemplate: (id) => {
        set((s) => ({ ruleTemplates: s.ruleTemplates.filter((t) => t.id !== id) }));
        get().logAudit({ user: get().currentUser.name, action: "Deleted Rule Template", entity: "RuleTemplate", entityId: id, details: `Rule template "${id}" removed.` });
      },

      approvalRequests: [],
      submitForReview: (ruleId) => {
        const rule = get().rules.find((r) => r.id === ruleId);
        if (!rule) return;
        set((s) => ({
          rules: s.rules.map((r) => (r.id === ruleId ? { ...r, status: "Testing", updatedAt: new Date().toISOString() } : r)),
          approvalRequests: [
            { id: `AR-${Date.now()}`, ruleId, stage: "Pending Review", requestedBy: get().currentUser.name, requestedAt: new Date().toISOString() },
            ...s.approvalRequests,
          ],
        }));
        get().logAudit({ user: get().currentUser.name, action: "Submitted for Review", entity: "BusinessRule", entityId: ruleId, details: `${rule.name} moved to Testing and queued for review.` });
      },
      approveRule: (ruleId) => {
        const rule = get().rules.find((r) => r.id === ruleId);
        if (!rule) return;
        set((s) => ({
          rules: s.rules.map((r) => (r.id === ruleId ? { ...r, status: "Active", updatedAt: new Date().toISOString() } : r)),
          approvalRequests: s.approvalRequests.map((a) =>
            a.ruleId === ruleId && a.stage === "Pending Review"
              ? { ...a, stage: "Approved", decidedBy: get().currentUser.name, decidedAt: new Date().toISOString() }
              : a
          ),
        }));
        get().logAudit({ user: get().currentUser.name, action: "Approved & Published Rule", entity: "BusinessRule", entityId: ruleId, details: `${rule.name} approved and published to Active.` });
      },
      rejectRule: (ruleId, comment) => {
        const rule = get().rules.find((r) => r.id === ruleId);
        if (!rule) return;
        set((s) => ({
          rules: s.rules.map((r) => (r.id === ruleId ? { ...r, status: "Draft", updatedAt: new Date().toISOString() } : r)),
          approvalRequests: s.approvalRequests.map((a) =>
            a.ruleId === ruleId && a.stage === "Pending Review"
              ? { ...a, stage: "Rejected", decidedBy: get().currentUser.name, decidedAt: new Date().toISOString(), comment }
              : a
          ),
        }));
        get().logAudit({ user: get().currentUser.name, action: "Sent Back to Draft", entity: "BusinessRule", entityId: ruleId, details: `${rule.name} rejected during review${comment ? `: ${comment}` : "."}` });
      },

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

      deleteRule: (id) => {
        const rule = get().rules.find((r) => r.id === id);
        set((s) => ({ rules: s.rules.filter((r) => r.id !== id) }));
        get().logAudit({ user: get().currentUser.name, action: "Deleted Rule", entity: "BusinessRule", entityId: id, details: `${rule?.name ?? id} permanently deleted.` });
      },

      updateMatrixRows: (matrixId, rows) =>
        set((s) => ({
          matrices: s.matrices.map((m) =>
            m.id === matrixId ? { ...m, rows, updatedAt: new Date().toISOString() } : m
          ),
        })),

      addMatrixRow: (matrixId, row) => {
        set((s) => ({
          matrices: s.matrices.map((m) =>
            m.id === matrixId ? { ...m, rows: [...m.rows, row], updatedAt: new Date().toISOString() } : m
          ),
        }));
        get().logAudit({ user: get().currentUser.name, action: "Added Matrix Row", entity: "DecisionMatrix", entityId: matrixId, details: `Row ${row.id} added.` });
      },

      updateMatrixRow: (matrixId, rowId, values) => {
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
        }));
        get().logAudit({ user: get().currentUser.name, action: "Edited Matrix Row", entity: "DecisionMatrix", entityId: matrixId, details: `Row ${rowId} values updated.` });
      },

      deleteMatrixRow: (matrixId, rowId) => {
        set((s) => ({
          matrices: s.matrices.map((m) =>
            m.id === matrixId
              ? { ...m, rows: m.rows.filter((r) => r.id !== rowId), updatedAt: new Date().toISOString() }
              : m
          ),
        }));
        get().logAudit({ user: get().currentUser.name, action: "Deleted Matrix Row", entity: "DecisionMatrix", entityId: matrixId, details: `Row ${rowId} removed.` });
      },

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
        get().logAudit({ user: get().currentUser.name, action: "Duplicated Matrix Row", entity: "DecisionMatrix", entityId: matrixId, details: `Row ${rowId} duplicated as ${newRow.id}.` });
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

      // "Logs in" as the role's demo persona — Demo Mode picks a named person,
      // not just a permission set, matching the Universal CRM pattern.
      setUserRole: (roleId) =>
        set((s) => {
          const role = s.roles.find((r) => r.id === roleId);
          const displayName = role?.personaName ?? roleId;
          return {
            currentUser: {
              name: displayName,
              role: roleId,
              initials: displayName
                .split(/[\s/]+/)
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase(),
            },
          };
        }),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: "bre-prototype-store",
      version: 6,
      skipHydration: true,
      migrate: (persistedState) => {
        const state = persistedState as Partial<AppState> & {
          currentUser?: CurrentUser;
          roles?: Role[];
          appearance?: Partial<AppearanceSettings> & {
            wallpaper?: string | null;
            wallpaperOpacity?: number;
            wallpaperBlur?: number;
            wallpaperBrightness?: number;
            glassPanels?: boolean;
          };
        };

        // v5 -> v6 restructured AppearanceSettings: flat wallpaper* fields
        // became a nested `background` object, and colorMode/density/
        // fontScale/customColors/contrast+target-size toggles were added.
        // Backfill from whatever shape was persisted so an old wallpaper
        // choice survives the upgrade instead of silently resetting.
        if (state?.appearance && !state.appearance.background) {
          const old = state.appearance;
          state.appearance = {
            preset: old.preset ?? DEFAULT_APPEARANCE.preset,
            colorMode: (old.colorMode as ColorMode) ?? DEFAULT_APPEARANCE.colorMode,
            customColors: old.customColors ?? {},
            background: {
              imageData: old.wallpaper ?? null,
              target: "app",
              displayMode: "cover",
              opacity: old.wallpaperOpacity ?? DEFAULT_APPEARANCE.background.opacity,
              blur: old.wallpaperBlur ?? DEFAULT_APPEARANCE.background.blur,
              brightness: old.wallpaperBrightness ?? DEFAULT_APPEARANCE.background.brightness,
              dimOverlay: 0,
            },
            density: DEFAULT_APPEARANCE.density,
            fontScale: DEFAULT_APPEARANCE.fontScale,
            highContrast: false,
            largeClickTargets: false,
            showInsights: true,
            logo: old.logo ?? null,
          };
        }

        // v3 -> v4 added personaName/icon to Role. Repair any persisted role
        // saved before that (backfilling from the matching default), so the
        // "Switch Role" picker and login-as-persona flow never silently show
        // a raw role id instead of a name.
        if (state?.roles) {
          state.roles = state.roles.map((r) => {
            if (r.personaName && r.icon) return r;
            const fallback = DEFAULT_ROLES.find((d) => d.id === r.id);
            return {
              ...r,
              personaName: r.personaName || fallback?.personaName || r.name,
              icon: r.icon || fallback?.icon || "Briefcase",
            };
          });
        }

        // v2 -> v3 changed CurrentUser.role from a display label ("Business
        // Analyst") to a Role.id ("business-analyst"). Reset to the default
        // role if the persisted value no longer resolves to a known role.
        if (state?.currentUser && !DEFAULT_ROLES.some((r) => r.id === state.currentUser!.role)) {
          state.currentUser = DEFAULT_USER;
        }

        // Repair a currentUser.name that got stuck on a raw role id (the
        // symptom of the v3/v4 personaName bug above) now that roles are fixed.
        if (state?.currentUser && state.roles && state.currentUser.name === state.currentUser.role) {
          const fixedRole = state.roles.find((r) => r.id === state.currentUser!.role);
          if (fixedRole) {
            state.currentUser = {
              ...state.currentUser,
              name: fixedRole.personaName,
              initials: fixedRole.personaName
                .split(/[\s/]+/)
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase(),
            };
          }
        }

        return state;
      },
    }
  )
);

export function hasCapability(roles: Role[], roleId: string, capability: Capability): boolean {
  return roles.find((r) => r.id === roleId)?.capabilities.includes(capability) ?? false;
}

export function useHasCapability(capability: Capability): boolean {
  const roleId = useAppStore((s) => s.currentUser.role);
  const roles = useAppStore((s) => s.roles);
  return hasCapability(roles, roleId, capability);
}
