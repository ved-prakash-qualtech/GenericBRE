import { getField } from "./fields";
import {
  BusinessField,
  BusinessRule,
  Condition,
  ConditionGroup,
  DecisionOutcome,
  Domain,
  ExecutionMode,
  ExecutionSettings,
  Operator,
  QuantifierCondition,
  RuleAction,
  RuleEnvironment,
  RuleExecutionMapping,
  RuleGroup,
  SimulationResult,
  TraceStep,
} from "./types";

const DEFAULT_EXECUTION_SETTINGS: ExecutionSettings = { conflictResolution: "execute-all" };

type ScalarValue = string | number | boolean;
type InputMap = Record<string, ScalarValue | ScalarValue[]>;

// Promotion order — a rule "reaches" Prod by first passing through Dev and
// UAT, so anything already at Prod is also valid to see in a Dev or UAT
// simulation; a Dev-only rule is invisible once you simulate at a higher tier.
const ENV_RANK: Record<RuleEnvironment, number> = { Dev: 0, UAT: 1, Prod: 2 };

function isPromotedTo(ruleEnv: RuleEnvironment, simulationTier: RuleEnvironment): boolean {
  return ENV_RANK[ruleEnv] >= ENV_RANK[simulationTier];
}

function coerceNumber(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function evaluateOperator(
  operator: Operator,
  actual: ScalarValue | undefined,
  expected: string,
  expected2?: string
): boolean {
  if (actual === undefined) return false;
  switch (operator) {
    case "=":
      return String(actual).toLowerCase() === String(expected).toLowerCase();
    case "!=":
      return String(actual).toLowerCase() !== String(expected).toLowerCase();
    case ">":
      return coerceNumber(actual) > coerceNumber(expected);
    case "<":
      return coerceNumber(actual) < coerceNumber(expected);
    case ">=":
      return coerceNumber(actual) >= coerceNumber(expected);
    case "<=":
      return coerceNumber(actual) <= coerceNumber(expected);
    case "contains":
      return String(actual).toLowerCase().includes(String(expected).toLowerCase());
    case "starts_with":
      return String(actual).toLowerCase().startsWith(String(expected).toLowerCase());
    case "in":
      return expected
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .includes(String(actual).toLowerCase());
    case "between": {
      const n = coerceNumber(actual);
      return n >= coerceNumber(expected) && n <= coerceNumber(expected2 ?? expected);
    }
    default:
      return false;
  }
}

export interface ConditionEvalDetail {
  field: string;
  operator: Operator;
  expected: string;
  actual: string;
  passed: boolean;
}

export function evaluateGroup(
  group: ConditionGroup,
  input: InputMap,
  details: ConditionEvalDetail[],
  catalog: BusinessField[] = []
): boolean {
  if (group.children.length === 0) return true;
  const results = group.children.map((child) => {
    if (child.type === "condition") {
      return evaluateConditionLeaf(child, input, details, catalog);
    }
    if (child.type === "quantifier") {
      return evaluateQuantifierCondition(child, input, details, catalog);
    }
    return evaluateGroup(child, input, details, catalog);
  });
  return group.logic === "AND" ? results.every(Boolean) : results.some(Boolean);
}

function evaluateConditionLeaf(
  cond: Condition,
  input: InputMap,
  details: ConditionEvalDetail[],
  catalog: BusinessField[]
): boolean {
  const raw = input[cond.field];
  // A plain Condition should only ever point at a scalar field — the UI
  // filters field pickers by type — but stay defensive rather than crash if
  // one somehow references a list field.
  const actual = Array.isArray(raw) ? undefined : raw;
  const passed = evaluateOperator(cond.operator, actual, cond.value, cond.value2);
  const field = getField(catalog, cond.field);
  const expectedLabel =
    cond.operator === "between"
      ? `${cond.value} – ${cond.value2}`
      : cond.value;
  details.push({
    field: field?.label ?? cond.field,
    operator: cond.operator,
    expected: expectedLabel,
    actual: actual === undefined ? "—" : String(actual),
    passed,
  });
  return passed;
}

// The declarative "for each" — tests every item of a list-type field against
// a per-item operator/value, then reduces the per-item results with a
// quantifier (ANY/ALL/NONE/COUNT). An empty list is treated as ALL failing
// (not vacuously true) since that reads more predictably to a business user
// authoring a policy than the mathematical convention would.
function evaluateQuantifierCondition(
  q: QuantifierCondition,
  input: InputMap,
  details: ConditionEvalDetail[],
  catalog: BusinessField[]
): boolean {
  const raw = input[q.field];
  const items: ScalarValue[] = Array.isArray(raw) ? raw : [];
  const field = getField(catalog, q.field);
  const matchCount = items.filter((item) => evaluateOperator(q.operator, item, q.value, q.value2)).length;

  let passed: boolean;
  switch (q.quantifier) {
    case "ANY":
      passed = matchCount > 0;
      break;
    case "ALL":
      passed = items.length > 0 && matchCount === items.length;
      break;
    case "NONE":
      passed = matchCount === 0;
      break;
    case "COUNT": {
      const comparator = q.countComparator ?? ">=";
      passed = evaluateOperator(comparator, matchCount, q.countValue ?? "0");
      break;
    }
  }

  const perItemTest = `${q.operator} ${q.value}${q.operator === "between" ? ` – ${q.value2}` : ""}`;
  const expectedLabel =
    q.quantifier === "COUNT"
      ? `COUNT(item ${perItemTest}) ${q.countComparator ?? ">="} ${q.countValue}`
      : `${q.quantifier} item ${perItemTest}`;

  details.push({
    field: field?.label ?? q.field,
    operator: q.operator,
    expected: expectedLabel,
    actual: `${matchCount} of ${items.length} item${items.length === 1 ? "" : "s"} matched`,
    passed,
  });
  return passed;
}

export function evaluateRule(
  rule: BusinessRule,
  input: InputMap,
  catalog: BusinessField[] = [],
  opts: { forceEvaluate?: boolean } = {}
): TraceStep {
  const start = performance.now();
  const details: ConditionEvalDetail[] = [];

  if (rule.status !== "Active" && !opts.forceEvaluate) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      priority: rule.priority,
      status: "Skipped",
      conditionSummaries: [],
      actionsApplied: [],
      durationMs: 0,
    };
  }

  const passed = evaluateGroup(rule.rootGroup, input, details, catalog);
  const durationMs = Math.max(0.1, performance.now() - start);
  const hasElse = !!rule.elseActions?.length;

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    priority: rule.priority,
    status: passed ? "Passed" : "Failed",
    conditionSummaries: details.map((d) => ({
      field: d.field,
      operator: d.operator,
      expected: d.expected,
      actual: d.actual,
      passed: d.passed,
    })),
    actionsApplied: passed ? rule.actions : hasElse ? rule.elseActions! : [],
    branch: passed ? "then" : hasElse ? "else" : undefined,
    durationMs,
    sandbox: rule.status !== "Active" && opts.forceEvaluate ? true : undefined,
  };
}

export function outcomeRank(outcome: DecisionOutcome): number {
  if (outcome === "Rejected") return 2;
  if (outcome === "Review Required") return 1;
  return 0;
}

export function runSimulation(
  domain: Domain,
  rules: BusinessRule[],
  input: InputMap,
  catalog: BusinessField[] = [],
  sandboxRuleIds: string[] = [],
  environment: RuleEnvironment = "Prod",
  executionSettings: ExecutionSettings = DEFAULT_EXECUTION_SETTINGS
): SimulationResult {
  const start = performance.now();
  const sortDirection = executionSettings.conflictResolution === "lowest-priority" ? -1 : 1;
  const domainRules = rules
    .filter((r) => r.domain === domain && r.simulatable)
    .sort((a, b) => sortDirection * (a.priority - b.priority));

  const trace: TraceStep[] = [];
  let outcome: DecisionOutcome = "Approved";
  let reasonCode = "ELIGIBLE_CUSTOMER";
  let summary = "All applicable rules passed. Application meets policy criteria.";
  const calculatedValues: Record<string, string | number> = {};
  const triggeredRules: string[] = [];
  let decidingRuleId: string | null = null;
  let halted = false;

  for (const rule of domainRules) {
    if (halted) {
      trace.push({
        ruleId: rule.id,
        ruleName: rule.name,
        priority: rule.priority,
        status: "Skipped",
        conditionSummaries: [],
        actionsApplied: [],
        durationMs: 0,
      });
      continue;
    }

    // A sandboxed rule under test bypasses both the status gate and the
    // environment gate — the whole point is previewing it regardless of
    // where it's been promoted to. Otherwise a rule only fires once it's
    // Active AND has reached this simulation's environment tier.
    const sandboxed = sandboxRuleIds.includes(rule.id);
    const eligible = sandboxed || (rule.status === "Active" && isPromotedTo(rule.environment, environment));
    if (!eligible) {
      trace.push({
        ruleId: rule.id,
        ruleName: rule.name,
        priority: rule.priority,
        status: "Not Applicable",
        conditionSummaries: [],
        actionsApplied: [],
        durationMs: 0,
      });
      continue;
    }

    const step = evaluateRule(rule, input, catalog, { forceEvaluate: sandboxed });
    trace.push(step);

    // A rule "fires" if either its THEN or ELSE branch actually ran —
    // step.actionsApplied already holds whichever one applies (see
    // evaluateRule), so this uniformly covers both without branching on status.
    if (step.actionsApplied.length > 0) {
      triggeredRules.push(rule.id);
      for (const action of step.actionsApplied) {
        applyAction(action, calculatedValues);
        if (action.type === "Reject") {
          // Reject always wins and halts further evaluation.
          outcome = "Rejected";
          reasonCode = action.reasonCode ?? "POLICY_BREACH";
          summary = action.message ?? `${rule.name} triggered a rejection.`;
          decidingRuleId = rule.id;
          halted = true;
        } else if (action.type === "Approve" && outcomeRank(outcome) === 0) {
          // A later baseline Approve must never downgrade an earlier Review flag.
          outcome = "Approved";
          reasonCode = action.reasonCode ?? "ELIGIBLE_CUSTOMER";
          summary = action.message ?? `${rule.name} confirmed approval eligibility.`;
          decidingRuleId = rule.id;
        } else if (action.type === "Show Message" && action.message?.toLowerCase().includes("review")) {
          if (outcomeRank(outcome) <= 1) {
            outcome = "Review Required";
            reasonCode = action.reasonCode ?? "MANUAL_REVIEW";
            summary = action.message ?? `${rule.name} flagged this case for manual review.`;
            decidingRuleId = rule.id;
          }
        }
      }
      // "first-match" stops evaluation at the first rule whose IF/ELSE
      // actually fired — the declarative equivalent of a switch/case's break.
      if (executionSettings.conflictResolution === "first-match") {
        halted = true;
      }
    }
  }

  const totalDurationMs = Math.max(1, performance.now() - start);
  const sandbox = trace.some((t) => t.sandbox);

  return {
    id: `SIM-${Date.now()}`,
    domain,
    outcome,
    reasonCode,
    summary,
    calculatedValues,
    triggeredRules,
    decidingRuleId,
    trace,
    input,
    timestamp: new Date().toISOString(),
    totalDurationMs,
    sandbox: sandbox || undefined,
  };
}

export function applyAction(
  action: RuleAction,
  calculatedValues: Record<string, string | number>
) {
  if (action.type === "Calculate" || action.type === "Assign Value") {
    if (action.outputField && action.outputValue !== undefined) {
      // Support simple templated expressions like "{{loan_amount}} * 1.0" evaluated loosely,
      // otherwise treat as a literal value.
      let value: string | number = action.outputValue;
      const numeric = coerceNumber(action.outputValue);
      if (!Number.isNaN(numeric) && /^[0-9.\-]+$/.test(action.outputValue.trim())) {
        value = numeric;
      }
      calculatedValues[action.outputField] = value;
    }
  }
}

export interface RuleSetStepResult {
  stepId: string;
  ruleSetId: string;
  ruleSetName: string;
  mode: ExecutionMode;
  skipped: boolean;
  skipReason?: string;
  trace: TraceStep[];
}

export interface RuleSetExecutionResult {
  mappingId: string;
  mappingName: string;
  outcome: DecisionOutcome;
  reasonCode: string;
  summary: string;
  calculatedValues: Record<string, string | number>;
  triggeredRules: string[];
  decidingRuleId: string | null;
  steps: RuleSetStepResult[];
  totalDurationMs: number;
}

// Execution Manager's engine — routes a case through an ordered sequence of
// Rule Sets (RuleGroup) rather than every simulatable rule in an industry.
// Each step's `mode` has real, distinct cross-step semantics:
//   sequential          — normal flow; a Reject halts every later step
//                          (unless that step is marked parallel/execute-all).
//   execute-all         — always runs, ignoring an earlier Reject halt, but
//                          still stops if an earlier stop-on-first-match
//                          step already found a match.
//   stop-on-first-match — the moment any rule in this step fires, execution
//                          halts entirely for every later step.
//   parallel            — runs unconditionally, independent of any halt
//                          signal from earlier steps (reject or first-match).
//   conditional         — skipped outright if the running outcome is
//                          already Rejected.
export function runRuleSetExecution(
  mapping: RuleExecutionMapping,
  rules: BusinessRule[],
  ruleGroups: RuleGroup[],
  input: InputMap,
  catalog: BusinessField[] = [],
  environment: RuleEnvironment = "Prod"
): RuleSetExecutionResult {
  const start = performance.now();
  const orderedSteps = [...mapping.steps].sort((a, b) => a.order - b.order);

  let outcome: DecisionOutcome = "Approved";
  let reasonCode = "ELIGIBLE_CUSTOMER";
  let summary = "All applicable rule sets passed. Application meets policy criteria.";
  const calculatedValues: Record<string, string | number> = {};
  const triggeredRules: string[] = [];
  let decidingRuleId: string | null = null;
  let sequentialHalted = false;
  let firstMatchHalted = false;

  const steps: RuleSetStepResult[] = orderedSteps.map((step) => {
    const ruleSet = ruleGroups.find((g) => g.id === step.ruleSetId);
    const ruleSetName = ruleSet?.name ?? step.ruleSetId;

    if (step.mode === "conditional" && outcome === "Rejected") {
      return { stepId: step.id, ruleSetId: step.ruleSetId, ruleSetName, mode: step.mode, skipped: true, skipReason: "Prior outcome was Rejected", trace: [] };
    }
    if (firstMatchHalted && step.mode !== "parallel") {
      return { stepId: step.id, ruleSetId: step.ruleSetId, ruleSetName, mode: step.mode, skipped: true, skipReason: "Stopped — an earlier step already matched", trace: [] };
    }
    if (sequentialHalted && step.mode !== "parallel" && step.mode !== "execute-all") {
      return { stepId: step.id, ruleSetId: step.ruleSetId, ruleSetName, mode: step.mode, skipped: true, skipReason: "Stopped — an earlier step was rejected", trace: [] };
    }

    const stepRules = rules
      .filter((r) => r.groupId === step.ruleSetId && r.simulatable)
      .sort((a, b) => a.priority - b.priority);

    const trace: TraceStep[] = [];
    let stepHalted = false;
    for (const rule of stepRules) {
      if (stepHalted) {
        trace.push({ ruleId: rule.id, ruleName: rule.name, priority: rule.priority, status: "Skipped", conditionSummaries: [], actionsApplied: [], durationMs: 0 });
        continue;
      }
      const eligible = rule.status === "Active" && isPromotedTo(rule.environment, environment);
      if (!eligible) {
        trace.push({ ruleId: rule.id, ruleName: rule.name, priority: rule.priority, status: "Not Applicable", conditionSummaries: [], actionsApplied: [], durationMs: 0 });
        continue;
      }

      const result = evaluateRule(rule, input, catalog);
      trace.push(result);

      if (result.actionsApplied.length > 0) {
        triggeredRules.push(rule.id);
        for (const action of result.actionsApplied) {
          applyAction(action, calculatedValues);
          if (action.type === "Reject") {
            outcome = "Rejected";
            reasonCode = action.reasonCode ?? "POLICY_BREACH";
            summary = action.message ?? `${rule.name} triggered a rejection.`;
            decidingRuleId = rule.id;
            stepHalted = true;
          } else if (action.type === "Approve" && outcomeRank(outcome) === 0) {
            outcome = "Approved";
            reasonCode = action.reasonCode ?? "ELIGIBLE_CUSTOMER";
            summary = action.message ?? `${rule.name} confirmed approval eligibility.`;
            decidingRuleId = rule.id;
          } else if (action.type === "Show Message" && action.message?.toLowerCase().includes("review")) {
            if (outcomeRank(outcome) <= 1) {
              outcome = "Review Required";
              reasonCode = action.reasonCode ?? "MANUAL_REVIEW";
              summary = action.message ?? `${rule.name} flagged this case for manual review.`;
              decidingRuleId = rule.id;
            }
          }
        }
        if (step.mode === "stop-on-first-match") {
          stepHalted = true;
          firstMatchHalted = true;
        }
      }
    }

    if (outcome === "Rejected") sequentialHalted = true;
    return { stepId: step.id, ruleSetId: step.ruleSetId, ruleSetName, mode: step.mode, skipped: false, trace };
  });

  const totalDurationMs = Math.max(1, performance.now() - start);
  return { mappingId: mapping.id, mappingName: mapping.name, outcome, reasonCode, summary, calculatedValues, triggeredRules, decidingRuleId, steps, totalDurationMs };
}
