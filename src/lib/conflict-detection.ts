import { BusinessRule, Condition, ConditionGroup } from "./types";

export function flattenConditions(node: ConditionGroup, out: Condition[] = []): Condition[] {
  for (const child of node.children) {
    if (child.type === "condition") out.push(child);
    else flattenConditions(child, out);
  }
  return out;
}

function coerceNumber(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : NaN;
}

const RANGE_OPERATORS = new Set([">", "<", ">=", "<=", "between"]);

function rangeOf(cond: Condition): [number, number] | null {
  if (!RANGE_OPERATORS.has(cond.operator)) return null;
  const v = coerceNumber(cond.value);
  if (Number.isNaN(v)) return null;
  switch (cond.operator) {
    case ">":
    case ">=":
      return [v, Infinity];
    case "<":
    case "<=":
      return [-Infinity, v];
    case "between": {
      const v2 = coerceNumber(cond.value2 ?? "");
      return Number.isNaN(v2) ? null : [Math.min(v, v2), Math.max(v, v2)];
    }
    default:
      return null;
  }
}

function rangesOverlap(a: [number, number], b: [number, number]): boolean {
  return a[0] <= b[1] && b[0] <= a[1];
}

function hasActionType(rule: BusinessRule, type: "Approve" | "Reject"): boolean {
  return rule.actions.some((a) => a.type === type);
}

export interface RuleConflict {
  ruleAId: string;
  ruleBId: string;
  field: string;
  reason: string;
}

// Shared by both detectRuleConflicts (Active-vs-Active sweep) and
// detectConflictsForCandidate (candidate-vs-Active, run before approval) —
// same conservative "opposed outcome on an overlapping field" logic either way.
function pairConflicts(a: BusinessRule, b: BusinessRule): RuleConflict[] {
  const out: RuleConflict[] = [];
  if (a.domain !== b.domain) return out;

  const aApprove = hasActionType(a, "Approve");
  const aReject = hasActionType(a, "Reject");
  const bApprove = hasActionType(b, "Approve");
  const bReject = hasActionType(b, "Reject");
  const opposedPolarity = (aApprove && bReject) || (aReject && bApprove);
  if (!opposedPolarity) return out;

  const aConds = flattenConditions(a.rootGroup);
  const bConds = flattenConditions(b.rootGroup);

  for (const ac of aConds) {
    for (const bc of bConds) {
      if (ac.field !== bc.field || !ac.field) continue;

      if (ac.operator === "=" && bc.operator === "=" && ac.value === bc.value) {
        out.push({
          ruleAId: a.id,
          ruleBId: b.id,
          field: ac.field,
          reason: `Both rules match ${ac.field} = "${ac.value}" but drive opposite outcomes (Approve vs Reject).`,
        });
        continue;
      }

      const aRange = rangeOf(ac);
      const bRange = rangeOf(bc);
      if (aRange && bRange && rangesOverlap(aRange, bRange)) {
        out.push({
          ruleAId: a.id,
          ruleBId: b.id,
          field: ac.field,
          reason: `Overlapping thresholds on ${ac.field} (${ac.operator} ${ac.value} vs ${bc.operator} ${bc.value}) drive opposite outcomes.`,
        });
      }
    }
  }
  return out;
}

// A deliberately conservative, explainable check: flags pairs of Active rules
// in the same industry that both evaluate the same field and would drive
// opposite terminal actions (Approve vs Reject) for an overlapping — or
// identical — input value. This is advisory ("possible conflict, please
// review"), not a hard validation error, since two rules can legitimately
// reference the same field without truly conflicting.
export function detectRuleConflicts(rules: BusinessRule[]): RuleConflict[] {
  const active = rules.filter((r) => r.status === "Active" && r.simulatable !== false);
  const conflicts: RuleConflict[] = [];

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      conflicts.push(...pairConflicts(active[i], active[j]));
    }
  }

  return conflicts;
}

// Checks a single candidate rule (typically still Testing, about to be
// approved) against the current Active set, as if it were already live —
// so a reviewer sees the same signal before publishing, not only afterward
// on the Repository's reactive banner.
export function detectConflictsForCandidate(candidate: BusinessRule, rules: BusinessRule[]): RuleConflict[] {
  if (candidate.simulatable === false) return [];
  const active = rules.filter((r) => r.status === "Active" && r.simulatable !== false && r.id !== candidate.id);
  const conflicts: RuleConflict[] = [];
  for (const other of active) {
    conflicts.push(...pairConflicts(candidate, other));
  }
  return conflicts;
}
