// Core domain types for the Business Rules Engine prototype.

export type Domain = "Lending" | "Insurance" | "NBFC";

export type RuleStatus = "Draft" | "Active" | "Inactive" | "Archived";

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

export type UserRole =
  | "Super Admin"
  | "Business Analyst"
  | "Product Manager"
  | "Credit Risk Manager"
  | "Underwriter"
  | "Operations";

export interface CurrentUser {
  name: string;
  role: UserRole;
  initials: string;
}

export interface CategoryInfo {
  name: string;
  domain: Domain | "Cross-Domain";
  ruleCount: number;
}
