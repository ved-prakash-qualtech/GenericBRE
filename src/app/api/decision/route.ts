import { NextRequest, NextResponse } from "next/server";
import { ALL_RULES, MATRICES, DEFAULT_PRODUCTS, DEFAULT_PRODUCT_RULE_MAPPINGS } from "@/lib/mock-data";
import { DEFAULT_FIELD_CATALOG } from "@/lib/fields";
import { executeRulesByProduct } from "@/lib/product-rule-engine";
import {
  fromSimulation,
  buildApiResponsePayload,
  DEFAULT_DECISION_RESPONSE_CONFIG,
} from "@/lib/decision-response";
import { applyMatrixLookup } from "@/lib/matrix-lookup";
import { DecisionResponseConfig, ResponseMode } from "@/lib/types";

// A stateless demo endpoint for the Decision Result module. This prototype
// has no backend/database (see CLAUDE.md — the intended production stack is
// Java Spring Boot), so this evaluates against the same seed products/rules
// the UI ships with, not whatever a user has customized in their browser's
// localStorage.
//
// PRIMARY PATH — pass `productId` (or `product` as the Product.code).
// This identifies the product, fetches every rule mapped to it, and executes
// only those. The request payload is a single common JSON shape reused across
// every product — fields a given product's mapped rules don't reference are
// simply never read (see evaluateConditionLeaf in engine.ts).
//
// The old Execution Manager / multi-mapping / industry path has been removed.
// Use productId for all new integrations.

type InputMap = Record<string, string | number | boolean>;

const VALID_MODES: ResponseMode[] = ["decision-only", "decision-explanation", "decision-trace", "full-audit"];
// VALID_ENVIRONMENTS removed — FUTURE: restore when environment promotion is reintroduced
// const VALID_ENVIRONMENTS: RuleEnvironment[] = ["Dev", "UAT", "Prod"];

function parseInput(raw: Record<string, unknown>): InputMap {
  const input: InputMap = {};
  for (const [key, value] of Object.entries(raw)) {
    input[key] = value as string | number | boolean;
  }
  return input;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const requestedMode = typeof body.responseMode === "string" ? (body.responseMode as ResponseMode) : undefined;
  const responseMode: ResponseMode = requestedMode && VALID_MODES.includes(requestedMode) ? requestedMode : DEFAULT_DECISION_RESPONSE_CONFIG.defaultMode;

  const config: DecisionResponseConfig = {
    ...DEFAULT_DECISION_RESPONSE_CONFIG,
    ...(body.config && typeof body.config === "object" ? (body.config as Partial<DecisionResponseConfig>) : {}),
  };

  const input = parseInput((body.input && typeof body.input === "object" ? body.input : {}) as Record<string, unknown>);

  // ---- Primary path: identify the product from the request ----
  const productIdOrCode = typeof body.productId === "string" ? body.productId : typeof body.product === "string" ? body.product : "";
  if (!productIdOrCode) {
    return NextResponse.json(
      { error: `"productId" is required. Valid values: ${DEFAULT_PRODUCTS.map((p) => p.code).join(", ")}.` },
      { status: 400 }
    );
  }

  const product = DEFAULT_PRODUCTS.find((p) => p.id === productIdOrCode || p.code === productIdOrCode);
  if (!product) {
    return NextResponse.json(
      { error: `Unknown product "${productIdOrCode}". Valid values: ${DEFAULT_PRODUCTS.map((p) => p.code).join(", ")}.` },
      { status: 404 }
    );
  }

  if (product.domain === "Lending") {
    const income = Number(input.monthly_income) || 1;
    const liabilities = Number(input.monthly_liabilities) || 0;
    input.dti_ratio = Math.round((liabilities / income) * 100);
  }

  const execution = executeRulesByProduct(product, ALL_RULES, DEFAULT_PRODUCT_RULE_MAPPINGS, input, DEFAULT_FIELD_CATALOG);
  if (!execution.ok || !execution.result) {
    return NextResponse.json({ error: execution.reason ?? "Unable to execute rules for this product." }, { status: 400 });
  }
  if (execution.result.outcome !== "Rejected") {
    Object.assign(execution.result.calculatedValues, applyMatrixLookup(MATRICES, product.domain, input));
  }
  const decisionResult = fromSimulation(execution.result, ALL_RULES);
  return NextResponse.json(buildApiResponsePayload(decisionResult, responseMode, config), { status: 200 });
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/decision",
    body: {
      productId: `required — Product.id or Product.code, one of: ${DEFAULT_PRODUCTS.map((p) => p.code).join(", ")}`,
      input: "single common JSON object of Field Catalog values, e.g. { credit_score: 740, applicant_age: 30, monthly_income: 80000 }. Fields a product's mapped rules don't use may be omitted or null.",
      responseMode: VALID_MODES,
      config: "optional partial DecisionResponseConfig overrides (show/enable flags)",
    },
    note:
      "Stateless demo endpoint — evaluated against this app's seed products/rules, not any browser localStorage customizations. A product with zero mapped rules returns a 200 with reasonCode NO_RULES_MAPPED, not an error.",
  });
}
