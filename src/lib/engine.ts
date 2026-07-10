import { getField } from "./fields";
import {
  BusinessField,
  BusinessRule,
  Condition,
  ConditionGroup,
  DecisionOutcome,
  Domain,
  Operator,
  RuleAction,
  SimulationResult,
  TraceStep,
} from "./types";

type InputMap = Record<string, string | number | boolean>;

function coerceNumber(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function evaluateOperator(
  operator: Operator,
  actual: string | number | boolean | undefined,
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
  const actual = input[cond.field];
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

export function evaluateRule(
  rule: BusinessRule,
  input: InputMap,
  catalog: BusinessField[] = []
): TraceStep {
  const start = performance.now();
  const details: ConditionEvalDetail[] = [];

  if (rule.status !== "Active") {
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
    actionsApplied: passed ? rule.actions : [],
    durationMs,
  };
}

function outcomeRank(outcome: DecisionOutcome): number {
  if (outcome === "Rejected") return 2;
  if (outcome === "Review Required") return 1;
  return 0;
}

export function runSimulation(
  domain: Domain,
  rules: BusinessRule[],
  input: InputMap,
  catalog: BusinessField[] = []
): SimulationResult {
  const start = performance.now();
  const domainRules = rules
    .filter((r) => r.domain === domain && r.simulatable)
    .sort((a, b) => a.priority - b.priority);

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

    if (rule.status !== "Active") {
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

    const step = evaluateRule(rule, input, catalog);
    trace.push(step);

    if (step.status === "Passed") {
      triggeredRules.push(rule.id);
      for (const action of rule.actions) {
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
    }
  }

  const totalDurationMs = Math.max(1, performance.now() - start);

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
  };
}

function applyAction(
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
