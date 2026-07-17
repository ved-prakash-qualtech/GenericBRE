import { DecisionMatrix, MatrixRow } from "./types";

// Resolves a domain's post-decision matrix lookup generically — by `domain` +
// `lookupType`, not a hardcoded matrix id — so a new industry gets matrix
// pricing by adding a DecisionMatrix row in configuration alone, and a
// missing/renamed matrix degrades to "no calculated values" instead of a
// crash. Shared by the Simulator and the /api/decision route so the two
// surfaces can never drift out of sync.
export function applyMatrixLookup(
  matrices: DecisionMatrix[],
  domain: string,
  input: Record<string, string | number | boolean>
): Record<string, string | number> {
  const matrix = matrices.find((m) => m.domain === domain && m.lookupType);
  if (!matrix) return {};
  switch (matrix.lookupType) {
    case "interest-rate":
      return lookupInterestRate(matrix, Number(input.credit_score)).calculatedValues;
    case "haircut":
      return lookupHaircut(matrix, String(input.collateral_type), Number(input.appraised_value)).calculatedValues;
    case "premium":
      return lookupPremium(matrix, Number(input.applicant_age), Boolean(input.smoker)).calculatedValues;
    default:
      return {};
  }
}

export interface MatrixLookupResult {
  row: MatrixRow | null;
  calculatedValues: Record<string, string | number>;
}

export function lookupInterestRate(matrix: DecisionMatrix, creditScore: number): MatrixLookupResult {
  const row = matrix.rows.find(
    (r) => creditScore >= Number(r.values.scoreMin) && creditScore <= Number(r.values.scoreMax)
  );
  if (!row) return { row: null, calculatedValues: {} };
  return {
    row,
    calculatedValues: {
      interest_rate: `${row.values.interestRate}%`,
      workflow: String(row.values.workflow),
    },
  };
}

export function lookupHaircut(
  matrix: DecisionMatrix,
  collateralType: string,
  appraisedValue: number
): MatrixLookupResult {
  const candidates = matrix.rows
    .filter((r) => r.values.collateralType === collateralType && appraisedValue >= Number(r.values.minValue))
    .sort((a, b) => Number(b.values.minValue) - Number(a.values.minValue));
  const row = candidates[0] ?? null;
  if (!row) return { row: null, calculatedValues: {} };
  const haircut = Number(row.values.haircutPercent);
  const maxLtv = Number(row.values.maxLtv);
  const eligibleAmount = Math.round(appraisedValue * (1 - haircut / 100));
  const ltvAmount = Math.round(appraisedValue * (maxLtv / 100));
  return {
    row,
    calculatedValues: {
      haircut_percent: `${haircut}%`,
      max_ltv: `${maxLtv}%`,
      eligible_loan_amount: `₹${eligibleAmount.toLocaleString("en-IN")}`,
      ltv_capped_amount: `₹${ltvAmount.toLocaleString("en-IN")}`,
    },
  };
}

export function lookupPremium(matrix: DecisionMatrix, age: number, smoker: boolean): MatrixLookupResult {
  const smokerLabel = smoker ? "Yes" : "No";
  const row = matrix.rows.find(
    (r) => age >= Number(r.values.ageMin) && age <= Number(r.values.ageMax) && r.values.smoker === smokerLabel
  );
  if (!row) return { row: null, calculatedValues: {} };
  const base = Number(row.values.basePremium);
  const loading = Number(row.values.riskLoadingPercent);
  const finalPremium = Math.round(base * (1 + loading / 100));
  return {
    row,
    calculatedValues: {
      base_premium: `₹${base.toLocaleString("en-IN")}`,
      risk_loading: `${loading}%`,
      final_premium: `₹${finalPremium.toLocaleString("en-IN")}`,
    },
  };
}

// ---- Validation helpers used by the Decision Matrix module ----

export interface MatrixIssue {
  type: "overlap" | "duplicate" | "gap";
  message: string;
  rowIds: string[];
}

export function detectRangeOverlaps(matrix: DecisionMatrix): MatrixIssue[] {
  if (!matrix.rangeColumns) return [];
  const [minKey, maxKey] = matrix.rangeColumns;
  const issues: MatrixIssue[] = [];

  // group rows that share all non-range columns (e.g. same collateralType / smoker flag)
  const otherKeys = matrix.columns.map((c) => c.key).filter((k) => k !== minKey && k !== maxKey);
  const groups = new Map<string, MatrixRow[]>();
  for (const row of matrix.rows) {
    const groupKey = otherKeys.map((k) => row.values[k]).join("|");
    const arr = groups.get(groupKey) ?? [];
    arr.push(row);
    groups.set(groupKey, arr);
  }

  for (const rows of groups.values()) {
    const sorted = [...rows].sort((a, b) => Number(a.values[minKey]) - Number(b.values[minKey]));
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      const aMax = Number(a.values[maxKey]);
      const bMin = Number(b.values[minKey]);
      if (aMax >= bMin) {
        issues.push({
          type: "overlap",
          message: `Row ${a.id} (${a.values[minKey]}–${a.values[maxKey]}) overlaps Row ${b.id} (${b.values[minKey]}–${b.values[maxKey]}).`,
          rowIds: [a.id, b.id],
        });
      } else if (bMin - aMax > 1) {
        issues.push({
          type: "gap",
          message: `Gap detected between Row ${a.id} (ends ${a.values[maxKey]}) and Row ${b.id} (starts ${b.values[minKey]}).`,
          rowIds: [a.id, b.id],
        });
      }
    }
  }
  return issues;
}

export function detectDuplicateRows(matrix: DecisionMatrix): MatrixIssue[] {
  const seen = new Map<string, string>();
  const issues: MatrixIssue[] = [];
  for (const row of matrix.rows) {
    const key = matrix.columns.map((c) => row.values[c.key]).join("|");
    const existing = seen.get(key);
    if (existing) {
      issues.push({
        type: "duplicate",
        message: `Row ${row.id} is an exact duplicate of Row ${existing}.`,
        rowIds: [existing, row.id],
      });
    } else {
      seen.set(key, row.id);
    }
  }
  return issues;
}

export function validateMatrix(matrix: DecisionMatrix): MatrixIssue[] {
  return [...detectRangeOverlaps(matrix), ...detectDuplicateRows(matrix)];
}
