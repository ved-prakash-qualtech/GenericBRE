"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ALL_RULES,
  AUDIT_LOG,
  DEFAULT_NOTIFY_CATEGORIES,
  DEFAULT_NOTIFY_TRIGGERS,
  DEFAULT_NOTIFY_WORKFLOWS,
  DEFAULT_NOTIFY_WORKFLOW_TEMPLATES,
  DEFAULT_PRODUCTS,
  DEFAULT_PRODUCT_RULE_MAPPINGS,
  DEFAULT_ROLES,
  DEFAULT_RULE_GROUPS,
  DEFAULT_RULE_TEMPLATES,
  MATRICES,
} from "./mock-data";
import {
  AppearanceSettings,
  ApprovalRequest,
  AuditEntry,
  BusinessField,
  BusinessRule,
  Capability,
  ColorMode,
  CurrentUser,
  DashboardConfig,
  DashboardWidgetLayoutState,
  DecisionMatrix,
  DecisionResponseConfig,
  Domain,
  Entity,
  ExecutionSettings,
  Industry,
  JsonMapping,
  NotifyCategory,
  NotifyTrigger,
  NotifyWorkflow,
  NotifyWorkflowTemplate,
  Product,
  ProductRuleMapping,
  RuleCategory,
  MatrixRow,
  Role,
  // RuleEnvironment, // FUTURE: restore when environment promotion is reintroduced
  RuleGroup,
  RuleStatus,
  RuleTemplate,
  RuleVersion,
  SimulationResult,
} from "./types";
import { DEFAULT_INDUSTRIES } from "./industries";
import { DEFAULT_ENTITIES } from "./entities";
import { DEFAULT_FIELD_CATALOG, DEFAULT_RULE_CATEGORIES, DEFAULT_OWNERS } from "./fields";
import { DEFAULT_DASHBOARD_CONFIGS } from "./dashboards";
// DEFAULT_REQUEST_PARAMETER_DEFS import removed — Execution Manager deleted
import { DEFAULT_DECISION_RESPONSE_CONFIG } from "./decision-response";
import { hashAuditEntry, buildHashChain } from "./audit-chain";

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
  appName: "Business Rules Engine",
  tagline: "Decision Platform",
};

function snapshotFromRule(
  rule: BusinessRule,
  snapshotBy: string,
  changeType: RuleVersion["changeType"],
  restoredFromVersion?: number
): RuleVersion {
  return {
    ruleId: rule.id,
    version: rule.version,
    snapshotAt: rule.updatedAt,
    snapshotBy,
    changeType,
    restoredFromVersion,
    name: rule.name,
    category: rule.category,
    subCategory: rule.subCategory,
    groupId: rule.groupId,
    sequence: rule.sequence,
    priority: rule.priority,
    owner: rule.owner,
    description: rule.description,
    rootGroup: rule.rootGroup,
    actions: rule.actions,
    elseActions: rule.elseActions,
  };
}

const DEFAULT_USER: CurrentUser = { name: "Ananya Verma", role: "business-analyst", initials: "AV" };

export interface GlobalFilters {
  domains: Domain[];
  statuses: RuleStatus[];
}

const DEFAULT_GLOBAL_FILTERS: GlobalFilters = { domains: [], statuses: [] };

interface AppState {
  rules: BusinessRule[];
  matrices: DecisionMatrix[];
  auditLog: AuditEntry[];
  simulations: SimulationResult[];
  appearance: AppearanceSettings;
  // generic, per-user/per-device dashboard customization — see
  // src/lib/dashboard-layout.ts's useDashboardLayout, keyed by dashboardKey
  // so any dashboard-style page can plug in its own widget catalog.
  dashboardLayouts: Record<string, DashboardWidgetLayoutState[]>;
  setDashboardLayout: (key: string, layout: DashboardWidgetLayoutState[]) => void;
  resetDashboardLayout: (key: string) => void;
  dashboardConfigs: Record<string, DashboardConfig>;
  setDashboardConfig: (roleId: string, config: DashboardConfig) => void;
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
  entities: Entity[];
  fieldCatalog: BusinessField[];
  ruleCategories: RuleCategory[];
  owners: string[];
  addIndustry: (industry: Industry) => void;
  updateIndustry: (id: string, patch: Partial<Industry>) => void;
  deleteIndustry: (id: string) => void;
  addEntity: (entity: Entity) => void;
  updateEntity: (id: string, patch: Partial<Entity>) => void;
  deleteEntity: (id: string) => void;
  addField: (field: BusinessField) => void;
  updateField: (key: string, patch: Partial<BusinessField>) => void;
  deleteField: (key: string) => void;
  addRuleCategory: (category: RuleCategory) => void;
  updateRuleCategory: (id: string, patch: Partial<RuleCategory>) => void;
  deleteRuleCategory: (id: string) => void;
  addOwner: (name: string) => void;
  deleteOwner: (name: string) => void;

  // per-industry (or "default") conflict-resolution strategy — read by
  // runSimulation to decide execution order / stop-on-first-match.
  executionSettings: Record<string, ExecutionSettings>;
  setExecutionSettings: (scope: string, settings: ExecutionSettings) => void;

  // foundational JSON Mapping — named, reusable attribute-to-field mapping sets.
  jsonMappings: JsonMapping[];
  addJsonMapping: (mapping: JsonMapping) => void;
  updateJsonMapping: (id: string, patch: Partial<JsonMapping>) => void;
  deleteJsonMapping: (id: string) => void;

  // Execution Manager removed (requestParameterDefs and ruleExecutionMappings removed)

  // Decision Result module — per-scope ("default" | Industry.id |
  // RuleExecutionMapping.id) configuration of how much detail a decision
  // result exposes. Read by decisionResponse.resolveDecisionResponseConfig.
  decisionResponseSettings: Record<string, DecisionResponseConfig>;
  setDecisionResponseConfig: (scope: string, config: DecisionResponseConfig) => void;

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

  // Product Master + Product-Rule Mapping — replaces Execution Manager's
  // group/mapping routing. A Product is a configurable named scheme; which
  // rules apply to it is entirely data (ProductRuleMapping), not code.
  products: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  /** Sets publishStatus="Published" + lastPublishedAt (see Product Workspace's guided Stepper). */
  publishProduct: (id: string) => void;
  productRuleMappings: ProductRuleMapping[];
  // Full-replace semantics for a given product — simplest correct behavior
  // for a checklist-style mapping UI (see product-rule-mapping-manager.tsx).
  saveProductRuleMapping: (productId: string, ruleIds: string[]) => void;

  // NotifyX — trigger -> condition -> action workflow automation (config-only
  // prototype, no execution engine). Categories/Triggers are configurable
  // registries; see src/components/studio/notify-x-manager.tsx.
  notifyCategories: NotifyCategory[];
  notifyTriggers: NotifyTrigger[];
  notifyWorkflows: NotifyWorkflow[];
  notifyWorkflowTemplates: NotifyWorkflowTemplate[];
  addNotifyWorkflow: (workflow: NotifyWorkflow) => void;
  updateNotifyWorkflow: (id: string, patch: Partial<NotifyWorkflow>) => void;
  deleteNotifyWorkflow: (id: string) => void;
  toggleNotifyWorkflowStatus: (id: string) => void;
  cloneNotifyWorkflow: (id: string) => void;
  importNotifyWorkflowTemplate: (templateId: string) => void;

  // rule templates (reusable starting shapes for the Rule Builder)
  ruleTemplates: RuleTemplate[];
  addRuleTemplate: (template: RuleTemplate) => void;
  updateRuleTemplate: (id: string, patch: Partial<RuleTemplate>) => void;
  deleteRuleTemplate: (id: string) => void;

  // approval workflow (BRD §5.5 governance: Draft -> Testing -> Review -> Publish)
  approvalRequests: ApprovalRequest[];
  // Every rule-mutation action below is enforced inside the store itself, not
  // just via a UI-level disabled button: each returns { ok: false, reason }
  // instead of silently succeeding when the caller lacks the required
  // capability (or, for approveRule, is the same person who submitted the
  // rule for review — maker-checker).
  submitForReview: (ruleId: string) => { ok: boolean; reason?: string };
  approveRule: (ruleId: string) => { ok: boolean; reason?: string };
  rejectRule: (ruleId: string, comment?: string) => { ok: boolean; reason?: string };

  // FUTURE: promoteRuleEnvironment removed for demo. Restore when environment promotion is reintroduced.
  // promoteRuleEnvironment: (ruleId: string) => { ok: boolean; reason?: string };

  // rules
  addRule: (rule: BusinessRule) => { ok: boolean; reason?: string };
  updateRule: (id: string, updater: (r: BusinessRule) => BusinessRule) => { ok: boolean; reason?: string };
  setRuleStatus: (id: string, status: RuleStatus) => { ok: boolean; reason?: string };
  cloneRule: (id: string) => { ok: boolean; reason?: string; newId?: string };
  archiveRule: (id: string) => { ok: boolean; reason?: string };
  deleteRule: (id: string) => { ok: boolean; reason?: string };

  // version history — a full content snapshot per edit (see RuleVersion),
  // not just the bare counter. addRule/updateRule append automatically;
  // restoreRuleVersion re-applies an older snapshot's content as a new version.
  ruleVersions: RuleVersion[];
  restoreRuleVersion: (ruleId: string, version: number) => { ok: boolean; reason?: string };

  // matrices
  updateMatrixRows: (matrixId: string, rows: MatrixRow[]) => void;
  addMatrixRow: (matrixId: string, row: MatrixRow) => void;
  updateMatrixRow: (matrixId: string, rowId: string, values: MatrixRow["values"]) => void;
  deleteMatrixRow: (matrixId: string, rowId: string) => void;
  duplicateMatrixRow: (matrixId: string, rowId: string) => void;

  // simulations
  addSimulation: (result: SimulationResult) => void;

  // audit
  logAudit: (entry: Omit<AuditEntry, "id" | "timestamp" | "prevHash" | "hash">) => void;

  // appearance
  setAppearance: (patch: Partial<AppearanceSettings>) => void;
  resetAppearance: () => void;

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
      auditLog: AUDIT_LOG,
      simulations: [],
      appearance: DEFAULT_APPEARANCE,
      dashboardLayouts: {},
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
      entities: DEFAULT_ENTITIES,
      fieldCatalog: DEFAULT_FIELD_CATALOG,
      ruleCategories: DEFAULT_RULE_CATEGORIES,
      owners: DEFAULT_OWNERS,
      executionSettings: {},
      jsonMappings: [],
      // Execution Manager state removed
      decisionResponseSettings: { default: DEFAULT_DECISION_RESPONSE_CONFIG },

      addIndustry: (industry) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ industries: [...s.industries, industry] }));
        get().logAudit({ user: get().currentUser.name, action: "Created Industry", entity: "Industry", entityId: industry.id, details: `Added "${industry.name}" as a new configurable industry.` });
      },
      updateIndustry: (id, patch) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ industries: s.industries.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
        get().logAudit({ user: get().currentUser.name, action: "Updated Industry", entity: "Industry", entityId: id, details: `Industry "${id}" updated.` });
      },
      deleteIndustry: (id) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ industries: s.industries.filter((i) => i.id !== id) }));
        get().logAudit({ user: get().currentUser.name, action: "Deleted Industry", entity: "Industry", entityId: id, details: `Industry "${id}" removed.` });
      },

      addEntity: (entity) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ entities: [...s.entities, entity] }));
        get().logAudit({ user: get().currentUser.name, action: "Created Entity", entity: "Entity", entityId: entity.id, details: `Added entity "${entity.name}" to the catalog.` });
      },
      updateEntity: (id, patch) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ entities: s.entities.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
        get().logAudit({ user: get().currentUser.name, action: "Updated Entity", entity: "Entity", entityId: id, details: `Entity "${id}" updated.` });
      },
      deleteEntity: (id) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ entities: s.entities.filter((e) => e.id !== id) }));
        get().logAudit({ user: get().currentUser.name, action: "Deleted Entity", entity: "Entity", entityId: id, details: `Entity "${id}" removed.` });
      },

      addField: (field) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        const stamped: BusinessField = { ...field, updatedAt: new Date().toISOString(), updatedBy: currentUser.name };
        set((s) => ({ fieldCatalog: [...s.fieldCatalog, stamped] }));
        get().logAudit({ user: get().currentUser.name, action: "Created Field", entity: "BusinessField", entityId: field.key, details: `Added field "${field.label}" to the catalog.` });
      },
      updateField: (key, patch) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        const stampedPatch = { ...patch, updatedAt: new Date().toISOString(), updatedBy: currentUser.name };
        set((s) => ({ fieldCatalog: s.fieldCatalog.map((f) => (f.key === key ? { ...f, ...stampedPatch } : f)) }));
        get().logAudit({ user: get().currentUser.name, action: "Updated Field", entity: "BusinessField", entityId: key, details: `Field "${key}" updated.` });
      },
      deleteField: (key) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ fieldCatalog: s.fieldCatalog.filter((f) => f.key !== key) }));
        get().logAudit({ user: get().currentUser.name, action: "Deleted Field", entity: "BusinessField", entityId: key, details: `Field "${key}" removed from the catalog.` });
      },

      addRuleCategory: (category) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ ruleCategories: [...s.ruleCategories, category] }));
        get().logAudit({ user: get().currentUser.name, action: "Created Category", entity: "RuleCategory", entityId: category.id, details: `Added category "${category.name}".` });
      },
      updateRuleCategory: (id, patch) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ ruleCategories: s.ruleCategories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
        get().logAudit({ user: get().currentUser.name, action: "Updated Category", entity: "RuleCategory", entityId: id, details: `Category "${id}" updated.` });
      },
      deleteRuleCategory: (id) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ ruleCategories: s.ruleCategories.filter((c) => c.id !== id) }));
        get().logAudit({ user: get().currentUser.name, action: "Deleted Category", entity: "RuleCategory", entityId: id, details: `Category "${id}" removed.` });
      },

      setExecutionSettings: (scope, settings) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ executionSettings: { ...s.executionSettings, [scope]: settings } }));
        get().logAudit({ user: get().currentUser.name, action: "Updated Execution Settings", entity: "ExecutionSettings", entityId: scope, details: `Conflict resolution for "${scope}" set to ${settings.conflictResolution}.` });
      },

      addJsonMapping: (mapping) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ jsonMappings: [mapping, ...s.jsonMappings] }));
        get().logAudit({ user: get().currentUser.name, action: "Created JSON Mapping", entity: "JsonMapping", entityId: mapping.id, details: `Added mapping "${mapping.name}".` });
      },
      updateJsonMapping: (id, patch) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ jsonMappings: s.jsonMappings.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: new Date().toISOString() } : m)) }));
        get().logAudit({ user: get().currentUser.name, action: "Updated JSON Mapping", entity: "JsonMapping", entityId: id, details: `Mapping "${id}" updated.` });
      },
      deleteJsonMapping: (id) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ jsonMappings: s.jsonMappings.filter((m) => m.id !== id) }));
        get().logAudit({ user: get().currentUser.name, action: "Deleted JSON Mapping", entity: "JsonMapping", entityId: id, details: `Mapping "${id}" removed.` });
      },

      // Execution Manager actions (add/update/delete RequestParameterDef/RuleExecutionMapping) removed

      setDecisionResponseConfig: (scope, config) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ decisionResponseSettings: { ...s.decisionResponseSettings, [scope]: config } }));
        get().logAudit({ user: currentUser.name, action: "Updated Decision Response Config", entity: "DecisionResponseConfig", entityId: scope, details: `Decision response settings for "${scope}" updated.` });
      },

      addOwner: (name) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => (s.owners.includes(name) ? s : { owners: [...s.owners, name] }));
        get().logAudit({ user: get().currentUser.name, action: "Created Owner", entity: "Owner", entityId: name, details: `Added owner "${name}".` });
      },
      deleteOwner: (name) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ owners: s.owners.filter((o) => o !== name) }));
        get().logAudit({ user: get().currentUser.name, action: "Deleted Owner", entity: "Owner", entityId: name, details: `Removed owner "${name}".` });
      },

      roles: DEFAULT_ROLES,
      addRole: (role) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ roles: [...s.roles, role] }));
        get().logAudit({ user: get().currentUser.name, action: "Created Role", entity: "Role", entityId: role.id, details: `Added role "${role.name}".` });
      },
      updateRole: (id, patch) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ roles: s.roles.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
        get().logAudit({ user: get().currentUser.name, action: "Updated Role", entity: "Role", entityId: id, details: `Role "${id}" updated.` });
      },
      deleteRole: (id) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ roles: s.roles.filter((r) => r.id !== id) }));
        get().logAudit({ user: get().currentUser.name, action: "Deleted Role", entity: "Role", entityId: id, details: `Role "${id}" removed.` });
      },

      products: DEFAULT_PRODUCTS,
      addProduct: (product) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ products: [...s.products, product] }));
        get().logAudit({ user: currentUser.name, action: "Created Product", entity: "Product", entityId: product.id, details: `Added product "${product.name}" (${product.code}).` });
      },
      updateProduct: (id, patch) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({
          products: s.products.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p)),
        }));
        get().logAudit({ user: currentUser.name, action: "Updated Product", entity: "Product", entityId: id, details: `Product "${id}" updated.` });
      },
      publishProduct: (id) => {
        const { currentUser, roles, products } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        const product = products.find((p) => p.id === id);
        const now = new Date().toISOString();
        set((s) => ({
          products: s.products.map((p) =>
            p.id === id ? { ...p, publishStatus: "Published", lastPublishedAt: now, updatedAt: now } : p
          ),
        }));
        get().logAudit({ user: currentUser.name, action: "Published Product", entity: "Product", entityId: id, details: `Product "${product?.name ?? id}" published — available via the Product API.` });
      },

      productRuleMappings: DEFAULT_PRODUCT_RULE_MAPPINGS,
      saveProductRuleMapping: (productId, ruleIds) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        const now = new Date().toISOString();
        set((s) => ({
          productRuleMappings: [
            ...s.productRuleMappings.filter((m) => m.productId !== productId),
            ...ruleIds.map((ruleId, i) => ({
              id: `prm-${productId}-${ruleId}-${Date.now()}-${i}`,
              productId,
              ruleId,
              active: true,
              order: i,
              createdAt: now,
              createdBy: currentUser.name,
            })),
          ],
        }));
        get().logAudit({ user: currentUser.name, action: "Mapped Rules to Product", entity: "Product", entityId: productId, details: `${ruleIds.length} rule(s) mapped.` });
      },

      notifyCategories: DEFAULT_NOTIFY_CATEGORIES,
      notifyTriggers: DEFAULT_NOTIFY_TRIGGERS,
      notifyWorkflows: DEFAULT_NOTIFY_WORKFLOWS,
      notifyWorkflowTemplates: DEFAULT_NOTIFY_WORKFLOW_TEMPLATES,
      addNotifyWorkflow: (workflow) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "notifyx.create")) return;
        set((s) => ({ notifyWorkflows: [...s.notifyWorkflows, workflow] }));
        get().logAudit({ user: currentUser.name, action: "Created Workflow", entity: "NotifyWorkflow", entityId: workflow.id, details: `Added workflow "${workflow.name}".` });
      },
      updateNotifyWorkflow: (id, patch) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "notifyx.edit")) return;
        set((s) => ({
          notifyWorkflows: s.notifyWorkflows.map((w) => (w.id === id ? { ...w, ...patch, updatedAt: new Date().toISOString() } : w)),
        }));
        get().logAudit({ user: currentUser.name, action: "Updated Workflow", entity: "NotifyWorkflow", entityId: id, details: `Workflow "${id}" updated.` });
      },
      deleteNotifyWorkflow: (id) => {
        const { currentUser, roles, notifyWorkflows } = get();
        if (!hasCapability(roles, currentUser.role, "notifyx.edit")) return;
        const workflow = notifyWorkflows.find((w) => w.id === id);
        if (!workflow || workflow.status !== "Draft") return;
        set((s) => ({ notifyWorkflows: s.notifyWorkflows.filter((w) => w.id !== id) }));
        get().logAudit({ user: currentUser.name, action: "Deleted Workflow", entity: "NotifyWorkflow", entityId: id, details: `Draft workflow "${workflow.name}" deleted.` });
      },
      toggleNotifyWorkflowStatus: (id) => {
        const { currentUser, roles, notifyWorkflows } = get();
        if (!hasCapability(roles, currentUser.role, "notifyx.toggle")) return;
        const workflow = notifyWorkflows.find((w) => w.id === id);
        if (!workflow) return;
        // Active -> Paused; anything else (Draft or Paused) -> Active — same
        // toggle semantics as the reference blueprint's list-screen behavior.
        const nextStatus = workflow.status === "Active" ? "Paused" : "Active";
        const now = new Date().toISOString();
        set((s) => ({
          notifyWorkflows: s.notifyWorkflows.map((w) => (w.id === id ? { ...w, status: nextStatus, updatedAt: now } : w)),
        }));
        get().logAudit({ user: currentUser.name, action: nextStatus === "Active" ? "Activated Workflow" : "Paused Workflow", entity: "NotifyWorkflow", entityId: id, details: `Workflow "${workflow.name}" is now ${nextStatus}.` });
      },
      cloneNotifyWorkflow: (id) => {
        const { currentUser, roles, notifyWorkflows } = get();
        if (!hasCapability(roles, currentUser.role, "notifyx.create")) return;
        const source = notifyWorkflows.find((w) => w.id === id);
        if (!source) return;
        const now = new Date().toISOString();
        const clone: NotifyWorkflow = {
          ...source,
          id: `wf-${Date.now()}`,
          name: `${source.name} (Copy)`,
          status: "Draft",
          steps: source.steps.map((step) => ({ ...step, id: `${step.id}-${Date.now()}` })),
          createdAt: now,
          updatedAt: now,
          createdBy: currentUser.name,
          runCount: 0,
          logs: [],
        };
        set((s) => ({ notifyWorkflows: [...s.notifyWorkflows, clone] }));
        get().logAudit({ user: currentUser.name, action: "Cloned Workflow", entity: "NotifyWorkflow", entityId: clone.id, details: `Cloned "${source.name}" to "${clone.name}" as Draft.` });
      },
      importNotifyWorkflowTemplate: (templateId) => {
        const { currentUser, roles, notifyWorkflowTemplates } = get();
        if (!hasCapability(roles, currentUser.role, "notifyx.create")) return;
        const template = notifyWorkflowTemplates.find((t) => t.id === templateId);
        if (!template) return;
        const now = new Date().toISOString();
        const workflow: NotifyWorkflow = {
          id: `wf-${Date.now()}`,
          name: template.name,
          categoryId: template.categoryId,
          triggerId: template.triggerId,
          status: "Draft",
          steps: template.steps.map((step) => ({ ...step, id: `${step.id}-${Date.now()}` })),
          createdAt: now,
          updatedAt: now,
          createdBy: currentUser.name,
          runCount: 0,
          logs: [],
        };
        set((s) => ({ notifyWorkflows: [...s.notifyWorkflows, workflow] }));
        get().logAudit({ user: currentUser.name, action: "Created Workflow", entity: "NotifyWorkflow", entityId: workflow.id, details: `Imported template "${template.name}" as a new Draft workflow.` });
      },

      ruleGroups: DEFAULT_RULE_GROUPS,
      addRuleGroup: (group) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ ruleGroups: [...s.ruleGroups, group] }));
        get().logAudit({ user: get().currentUser.name, action: "Created Rule Group", entity: "RuleGroup", entityId: group.id, details: `Added rule group "${group.name}".` });
      },
      updateRuleGroup: (id, patch) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ ruleGroups: s.ruleGroups.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
        get().logAudit({ user: get().currentUser.name, action: "Updated Rule Group", entity: "RuleGroup", entityId: id, details: `Rule group "${id}" updated.` });
      },
      deleteRuleGroup: (id) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ ruleGroups: s.ruleGroups.filter((g) => g.id !== id) }));
        get().logAudit({ user: get().currentUser.name, action: "Deleted Rule Group", entity: "RuleGroup", entityId: id, details: `Rule group "${id}" removed.` });
      },

      ruleTemplates: DEFAULT_RULE_TEMPLATES,
      addRuleTemplate: (template) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ ruleTemplates: [...s.ruleTemplates, template] }));
        get().logAudit({ user: currentUser.name, action: "Created Rule Template", entity: "RuleTemplate", entityId: template.id, details: `Added rule template "${template.name}".` });
      },
      updateRuleTemplate: (id, patch) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ ruleTemplates: s.ruleTemplates.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
        get().logAudit({ user: currentUser.name, action: "Updated Rule Template", entity: "RuleTemplate", entityId: id, details: `Rule template "${id}" updated.` });
      },
      deleteRuleTemplate: (id) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ ruleTemplates: s.ruleTemplates.filter((t) => t.id !== id) }));
        get().logAudit({ user: currentUser.name, action: "Deleted Rule Template", entity: "RuleTemplate", entityId: id, details: `Rule template "${id}" removed.` });
      },

      approvalRequests: [],
      submitForReview: (ruleId) => {
        const rule = get().rules.find((r) => r.id === ruleId);
        if (!rule) return { ok: false, reason: "Rule not found." };
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "rule.edit")) {
          return { ok: false, reason: `${currentUser.name} doesn't have permission to submit rules for review.` };
        }

        set((s) => ({
          rules: s.rules.map((r) => (r.id === ruleId ? { ...r, status: "Testing", updatedAt: new Date().toISOString() } : r)),
          approvalRequests: [
            { id: `AR-${Date.now()}`, ruleId, stage: "Pending Review", requestedBy: currentUser.name, requestedAt: new Date().toISOString() },
            ...s.approvalRequests,
          ],
        }));
        get().logAudit({ user: currentUser.name, action: "Submitted for Review", entity: "BusinessRule", entityId: ruleId, details: `${rule.name} moved to Testing and queued for review.` });
        return { ok: true };
      },
      approveRule: (ruleId) => {
        const rule = get().rules.find((r) => r.id === ruleId);
        if (!rule) return { ok: false, reason: "Rule not found." };
        const { currentUser, roles, approvalRequests } = get();

        if (!hasCapability(roles, currentUser.role, "rule.publish")) {
          get().logAudit({ user: currentUser.name, action: "Approval Denied", entity: "BusinessRule", entityId: ruleId, details: `${currentUser.name} attempted to approve ${rule.name} without the rule.publish capability.` });
          return { ok: false, reason: `${currentUser.name} doesn't have permission to publish rules.` };
        }
        const pending = approvalRequests.find((a) => a.ruleId === ruleId && a.stage === "Pending Review");
        if (pending && pending.requestedBy === currentUser.name) {
          get().logAudit({ user: currentUser.name, action: "Approval Denied", entity: "BusinessRule", entityId: ruleId, details: `${currentUser.name} cannot approve ${rule.name} — they also requested the review (maker-checker).` });
          return { ok: false, reason: "You submitted this rule for review — switch to a different reviewer role to approve it." };
        }

        set((s) => ({
          rules: s.rules.map((r) => (r.id === ruleId ? { ...r, status: "Active", updatedAt: new Date().toISOString() } : r)),
          approvalRequests: s.approvalRequests.map((a) =>
            a.ruleId === ruleId && a.stage === "Pending Review"
              ? { ...a, stage: "Approved", decidedBy: currentUser.name, decidedAt: new Date().toISOString() }
              : a
          ),
        }));
        get().logAudit({ user: currentUser.name, action: "Approved & Published Rule", entity: "BusinessRule", entityId: ruleId, details: `${rule.name} approved and published to Active.` });
        return { ok: true };
      },
      rejectRule: (ruleId, comment) => {
        const rule = get().rules.find((r) => r.id === ruleId);
        if (!rule) return { ok: false, reason: "Rule not found." };
        const { currentUser, roles } = get();

        if (!hasCapability(roles, currentUser.role, "rule.publish")) {
          get().logAudit({ user: currentUser.name, action: "Approval Denied", entity: "BusinessRule", entityId: ruleId, details: `${currentUser.name} attempted to send back ${rule.name} without the rule.publish capability.` });
          return { ok: false, reason: `${currentUser.name} doesn't have permission to make review decisions.` };
        }

        set((s) => ({
          rules: s.rules.map((r) => (r.id === ruleId ? { ...r, status: "Draft", updatedAt: new Date().toISOString() } : r)),
          approvalRequests: s.approvalRequests.map((a) =>
            a.ruleId === ruleId && a.stage === "Pending Review"
              ? { ...a, stage: "Rejected", decidedBy: currentUser.name, decidedAt: new Date().toISOString(), comment }
              : a
          ),
        }));
        get().logAudit({ user: currentUser.name, action: "Sent Back to Draft", entity: "BusinessRule", entityId: ruleId, details: `${rule.name} rejected during review${comment ? `: ${comment}` : "."}` });
        return { ok: true };
      },

      // FUTURE: promoteRuleEnvironment removed for demo.
      // Restore the full implementation when environment promotion is reintroduced.
      promoteRuleEnvironment: (_ruleId: string) => ({ ok: false, reason: "Environment promotion is disabled in this release." }),

      ruleVersions: [],

      addRule: (rule) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "rule.create")) {
          return { ok: false, reason: `${currentUser.name} doesn't have permission to create rules.` };
        }
        set((s) => ({
          rules: [rule, ...s.rules],
          ruleVersions: [snapshotFromRule(rule, currentUser.name, "created"), ...s.ruleVersions],
        }));
        return { ok: true };
      },

      updateRule: (id, updater) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "rule.edit")) {
          return { ok: false, reason: `${currentUser.name} doesn't have permission to edit rules.` };
        }
        set((s) => ({
          rules: s.rules.map((r) => (r.id === id ? updater(r) : r)),
        }));
        const updated = get().rules.find((r) => r.id === id);
        if (updated) {
          set((s) => ({
            ruleVersions: [snapshotFromRule(updated, currentUser.name, "edited"), ...s.ruleVersions],
          }));
        }
        return { ok: true };
      },

      restoreRuleVersion: (ruleId, version) => {
        const snapshot = get().ruleVersions.find((v) => v.ruleId === ruleId && v.version === version);
        const rule = get().rules.find((r) => r.id === ruleId);
        if (!snapshot || !rule) return { ok: false, reason: "That version could not be found." };

        const restored: BusinessRule = {
          ...rule,
          name: snapshot.name,
          category: snapshot.category,
          subCategory: snapshot.subCategory,
          groupId: snapshot.groupId,
          sequence: snapshot.sequence,
          priority: snapshot.priority,
          owner: snapshot.owner,
          description: snapshot.description,
          rootGroup: snapshot.rootGroup,
          actions: snapshot.actions,
          elseActions: snapshot.elseActions,
          version: rule.version + 1,
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({
          rules: s.rules.map((r) => (r.id === ruleId ? restored : r)),
          ruleVersions: [
            snapshotFromRule(restored, get().currentUser.name, "restored", version),
            ...s.ruleVersions,
          ],
        }));
        get().logAudit({
          user: get().currentUser.name,
          action: "Restored Rule Version",
          entity: "BusinessRule",
          entityId: ruleId,
          details: `${restored.name} restored to the content of v${version} (now v${restored.version}).`,
        });
        return { ok: true };
      },

      setRuleStatus: (id, status) => {
        const rule = get().rules.find((r) => r.id === id);
        if (!rule) return { ok: false, reason: "Rule not found." };
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "rule.publish")) {
          return { ok: false, reason: `${currentUser.name} doesn't have permission to change a rule's status.` };
        }

        set((s) => ({
          rules: s.rules.map((r) =>
            r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r
          ),
        }));
        get().logAudit({
          user: currentUser.name,
          action: `Status → ${status}`,
          entity: "BusinessRule",
          entityId: id,
          details: `${rule.name} status changed to ${status}.`,
        });
        return { ok: true };
      },

      cloneRule: (id) => {
        const source = get().rules.find((r) => r.id === id);
        if (!source) return { ok: false, reason: "Rule not found." };
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "rule.create")) {
          return { ok: false, reason: `${currentUser.name} doesn't have permission to create rules.` };
        }

        ruleIdSeq += 1;
        const newId = `RL-${ruleIdSeq}`;
        const clone: BusinessRule = {
          ...source,
          id: newId,
          name: `${source.name} (Copy)`,
          status: "Draft",
          // environment: "Dev", // FUTURE: restore when environment promotion is reintroduced
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({
          rules: [clone, ...s.rules],
          ruleVersions: [snapshotFromRule(clone, currentUser.name, "created"), ...s.ruleVersions],
        }));
        get().logAudit({
          user: currentUser.name,
          action: "Cloned Rule",
          entity: "BusinessRule",
          entityId: newId,
          details: `Cloned from ${id} as Draft.`,
        });
        return { ok: true, newId };
      },

      archiveRule: (id) => get().setRuleStatus(id, "Archived"),

      deleteRule: (id) => {
        const rule = get().rules.find((r) => r.id === id);
        if (!rule) return { ok: false, reason: "Rule not found." };
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "rule.delete")) {
          return { ok: false, reason: `${currentUser.name} doesn't have permission to permanently delete rules.` };
        }
        if (rule.status !== "Archived") {
          return { ok: false, reason: "Only Archived rules can be permanently deleted." };
        }

        set((s) => ({ rules: s.rules.filter((r) => r.id !== id) }));
        get().logAudit({ user: currentUser.name, action: "Deleted Rule", entity: "BusinessRule", entityId: id, details: `${rule.name} permanently deleted.` });
        return { ok: true };
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

      logAudit: (entry) =>
        set((s) => {
          const timestamp = new Date().toISOString();
          const prevHash = s.auditLog[0]?.hash ?? "";
          const content = { ...entry, timestamp };
          const hash = hashAuditEntry(prevHash, content);
          return {
            auditLog: [{ ...content, id: `A-${Date.now()}`, prevHash, hash }, ...s.auditLog],
          };
        }),

      setAppearance: (patch) => set((s) => ({ appearance: { ...s.appearance, ...patch } })),
      resetAppearance: () => set({ appearance: DEFAULT_APPEARANCE }),

      setDashboardLayout: (key, layout) => set((s) => ({ dashboardLayouts: { ...s.dashboardLayouts, [key]: layout } })),
      resetDashboardLayout: (key) =>
        set((s) => {
          const next = { ...s.dashboardLayouts };
          delete next[key];
          return { dashboardLayouts: next };
        }),

      dashboardConfigs: DEFAULT_DASHBOARD_CONFIGS,
      setDashboardConfig: (roleId, config) => {
        const { currentUser, roles } = get();
        if (!hasCapability(roles, currentUser.role, "config.manage")) return;
        set((s) => ({ dashboardConfigs: { ...s.dashboardConfigs, [roleId]: config } }));
        get().logAudit({
          user: currentUser.name,
          action: "Updated Dashboard Config",
          entity: "DashboardConfig",
          entityId: roleId,
          details: `Dashboard defaults for role "${roleId}" updated.`,
        });
      },

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
      version: 21,
      skipHydration: true,
      migrate: (persistedState) => {
        // v20 -> v21 added `appName`/`tagline` to AppearanceSettings (the
        // Branding tab in Appearance Studio) — backfill the same default
        // strings the hardcoded sidebar/login text used before, so nothing
        // visibly changes for an existing session until an admin customizes it.
        {
          const s = persistedState as Partial<AppState>;
          if (s?.appearance && (s.appearance.appName === undefined || s.appearance.tagline === undefined)) {
            s.appearance = {
              ...s.appearance,
              appName: s.appearance.appName ?? "Business Rules Engine",
              tagline: s.appearance.tagline ?? "Decision Platform",
            };
          }
        }
        // v19 -> v20 added NotifyX (workflow automation) and its 4 new
        // capabilities (notifyx.view/create/edit/toggle). notifyCategories/
        // notifyTriggers/notifyWorkflows/notifyWorkflowTemplates are brand-new
        // keys — the default shallow merge fills them in automatically. Role
        // capabilities need an explicit backfill (same shape as the v8->v9
        // config.manage backfill below) so an already-persisted role gains
        // whichever of the 4 its matching seed role in roles.json grants,
        // instead of silently having no NotifyX access after the upgrade.
        {
          const s = persistedState as Partial<AppState>;
          if (s?.roles) {
            const notifyCaps: Capability[] = ["notifyx.view", "notifyx.create", "notifyx.edit", "notifyx.toggle"];
            s.roles = s.roles.map((r) => {
              const fallback = DEFAULT_ROLES.find((d) => d.id === r.id);
              if (!fallback) return r;
              const missing = notifyCaps.filter((c) => fallback.capabilities.includes(c) && !r.capabilities.includes(c));
              return missing.length ? { ...r, capabilities: [...r.capabilities, ...missing] } : r;
            });
          }
        }
        // v18 -> v19 added `publishStatus`/`lastPublishedAt` to Product (the
        // Product Workspace's guided Stepper). Backfill "Draft" onto any
        // persisted product missing it — SimulationResult's new `productId`
        // needs no backfill since it's optional and only new/product-driven
        // runs ever set it.
        {
          const s = persistedState as Partial<AppState>;
          if (s?.products?.some((p) => p.publishStatus === undefined)) {
            s.products = s.products.map((p) => (p.publishStatus ? p : { ...p, publishStatus: "Draft" }));
          }
        }
        // v17 -> v18 added Credit Cards and Wealth Management to default domains.
        // Merge in any default industries missing from what's persisted.
        {
          const s = persistedState as Partial<AppState>;
          if (s?.industries) {
            const existingIds = new Set(s.industries.map((ind) => ind.id));
            const missing = DEFAULT_INDUSTRIES.filter((ind) => !existingIds.has(ind.id));
            if (missing.length) s.industries = [...s.industries, ...missing];
          }
        }
        // v16 -> v17 added 3 domain-scoped example templates (Lending/
        // Insurance/NBFC) and `categoryId` to Rule Templates. Merge in any
        // default template id missing from what's persisted, so accounts
        // that already had the store saved don't miss the new examples.
        {
          const s = persistedState as Partial<AppState>;
          if (s?.ruleTemplates) {
            const existingIds = new Set(s.ruleTemplates.map((t) => t.id));
            const missing = DEFAULT_RULE_TEMPLATES.filter((t) => !existingIds.has(t.id));
            if (missing.length) s.ruleTemplates = [...s.ruleTemplates, ...missing];
          }
        }
        // v15 -> v16 added `order` to ProductRuleMapping (product-based Rule
        // Sequencer/chaining). Backfill any persisted mapping missing it
        // using its existing position within that product's mappings, so
        // execution order stays stable across the upgrade instead of
        // silently falling back to priority-only sorting.
        {
          const s = persistedState as Partial<AppState>;
          if (s?.productRuleMappings?.some((m) => m.order === undefined)) {
            const counters: Record<string, number> = {};
            s.productRuleMappings = s.productRuleMappings.map((m) => {
              if (m.order !== undefined) return m;
              const next = counters[m.productId] ?? 0;
              counters[m.productId] = next + 1;
              return { ...m, order: next };
            });
          }
        }
        //
        // v14 -> v15 removed `requestParameterDefs` and `ruleExecutionMappings` (Execution Manager).
        //
        // v13 -> v14 added `products`/`productRuleMappings` (Product Master +
        // Product-Rule Mapping). Both are brand-new keys — the default
        // shallow merge fills them in from initial state automatically.
        //
        // v12 -> v13 added `decisionResponseSettings` (Decision Result
        // module). Brand-new key — the default shallow merge fills it in
        // from initial state automatically.
        //
        // v11 -> v12 added `requestParameterDefs`/`ruleExecutionMappings`
        // (Execution Manager). Both are brand-new keys — the default
        // shallow merge fills them in from initial state automatically.
        //
        // v10 -> v11 replaced the single global `widgets` array with
        // `dashboardLayouts` (a per-dashboardKey map — see
        // src/lib/dashboard-layout.ts). No transform needed: the default
        // shallow merge fills in the new key from initial state, and a
        // leftover `widgets` value in old persisted state is simply never
        // read again.
        //
        // v9 -> v10 added `dashboardConfigs` (role-based dashboards, BRD
        // §5.3). It's a brand-new key with no prior shape to transform —
        // the default shallow merge fills it in from DEFAULT_DASHBOARD_CONFIGS
        // automatically for any persisted state that predates it, so there's
        // nothing to backfill here explicitly.
        const state = persistedState as Partial<AppState> & {
          currentUser?: CurrentUser;
          roles?: Role[];
          categories?: string[];
          appearance?: Partial<AppearanceSettings> & {
            wallpaper?: string | null;
            wallpaperOpacity?: number;
            wallpaperBlur?: number;
            wallpaperBrightness?: number;
            glassPanels?: boolean;
          };
        };

        // v8 -> v9 added the `config.manage` capability (Configuration Studio
        // is now RBAC-gated, where it used to be open to every role). Backfill
        // it onto any persisted role whose id matches a seed role that grants
        // it by default, so an existing sysadmin/product-manager doesn't lose
        // Settings access the moment they load the app post-upgrade.
        if (state?.roles) {
          state.roles = state.roles.map((r) => {
            if (r.capabilities?.includes("config.manage")) return r;
            const fallback = DEFAULT_ROLES.find((d) => d.id === r.id);
            if (fallback?.capabilities.includes("config.manage")) {
              return { ...r, capabilities: [...r.capabilities, "config.manage"] };
            }
            return r;
          });
        }

        // v8 -> v9 also added `status` to BusinessField (Field Catalog
        // metadata upgrade). Every pre-existing field is treated as Active —
        // the same default new fields get — so nothing silently disappears
        // from a "Status: Active" filter after the upgrade.
        if (state?.fieldCatalog) {
          state.fieldCatalog = state.fieldCatalog.map((f) => (f.status ? f : { ...f, status: "Active" }));
        }

        // v8 -> v9 also replaced the flat `categories: string[]` list with a
        // richer `ruleCategories: RuleCategory[]` catalog. Convert each old
        // string into an object (name preserved, so every persisted
        // `rule.category` string value still matches by name unchanged) and
        // drop the old key.
        if (state?.categories && !state.ruleCategories) {
          state.ruleCategories = state.categories.map((name) => ({
            id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
            name,
          }));
          delete state.categories;
        }

        // v7 -> v8 added `environment` (Dev/UAT/Prod) to BusinessRule. Backfill
        // removed — FUTURE: restore when environment promotion is reintroduced
        // (BusinessRule.environment no longer exists on the type).

        // v6 -> v7 added a tamper-evident hash chain to AuditEntry. Any
        // persisted log saved before that has no prevHash/hash — rebuild the
        // chain from scratch so it isn't just silently missing.
        if (state?.auditLog?.length && !state.auditLog[state.auditLog.length - 1]?.hash) {
          state.auditLog = buildHashChain(state.auditLog);
        }

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
            appName: old.appName ?? DEFAULT_APPEARANCE.appName,
            tagline: old.tagline ?? DEFAULT_APPEARANCE.tagline,
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

// Rules scoped to the header's Industry filter when one is active — shared
// by every dashboard widget so that filter isn't just decorative.
export function useScopedRules(): BusinessRule[] {
  const rules = useAppStore((s) => s.rules);
  const domainFilter = useAppStore((s) => s.globalFilters.domains);
  return domainFilter.length ? rules.filter((r) => domainFilter.includes(r.domain)) : rules;
}
