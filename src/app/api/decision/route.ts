import { NextRequest, NextResponse } from "next/server";
import { ALL_RULES, MATRICES, DEFAULT_RULE_GROUPS } from "@/lib/mock-data";
import { DEFAULT_FIELD_CATALOG, getField } from "@/lib/fields";
import { DEFAULT_INDUSTRIES } from "@/lib/industries";
import { runSimulation, runRuleSetExecution } from "@/lib/engine";
import {
  fromSimulation,
  fromRuleSetExecution,
  buildApiResponsePayload,
  DEFAULT_DECISION_RESPONSE_CONFIG,
} from "@/lib/decision-response";
import { resolveMapping, DEFAULT_REQUEST_PARAMETER_DEFS } from "@/lib/execution-manager";
import { lookupInterestRate, lookupHaircut, lookupPremium } from "@/lib/matrix-lookup";
import { DecisionResponseConfig, ResponseMode, RuleEnvironment, RuleExecutionMapping } from "@/lib/types";

// A stateless demo endpoint for the Decision Result module. This prototype
// has no backend/database (see CLAUDE.md — the intended production stack is
// Java Spring Boot), so this evaluates against the same seed rules/rule
// groups the UI ships with, not whatever a user has customized in their
// browser's localStorage. It exists to make the response-mode contract
// documented by src/lib/decision-response.ts's buildApiResponsePayload
// callable outside the browser (Postman/curl), matching exactly what the
// Decision + Trace "API Response" panel shows in the UI.
//
// To route through Execution Manager instead of a plain per-industry
// simulation, pass the mapping(s) to evaluate against in the `mappings`
// field of the request body (there's no server-side store of a user's saved
// mappings) — omit it to just run every simulatable rule for the industry.

type InputMap = Record<string, string | number | boolean | (string | number | boolean)[]>;

const VALID_MODES: ResponseMode[] = ["decision-only", "decision-explanation", "decision-trace", "full-audit"];
const VALID_ENVIRONMENTS: RuleEnvironment[] = ["Dev", "UAT", "Prod"];

function parseInput(raw: Record<string, unknown>): InputMap {
  const input: InputMap = {};
  for (const [key, value] of Object.entries(raw)) {
    const field = getField(DEFAULT_FIELD_CATALOG, key);
    if (field?.type === "list" && typeof value === "string") {
      input[key] = value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => {
          if (field.itemType === "number" || field.itemType === "currency") return parseFloat(s) || 0;
          if (field.itemType === "boolean") return s.toLowerCase() === "true" || s === "yes";
          return s;
        });
    } else {
      input[key] = value as string | number | boolean | (string | number | boolean)[];
    }
  }
  return input;
}

// Mirrors the post-simulation matrix lookups the Simulator UI applies
// (src/app/simulator/page.tsx) so a dummy-API caller sees the same
// calculatedValues (interest rate, haircut, premium) a real UI run would.
function applyMatrixLookups(industry: string, input: InputMap, calculatedValues: Record<string, string | number>) {
  if (industry === "Lending") {
    const matrix = MATRICES.find((m) => m.id === "MTX-LEND-01");
    if (matrix) Object.assign(calculatedValues, lookupInterestRate(matrix, Number(input.credit_score)).calculatedValues);
  } else if (industry === "NBFC") {
    const matrix = MATRICES.find((m) => m.id === "MTX-NBFC-01");
    if (matrix) Object.assign(calculatedValues, lookupHaircut(matrix, String(input.collateral_type), Number(input.appraised_value)).calculatedValues);
  } else if (industry === "Insurance") {
    const matrix = MATRICES.find((m) => m.id === "MTX-INS-01");
    if (matrix) Object.assign(calculatedValues, lookupPremium(matrix, Number(input.applicant_age), Boolean(input.smoker)).calculatedValues);
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const industry = String(body.industry ?? "");
  if (!DEFAULT_INDUSTRIES.some((i) => i.id === industry)) {
    return NextResponse.json(
      { error: `Unknown or missing "industry". Valid values: ${DEFAULT_INDUSTRIES.map((i) => i.id).join(", ")}.` },
      { status: 400 }
    );
  }

  const requestedEnv = typeof body.environment === "string" ? (body.environment as RuleEnvironment) : undefined;
  const environment: RuleEnvironment = requestedEnv && VALID_ENVIRONMENTS.includes(requestedEnv) ? requestedEnv : "Prod";

  const requestedMode = typeof body.responseMode === "string" ? (body.responseMode as ResponseMode) : undefined;
  const responseMode: ResponseMode = requestedMode && VALID_MODES.includes(requestedMode) ? requestedMode : DEFAULT_DECISION_RESPONSE_CONFIG.defaultMode;

  const config: DecisionResponseConfig = {
    ...DEFAULT_DECISION_RESPONSE_CONFIG,
    ...(body.config && typeof body.config === "object" ? (body.config as Partial<DecisionResponseConfig>) : {}),
  };

  const input = parseInput((body.input && typeof body.input === "object" ? body.input : {}) as Record<string, unknown>);
  if (industry === "Lending") {
    const income = Number(input.monthly_income) || 1;
    const liabilities = Number(input.monthly_liabilities) || 0;
    input.dti_ratio = Math.round((liabilities / income) * 100);
  }

  const suppliedMappings: RuleExecutionMapping[] = Array.isArray(body.mappings) ? (body.mappings as RuleExecutionMapping[]) : [];
  const mappingParams: Record<string, string> = { industry };
  for (const def of DEFAULT_REQUEST_PARAMETER_DEFS) {
    if (typeof body[def.id] === "string") mappingParams[def.id] = body[def.id] as string;
  }
  const matched = suppliedMappings.length > 0 ? resolveMapping(suppliedMappings, mappingParams) : null;

  const decisionResult = matched
    ? fromRuleSetExecution(
        runRuleSetExecution(matched, ALL_RULES, DEFAULT_RULE_GROUPS, input, DEFAULT_FIELD_CATALOG, environment),
        ALL_RULES,
        industry,
        environment,
        input
      )
    : (() => {
        const sim = runSimulation(industry, ALL_RULES, input, DEFAULT_FIELD_CATALOG, [], environment);
        if (sim.outcome !== "Rejected") applyMatrixLookups(industry, input, sim.calculatedValues);
        return fromSimulation(sim, ALL_RULES, environment);
      })();

  return NextResponse.json(buildApiResponsePayload(decisionResult, responseMode, config), { status: 200 });
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/decision",
    body: {
      industry: `required — one of: ${DEFAULT_INDUSTRIES.map((i) => i.id).join(", ")}`,
      input: "object of Field Catalog values for the case, e.g. { credit_score: 740, applicant_age: 30, monthly_income: 80000 }",
      responseMode: VALID_MODES,
      environment: VALID_ENVIRONMENTS,
      "product / subProduct / customerType / channel / region": "optional Execution Manager mapping dimensions",
      mappings: "optional array of RuleExecutionMapping objects to route through — omit to run the plain per-industry ruleset",
      config: "optional partial DecisionResponseConfig overrides (show/enable flags)",
    },
    note:
      "Stateless demo endpoint — evaluated against this app's seed rules/rule groups, not any browser localStorage customizations. See docs/UI_FRAMEWORK.md and Configuration Studio → Decision Response Configuration for the full contract.",
  });
}
