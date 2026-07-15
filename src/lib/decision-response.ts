import {
  BusinessRule,
  DecisionFlowStep,
  DecisionResponseConfig,
  DecisionResult,
  Domain,
  ResponseMode,
  SimulationResult,
  TraceStep,
} from "./types";
// RuleSetExecutionResult import removed — Execution Manager deleted

type InputMap = Record<string, string | number | boolean | (string | number | boolean)[]>;

export const DEFAULT_DECISION_RESPONSE_CONFIG: DecisionResponseConfig = {
  defaultMode: "decision-explanation",
  showDecisionReason: true,
  showTriggeredRules: true,
  showFailedRules: true,
  showExecutionTime: true,
  showRuleVersion: true,
  showRuleSequence: true,
  showApiRequest: true,
  showApiResponse: true,
  enableDebugTrace: true,
  enableAuditLogging: true,
};

// Client-side approximation of a request correlation ID — see the same
// caveat as RuleEnvironment in types.ts: real cross-service tracing needs a
// backend to originate/propagate this, but it still gives every decision run
// a unique, stable handle to reference across the UI and the audit log.
export function generateCorrelationId(): string {
  return `DEC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function collectRuleVersions(rules: BusinessRule[], traceSteps: TraceStep[]): Record<string, number> {
  const byId = new Map(rules.map((r) => [r.id, r.version]));
  const versions: Record<string, number> = {};
  for (const step of traceSteps) {
    const version = byId.get(step.ruleId);
    if (version !== undefined) versions[step.ruleId] = version;
  }
  return versions;
}

// Wraps a plain Simulator / Product-Rule run as a DecisionResult with a
// single synthetic flow step (one flat rule list — no multi-step Rule Sets).
export function fromSimulation(sim: SimulationResult, rules: BusinessRule[]): DecisionResult {
  const flow: DecisionFlowStep[] = [{ id: "all-rules", label: "All Rules", trace: sim.trace }];
  return {
    id: sim.id,
    correlationId: generateCorrelationId(),
    source: "simulation",
    domain: sim.domain,
    outcome: sim.outcome,
    reasonCode: sim.reasonCode,
    summary: sim.summary,
    calculatedValues: sim.calculatedValues,
    triggeredRules: sim.triggeredRules,
    decidingRuleId: sim.decidingRuleId,
    ruleVersions: collectRuleVersions(rules, sim.trace),
    flow,
    flatTrace: sim.trace,
    input: sim.input,
    // environment removed — FUTURE: restore when environment promotion is reintroduced
    timestamp: sim.timestamp,
    totalDurationMs: sim.totalDurationMs,
    sandbox: sim.sandbox,
  };
}

// fromRuleSetExecution removed — Execution Manager deleted.
// FUTURE: restore if multi-step Rule Set orchestration is reintroduced.

// Most-specific-match wins:
// a per-Industry override beats the tenant-wide default, which falls back
// to the built-in default if nothing has been configured yet.
// (mappingId scope removed with Execution Manager)
export function resolveDecisionResponseConfig(
  settings: Record<string, DecisionResponseConfig>,
  scope: { mappingId?: string; industry?: string }
): DecisionResponseConfig {
  if (scope.mappingId && settings[scope.mappingId]) return settings[scope.mappingId];
  if (scope.industry && settings[scope.industry]) return settings[scope.industry];
  return settings.default ?? DEFAULT_DECISION_RESPONSE_CONFIG;
}

// The literal response-mode contract a real API would return — assembled
// from the exact fields the resolved config says to show, gated further by
// mode. Demoed live in the Decision Result view; documents what a future
// backend integration should produce for each mode without any code change
// here (only Configuration Studio settings change the shape).
export function buildApiResponsePayload(
  result: DecisionResult,
  mode: ResponseMode,
  config: DecisionResponseConfig
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    decision: result.outcome,
    status: result.outcome === "Rejected" ? "DECLINED" : result.outcome === "Approved" ? "APPROVED" : "PENDING_REVIEW",
    correlationId: result.correlationId,
  };
  if (mode === "decision-only") return payload;

  if (config.showDecisionReason) {
    payload.reasonCode = result.reasonCode;
    payload.summary = result.summary;
  }
  if (config.showTriggeredRules) payload.triggeredRules = result.triggeredRules;
  if (config.showFailedRules) {
    payload.failedRules = result.flatTrace.filter((t) => t.status === "Failed").map((t) => t.ruleId);
  }
  if (config.showExecutionTime) payload.executionTimeMs = result.totalDurationMs;
  if (config.showRuleVersion) payload.ruleVersions = result.ruleVersions;
  if (config.showRuleSequence) {
    payload.executionFlow = result.flow.map((f) => ({ ruleSet: f.label, mode: f.mode, skipped: f.skipped }));
  }
  if (Object.keys(result.calculatedValues).length > 0) payload.calculatedValues = result.calculatedValues;
  if (mode === "decision-explanation") return payload;

  if (config.showApiRequest) payload.apiRequest = result.input;
  payload.trace = result.flow.map((f) => ({
    ruleSet: f.label,
    mode: f.mode,
    skipped: f.skipped,
    skipReason: f.skipReason,
    steps: f.trace.map((t) => ({
      ruleId: t.ruleId,
      ruleName: t.ruleName,
      status: t.status,
      conditions: t.conditionSummaries,
    })),
  }));
  if (mode === "decision-trace") return payload;

  // full-audit
  // environment removed — FUTURE: restore when environment promotion is reintroduced
  payload.timestamp = result.timestamp;
  return payload;
}
