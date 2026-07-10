// Core domain types for the Business Rules Engine prototype.

// Industry/vertical is a configurable entity, not a fixed union — new industries
// are added via the Configuration Studio, never by editing code. `Domain` is kept
// as an alias (rather than replaced everywhere with `string`) purely to avoid a
// mass rename across the app; it now refers to an Industry.id.
export type Domain = string;

export interface Industry {
  id: string;
  name: string;
  icon: string; // lucide-react icon name, resolved via ICON_MAP at render time
  description?: string;
}

// 5-state lifecycle per BRD §9.5: Draft (authoring) -> Testing (simulator
// validation) -> Active (live) -> Inactive (paused) -> Archived (retired).
export type RuleStatus = "Draft" | "Testing" | "Active" | "Inactive" | "Archived";

export type Priority = 1 | 2 | 3 | 4 | 5;

export type Operator =
  | "="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "contains"
  | "starts_with"
  | "in"
  | "between";

export type ActionType =
  | "Approve"
  | "Reject"
  | "Calculate"
  | "Assign Value"
  | "Show Message";

export interface Condition {
  id: string;
  type: "condition";
  field: string;
  operator: Operator;
  value: string;
  value2?: string; // used for "between"
}

export interface ConditionGroup {
  id: string;
  type: "group";
  logic: "AND" | "OR";
  collapsed?: boolean;
  children: (Condition | ConditionGroup)[];
}

export interface RuleAction {
  id: string;
  type: ActionType;
  outputField?: string;
  outputValue?: string;
  reasonCode?: string;
  message?: string;
}

export interface BusinessRule {
  id: string; // e.g. RL-101
  name: string;
  domain: Domain;
  category: string;
  subCategory?: string;
  /** Optional membership in a configurable Rule Group/Collection — independent
   *  of Category, purely organizational (e.g. "Digital Lending — Core Eligibility"). */
  groupId?: string;
  priority: Priority;
  status: RuleStatus;
  description?: string;
  owner: string;
  rootGroup: ConditionGroup;
  actions: RuleAction[];
  createdAt: string;
  updatedAt: string;
  version: number;
  /** Whether this rule participates in the Rule Simulator evaluation engine.
   *  Hand-authored demo rules are simulatable; bulk-generated filler rules
   *  (added purely for repository/dashboard scale) are not. */
  simulatable?: boolean;
}

// A named, reusable collection of rules — purely organizational, orthogonal to
// Category. Configurable from the Configuration Studio, never hardcoded.
export interface RuleGroup {
  id: string;
  name: string;
  description?: string;
}

// A reusable starting shape for a common rule pattern (e.g. "Threshold
// Check"). Instantiating a template just pre-fills the Rule Builder; the
// resulting rule is a normal, fully editable BusinessRule.
export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  rootGroup: ConditionGroup;
  actions: RuleAction[];
}

export interface MatrixColumn {
  key: string;
  label: string;
  type: "text" | "number" | "percent" | "currency" | "select";
  options?: string[];
  unit?: string;
}

export interface MatrixRow {
  id: string;
  values: Record<string, string | number>;
}

export interface DecisionMatrix {
  id: string;
  domain: Domain;
  name: string;
  description: string;
  columns: MatrixColumn[];
  rangeColumns?: [string, string]; // [minKey, maxKey] used for overlap detection
  rows: MatrixRow[];
  updatedAt: string;
}

export type FieldDataType = "number" | "string" | "boolean" | "enum" | "currency";

export interface BusinessField {
  key: string;
  label: string;
  domain: Domain | "Common";
  type: FieldDataType;
  options?: string[];
  unit?: string;
  description?: string;
  /** Derived/computed fields (e.g. a ratio calculated from two other fields) are
   *  available to the Rule Builder's condition picker but excluded from the
   *  Simulator's dynamic input form since the user never enters them directly. */
  computed?: boolean;
}

export interface TraceStep {
  ruleId: string;
  ruleName: string;
  priority: Priority;
  status: "Passed" | "Failed" | "Skipped" | "Not Applicable";
  conditionSummaries: {
    field: string;
    operator: Operator;
    expected: string;
    actual: string;
    passed: boolean;
  }[];
  actionsApplied: RuleAction[];
  durationMs: number;
}

export type DecisionOutcome = "Approved" | "Rejected" | "Review Required";

export interface SimulationResult {
  id: string;
  domain: Domain;
  outcome: DecisionOutcome;
  reasonCode: string;
  summary: string;
  calculatedValues: Record<string, string | number>;
  triggeredRules: string[];
  decidingRuleId: string | null;
  trace: TraceStep[];
  input: Record<string, string | number | boolean>;
  timestamp: string;
  totalDurationMs: number;
}

export type NotificationType = "Error" | "Warning" | "Success" | "Info";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  module?: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
}

// The fixed, universal capability vocabulary (mirrors BRD §5.4's RBAC matrix
// columns). Which *roles* grant which capabilities is metadata, configurable
// via the Configuration Studio — this list itself is the one closed vocabulary
// every BRE tenant shares, the same way Operator/ActionType are closed.
export type Capability =
  | "rule.view"
  | "rule.create"
  | "rule.edit"
  | "rule.delete"
  | "rule.simulate"
  | "rule.publish"
  | "system.manage";

// A configurable role — enforced client-side only (no backend). Seeded from
// BRD §5.4's persona matrix, but fully editable/renameable via the
// Configuration Studio; new tenants can add or rename roles freely.
export interface Role {
  id: string;
  name: string;
  /** Demo-mode login persona shown on the "Switch Role" picker (e.g. "Ananya Verma"). */
  personaName: string;
  /** lucide-react icon name, resolved via ROLE_ICON_MAP at render time. */
  icon: string;
  capabilities: Capability[];
  /** Optional organization-standard appearance for this role tier, offered via the "Use {role} Default" action in Appearance Studio. */
  defaultAppearance?: Partial<AppearanceSettings>;
}

// Appearance / personalization schema — every tenant/user can fully restyle
// the shell (theme, accent colors, background, density) without any code
// change. Applied as CSS custom properties on <html> by applyAppearance().
export type ThemePreset =
  | "client"
  | "enterprise-blue"
  | "navy-professional"
  | "modern-purple"
  | "emerald-green"
  | "minimal-gray"
  | "soft-coaching"
  | "warm-orange"
  | "rose-gold"
  | "glass-enterprise";

export type ColorMode = "light" | "dark" | "system";
export type DensityMode = "compact" | "comfortable" | "spacious";
export type FontScale = "sm" | "md" | "lg";
export type BackgroundTarget = "app" | "dashboard" | "sidebar";
export type BackgroundDisplayMode = "cover" | "contain" | "fixed" | "blur";

export interface CustomColors {
  primary?: string; // hex — drives --primary/--ring and primary buttons
  sidebarBg?: string;
  sidebarFg?: string;
  sidebarActive?: string;
  chartAccent?: string; // drives --chart-1
}

export interface BackgroundPrefs {
  imageData: string | null; // data URI
  target: BackgroundTarget;
  displayMode: BackgroundDisplayMode;
  opacity: number; // 0-100
  blur: number; // px
  brightness: number; // %
  dimOverlay: number; // 0-100
}

export interface AppearanceSettings {
  preset: ThemePreset;
  colorMode: ColorMode;
  customColors: CustomColors;
  background: BackgroundPrefs;
  density: DensityMode;
  fontScale: FontScale;
  highContrast: boolean;
  largeClickTargets: boolean;
  showInsights: boolean;
  logo: string | null; // data URI, overrides default brand mark
}

export interface CurrentUser {
  name: string;
  /** References a Role.id — never a hardcoded role label. */
  role: string;
  initials: string;
}

export type ApprovalStage = "Pending Review" | "Approved" | "Rejected";

// Lightweight governance record implementing BRD §5.5's Draft -> Testing ->
// Review -> Publish workflow. One rule can accumulate a history of these as
// it cycles through review rounds.
export interface ApprovalRequest {
  id: string;
  ruleId: string;
  stage: ApprovalStage;
  requestedBy: string;
  requestedAt: string;
  decidedBy?: string;
  decidedAt?: string;
  comment?: string;
}

export interface CategoryInfo {
  name: string;
  domain: Domain | "Cross-Domain";
  ruleCount: number;
}
