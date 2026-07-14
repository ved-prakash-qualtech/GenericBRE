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

// A business entity (Applicant, Loan Account, Collateral, Policy, ...) that
// fields belong to — part of the Configuration Studio's metadata layer, not
// a fixed union. Optional `industry` scopes an entity to one vertical; leave
// unset for entities shared across every industry.
export interface Entity {
  id: string;
  name: string;
  description?: string;
  industry?: string;
}

// 5-state lifecycle per BRD §9.5: Draft (authoring) -> Testing (simulator
// validation) -> Active (live) -> Inactive (paused) -> Archived (retired).
export type RuleStatus = "Draft" | "Testing" | "Active" | "Inactive" | "Archived";

// How the engine resolves multiple rules qualifying for the same case.
// "execute-all" (default, matches pre-existing behavior) evaluates every
// eligible rule regardless of order; "first-match" stops at the first rule
// whose IF (or ELSE) actually fires; "highest-priority"/"lowest-priority"
// just flip the evaluation/trace order (priority 1 = highest on the Priority
// scale) without truncating evaluation.
export type ConflictResolution = "highest-priority" | "lowest-priority" | "first-match" | "execute-all";

export interface ExecutionSettings {
  conflictResolution: ConflictResolution;
}

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

// The declarative equivalent of a "for each" loop: tests every item of a
// list-type field against a per-item operator/value, then reduces the
// per-item results with a quantifier — no iteration construct needed, and
// the rule stays a pure, side-effect-free evaluation (safe to trace, diff,
// and check for conflicts the same way a plain Condition is).
export type Quantifier = "ANY" | "ALL" | "NONE" | "COUNT";

export interface QuantifierCondition {
  id: string;
  type: "quantifier";
  field: string; // must reference a BusinessField with type: "list"
  quantifier: Quantifier;
  operator: Operator; // applied to each item in the list
  value: string;
  value2?: string; // used when operator is "between"
  /** Only used when quantifier is "COUNT": compares the number of matching items against countValue. */
  countComparator?: ">" | ">=" | "=" | "<" | "<=";
  countValue?: string;
}

export interface ConditionGroup {
  id: string;
  type: "group";
  logic: "AND" | "OR";
  collapsed?: boolean;
  children: (Condition | ConditionGroup | QuantifierCondition)[];
}

export interface RuleAction {
  id: string;
  type: ActionType;
  outputField?: string;
  outputValue?: string;
  reasonCode?: string;
  message?: string;
}

// Client-side approximation of environment promotion — there's no real
// separate Dev/UAT/Prod deployment here (no backend), just a metadata tag the
// evaluation engine actually honors: a rule tagged "Dev" only fires in a Dev-
// tier simulation, "UAT" fires in UAT and Prod, "Prod" fires everywhere. It
// changes evaluation behavior, so it's a real (if simplified) gate, not just
// a decorative label — but it's still one browser's local state, not three
// independently deployed environments.
export type RuleEnvironment = "Dev" | "UAT" | "Prod";

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
  environment: RuleEnvironment;
  description?: string;
  owner: string;
  rootGroup: ConditionGroup;
  actions: RuleAction[]; // THEN
  /** ELSE — fires instead of `actions` when rootGroup does NOT match. Optional; a rule with no elseActions simply does nothing on a non-match, same as before this existed. */
  elseActions?: RuleAction[];
  createdAt: string;
  updatedAt: string;
  version: number;
  /** Whether this rule participates in the Rule Simulator evaluation engine.
   *  Hand-authored demo rules are simulatable; bulk-generated filler rules
   *  (added purely for repository/dashboard scale) are not. */
  simulatable?: boolean;
}

// A full, immutable snapshot of a rule's definition at the moment it was
// saved — content only (name/category/conditions/actions/etc.), not lifecycle
// status. Enables real "what changed" history and rollback, instead of the
// bare version counter this replaces: every content edit appends one of
// these rather than silently overwriting the prior definition in place.
export interface RuleVersion {
  ruleId: string;
  version: number;
  snapshotAt: string;
  snapshotBy: string;
  /** How this snapshot came to exist — a normal edit, or a restore of an older version. */
  changeType: "created" | "edited" | "restored";
  /** When changeType is "restored", the version number that was restored. */
  restoredFromVersion?: number;
  name: string;
  category: string;
  subCategory?: string;
  groupId?: string;
  priority: Priority;
  owner: string;
  description?: string;
  rootGroup: ConditionGroup;
  actions: RuleAction[];
  elseActions?: RuleAction[];
}

// A named, reusable collection of rules — purely organizational, orthogonal to
// Category. Configurable from the Configuration Studio, never hardcoded.
// Also doubles as "Rule Set" in Execution Manager below — a RuleGroup IS a
// Rule Set; no separate duplicate entity.
export interface RuleGroup {
  id: string;
  name: string;
  description?: string;
}

// ============================================================
// Execution Manager — routes an incoming request (Industry + whatever other
// dimensions are configured) to an ordered sequence of Rule Sets (RuleGroup
// above), rather than every simulatable rule in an industry running
// unconditionally. Everything here is admin-configured; adding a new
// product/channel/mapping is data, not code.
// ============================================================

// The configurable set of request dimensions a mapping can key off, beyond
// Industry (which already has its own catalog — see industries.ts). Fully
// custom parameters are just more entries here, `builtIn: false`.
export interface RequestParameterDef {
  id: string;
  label: string;
  /** Expected JSON key on the incoming request payload, e.g. "product". */
  sourceKey: string;
  builtIn: boolean;
}

export type ExecutionMode = "sequential" | "parallel" | "stop-on-first-match" | "execute-all" | "conditional";

export interface RuleSetStep {
  id: string;
  ruleSetId: string; // a RuleGroup.id
  order: number;
  mode: ExecutionMode;
}

// The Global → Industry → Product → Sub Product → Workflow → Decision
// hierarchy isn't a separate rigid schema — it's expressed directly as the
// ordered `steps` list (e.g. Global Rules → Banking Rules → Home Loan Rules
// → ... → Pricing Rules). Any named Rule Set can be inserted at any
// position, so this stays metadata-driven rather than a fixed depth.
export interface RuleExecutionMapping {
  id: string;
  name: string;
  /** RequestParameterDef.id -> required value. A key absent here is a wildcard for that dimension. */
  conditions: Record<string, string>;
  steps: RuleSetStep[];
  createdAt: string;
  updatedAt: string;
}

// A configurable rule category — BusinessRule.category stores this entry's
// `name` (a plain string), not `id`, so existing filters/columns/CSV export
// that already treat category as a display string keep working unchanged.
export interface RuleCategory {
  id: string;
  name: string;
  description?: string;
  industry?: string;
}

// A reusable starting shape for a common rule pattern (e.g. "Threshold
// Check"). Instantiating a template just pre-fills the Rule Builder; the
// resulting rule is a normal, fully editable BusinessRule.
export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  /** Optional — scopes the field picker while authoring and which industry's
   *  "Start from a Template" list shows this template. Unset = shown for every industry. */
  domain?: Domain;
  rootGroup: ConditionGroup;
  actions: RuleAction[];
  elseActions?: RuleAction[];
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

export type FieldDataType = "number" | "string" | "boolean" | "enum" | "currency" | "list";

// The primitive type stored inside a "list" field's items — deliberately a
// flat array of scalars, not a list of objects. A quantified condition
// ("ANY item > X") is the declarative stand-in for iterating a collection;
// nested object schemas would need a much bigger authoring UI for a use case
// this project's rules haven't needed yet.
export type FieldItemType = "number" | "string" | "boolean" | "enum" | "currency";

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
  /** Required when type is "list" — the scalar type of each item. */
  itemType?: FieldItemType;
  /** When type is "list" and itemType is "enum" — the allowed value per item. */
  itemOptions?: string[];
  /** Metadata-repository fields — part of the Configuration Studio's Field
   *  Catalog upgrade, all optional so pre-existing seed data keeps working. */
  businessName?: string;
  /** Entity.id reference (see Entity in this file). */
  entity?: string;
  sourceSystem?: string;
  status?: "Active" | "Draft" | "Deprecated";
  updatedAt?: string;
  updatedBy?: string;
}

// Foundational JSON Mapping — a table-based attribute-to-field mapping set,
// built from a pasted/uploaded sample payload. Drag-and-drop visual mapping
// and OpenAPI/Swagger spec import are a later phase; this covers the core
// "map an external JSON attribute to a BRE field" need.
export interface JsonMappingEntry {
  id: string;
  externalAttribute: string;
  jsonPath: string;
  mappedField?: string; // BusinessField.key
  dataType: FieldDataType;
  required: boolean;
  transformationRule?: string;
  defaultValue?: string;
  validationRule?: string;
  status: "Mapped" | "Unmapped";
}

export interface JsonMapping {
  id: string;
  name: string;
  industry: string;
  direction: "request" | "response";
  entries: JsonMappingEntry[];
  createdAt: string;
  updatedAt: string;
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
  /** True when this step ran a non-Active (Testing) rule under an explicit sandbox test — never true in a normal production simulation. */
  sandbox?: boolean;
  /** Which action list actually fired — "then" on a match, "else" when the conditions failed but the rule had an ELSE branch. Absent for Skipped/Not Applicable steps. */
  branch?: "then" | "else";
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
  input: Record<string, string | number | boolean | (string | number | boolean)[]>;
  timestamp: string;
  totalDurationMs: number;
  /** True when one or more Testing-stage rules were included via an explicit sandbox test — this result is a pre-approval preview, not a production decision. */
  sandbox?: boolean;
}

// ============================================================
// Decision Result module — a consumer-configurable response layer sitting on
// top of both engines above (plain Simulator runs and Execution Manager's
// multi-rule-set runs). DecisionResult is a normalized superset that either
// engine's output adapts into (see src/lib/decision-response.ts), so one
// shared view/config can present both, at whichever detail level
// (ResponseMode) the consumer is configured for.
// ============================================================

export type ResponseMode = "decision-only" | "decision-explanation" | "decision-trace" | "full-audit";

// One flow "lane" in a decision run — for a plain Simulator run this is a
// single synthetic step wrapping the whole flat trace; for an Execution
// Manager run it's one entry per RuleSetStepResult.
export interface DecisionFlowStep {
  id: string;
  label: string;
  mode?: ExecutionMode;
  skipped?: boolean;
  skipReason?: string;
  trace: TraceStep[];
}

export interface DecisionResult {
  id: string;
  correlationId: string;
  source: "simulation" | "execution-manager";
  domain: Domain;
  mappingId?: string;
  mappingName?: string;
  outcome: DecisionOutcome;
  reasonCode: string;
  summary: string;
  calculatedValues: Record<string, string | number>;
  triggeredRules: string[];
  decidingRuleId: string | null;
  /** ruleId -> BusinessRule.version, resolved at result-build time. */
  ruleVersions: Record<string, number>;
  flow: DecisionFlowStep[];
  /** flow[].trace concatenated in order, for callers that just want one flat list (e.g. DecisionCallout's deciding-step lookup). */
  flatTrace: TraceStep[];
  input: Record<string, string | number | boolean | (string | number | boolean)[]>;
  environment: RuleEnvironment;
  timestamp: string;
  totalDurationMs: number;
  sandbox?: boolean;
}

// Configurable per scope ("default" | Industry.id | RuleExecutionMapping.id
// — see decisionResponseSettings in store.ts) so a BA, a QA engineer, an
// external API, and Compliance can each get the detail level appropriate to
// them without any code change.
export interface DecisionResponseConfig {
  defaultMode: ResponseMode;
  showDecisionReason: boolean;
  showTriggeredRules: boolean;
  showFailedRules: boolean;
  showExecutionTime: boolean;
  showRuleVersion: boolean;
  showRuleSequence: boolean;
  showApiRequest: boolean;
  showApiResponse: boolean;
  enableDebugTrace: boolean;
  enableAuditLogging: boolean;
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
  /** Hash of the entry immediately before this one in time ("" for the very first entry ever logged). */
  prevHash: string;
  /** This entry's own hash, computed from prevHash + its own fields — see audit-chain.ts. Forms a tamper-evident (not tamper-proof) chain. */
  hash: string;
  /** Structured decision-run context — present only when this entry logs a Simulator/Execution Manager
   *  run under a DecisionResponseConfig with enableAuditLogging on. Deliberately NOT part of
   *  hashAuditEntry's payload (see audit-chain.ts) so the existing tamper-evidence chain and every
   *  pre-existing entry keep verifying unchanged regardless of this field's presence. */
  decisionContext?: {
    correlationId: string;
    environment: RuleEnvironment;
    triggeredRules: string[];
    ruleVersions: Record<string, number>;
    executionTimeMs: number;
    requestPayload: Record<string, unknown>;
    responsePayload: Record<string, unknown>;
  };
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
  | "system.manage"
  | "config.manage";

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

// Per-role dashboard defaults (BRD §5.3 Persona-to-Module Mapping) — where a
// role lands after login/switch, and which dashboard widgets it starts with.
// Admin-configured via Configuration Studio → Dashboard Management; a user's
// own in-session drag/show-hide tweaks (the store's `widgets` array) start
// from this but are edited independently — see `resetWidgets`.
export interface DashboardWidgetConfig {
  id: string;
  visible: boolean;
  order: number;
}

export interface DashboardConfig {
  roleId: string;
  landingRoute: string;
  widgets: DashboardWidgetConfig[];
  /** KPI card ids (see KPI_REGISTRY) shown at the top of the dashboard. Falls back to a default set when absent/empty. */
  kpis?: string[];
  /** Quick Action ids (see ACTION_REGISTRY) shown in the Quick Actions widget. Falls back to a default set when absent/empty. */
  quickActions?: string[];
}

// Generic per-user, per-device dashboard customization — layered on top of
// DashboardConfig above (which is the admin-set default per role). A page
// declares its own catalog of WidgetDef entries; useDashboardLayout resolves
// that catalog against whatever's persisted for its dashboardKey, so the
// same DashboardControls UI drops onto any dashboard-style page unmodified.
export type WidgetSize = "SM" | "MD" | "LG";

export interface WidgetDef {
  id: string;
  label: string;
  defaultSize: WidgetSize;
  defaultOrder: number;
}

export interface DashboardWidgetLayoutState {
  id: string;
  order: number;
  size: WidgetSize;
  hidden: boolean;
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
