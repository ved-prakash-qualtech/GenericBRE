import {
  AppUser,
  AuditEntry,
  BusinessRule,
  Condition,
  ConditionGroup,
  DecisionMatrix,
  Domain,
  NotifyCategory,
  NotifyExecutionLog,
  NotifyTrigger,
  NotifyWorkflow,
  NotifyWorkflowTemplate,
  Priority,
  Product,
  ProductRuleMapping,
  Role,
  RuleGroup,
  RuleStatus,
  RuleTemplate,
} from "./types";
import { DEFAULT_RULE_CATEGORIES, DEFAULT_OWNERS } from "./fields";
import { buildHashChain } from "./audit-chain";
import rolesData from "@/data/roles.json";

// ---------- deterministic seeded RNG (avoids SSR/CSR hydration drift) ----------
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(87246);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

let condCounter = 0;
let ruleCounter = 400;
const cid = () => `C-${(++condCounter).toString().padStart(4, "0")}`;

function cond(field: string, operator: Condition["operator"], value: string, value2?: string): Condition {
  return { id: cid(), type: "condition", field, operator, value, value2 };
}

function group(logic: "AND" | "OR", children: (Condition | ConditionGroup)[]): ConditionGroup {
  return { id: cid(), type: "group", logic, children };
}

const now = new Date("2026-07-08T09:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

function makeRule(partial: {
  id: string;
  name: string;
  domain: Domain;
  category: string;
  subCategory?: string;
  priority: Priority;
  status: RuleStatus;
  description: string;
  owner: string;
  rootGroup: ConditionGroup;
  actions: BusinessRule["actions"];
  createdDaysAgo: number;
  updatedDaysAgo: number;
  simulatable?: boolean;
  groupId?: string;
}): BusinessRule {
  return {
    id: partial.id,
    name: partial.name,
    domain: partial.domain,
    category: partial.category,
    subCategory: partial.subCategory,
    groupId: partial.groupId,
    priority: partial.priority,
    status: partial.status,
    description: partial.description,
    owner: partial.owner,
    rootGroup: partial.rootGroup,
    actions: partial.actions,
    simulatable: partial.simulatable ?? true,
    createdAt: daysAgo(partial.createdDaysAgo),
    updatedAt: daysAgo(partial.updatedDaysAgo),
    version: 1,
  };
}

// ============================================================
// CORE, FULLY-WIRED RULES — these drive the live simulator demo
// ============================================================
export const CORE_RULES: BusinessRule[] = [
  // ---------------- LENDING ----------------
  makeRule({
    id: "RL-101",
    name: "Minimum Credit Score Validation",
    domain: "Lending",
    category: "Eligibility",
    subCategory: "Bureau Checks",
    priority: 1,
    status: "Active",
    description: "Rejects applicants whose bureau credit score falls below the configured minimum threshold.",
    owner: "Credit Risk Division",
    rootGroup: group("AND", [cond("credit_score", "<", "650")]),
    actions: [
      { id: cid(), type: "Reject", reasonCode: "LOW_CREDIT_SCORE", message: "Credit score below minimum threshold of 650." },
    ],
    createdDaysAgo: 120,
    updatedDaysAgo: 2,
  }),
  makeRule({
    id: "RL-103",
    name: "Minimum Age Validation",
    domain: "Lending",
    category: "Eligibility",
    priority: 1,
    status: "Active",
    description: "Ensures the applicant meets the minimum legal age requirement for loan origination.",
    owner: "Credit Risk Division",
    rootGroup: group("AND", [cond("applicant_age", "<", "21")]),
    actions: [
      { id: cid(), type: "Reject", reasonCode: "AGE_INELIGIBLE", message: "Applicant does not meet minimum age requirement of 21." },
    ],
    createdDaysAgo: 118,
    updatedDaysAgo: 40,
  }),
  makeRule({
    id: "RL-104",
    name: "Debt-to-Income Ratio Cap",
    domain: "Lending",
    category: "Risk & Fraud",
    priority: 2,
    status: "Active",
    description: "Flags applicants whose fixed obligations exceed a safe proportion of monthly income.",
    owner: "Credit Risk Division",
    rootGroup: group("AND", [cond("dti_ratio", ">=", "50")]),
    actions: [
      { id: cid(), type: "Reject", reasonCode: "HIGH_DTI", message: "Debt-to-income ratio of 50% or higher exceeds policy limit." },
    ],
    createdDaysAgo: 110,
    updatedDaysAgo: 15,
  }),
  makeRule({
    id: "RL-105",
    name: "Self-Employed High-Ticket Review",
    domain: "Lending",
    category: "Underwriting",
    priority: 3,
    status: "Active",
    description: "Routes high-value loan requests from self-employed applicants to manual underwriting review.",
    owner: "Product Strategy Team",
    rootGroup: group("AND", [
      cond("employment_type", "=", "Self-Employed"),
      cond("loan_amount", ">", "2000000"),
    ]),
    actions: [
      { id: cid(), type: "Show Message", reasonCode: "REVIEW_ADDITIONAL_DOCS", message: "Review required: self-employed applicant requesting high-value loan." },
    ],
    createdDaysAgo: 95,
    updatedDaysAgo: 8,
  }),
  makeRule({
    id: "RL-107",
    name: "High Loan Amount Manager Review",
    domain: "Lending",
    category: "Risk & Fraud",
    priority: 2,
    status: "Active",
    description: "Escalates very large loan requests for senior manager sign-off before approval.",
    owner: "Credit Risk Division",
    rootGroup: group("AND", [cond("loan_amount", ">", "5000000")]),
    actions: [
      { id: cid(), type: "Show Message", reasonCode: "HIGH_VALUE_REVIEW", message: "Review required: loan amount exceeds ₹50,00,000 auto-approval ceiling." },
    ],
    createdDaysAgo: 80,
    updatedDaysAgo: 30,
  }),
  makeRule({
    id: "RL-106",
    name: "Standard Lending Approval",
    domain: "Lending",
    category: "Eligibility",
    priority: 5,
    status: "Active",
    description: "Baseline approval action applied once all higher-priority eligibility and risk checks pass.",
    owner: "Product Strategy Team",
    rootGroup: group("AND", []),
    actions: [
      { id: cid(), type: "Approve", reasonCode: "ELIGIBLE_CUSTOMER", message: "Applicant meets all eligibility and underwriting criteria." },
    ],
    createdDaysAgo: 120,
    updatedDaysAgo: 60,
  }),
  makeRule({
    id: "RL-108",
    name: "Non-Metro KYC Compliance Check",
    domain: "Lending",
    category: "Compliance",
    priority: 4,
    status: "Draft",
    description: "Draft rule under review: flags applicants outside standard metro coverage for extended KYC.",
    owner: "Compliance Office",
    rootGroup: group("AND", [cond("city", "=", "Other")]),
    actions: [{ id: cid(), type: "Show Message", reasonCode: "KYC_LOCATION_REVIEW", message: "Extended KYC required for non-metro applicants." }],
    createdDaysAgo: 6,
    updatedDaysAgo: 1,
  }),
  makeRule({
    id: "RL-109",
    name: "Premium Segment Fast-Track",
    domain: "Lending",
    category: "Eligibility",
    priority: 3,
    status: "Inactive",
    description: "Disabled pilot rule that fast-tracked premium-segment applicants; paused pending policy review.",
    owner: "Product Strategy Team",
    rootGroup: group("AND", [cond("segment", "=", "Premium")]),
    actions: [{ id: cid(), type: "Show Message", reasonCode: "FAST_TRACK", message: "Premium segment fast-track applied." }],
    createdDaysAgo: 60,
    updatedDaysAgo: 45,
  }),
  makeRule({
    id: "RL-111",
    name: "High-Risk Profile Escalation",
    domain: "Lending",
    category: "Underwriting",
    priority: 2,
    status: "Active",
    description:
      "Nested group demo (OR of two ANDs): escalates a case if either a marginal-credit self-employed applicant, or a large loan paired with a high DTI, is detected.",
    owner: "Credit Risk Division",
    rootGroup: group("OR", [
      group("AND", [cond("credit_score", "<", "700"), cond("employment_type", "=", "Self-Employed")]),
      group("AND", [cond("loan_amount", ">", "3000000"), cond("dti_ratio", ">", "40")]),
    ]),
    actions: [
      { id: cid(), type: "Show Message", reasonCode: "COMPOSITE_RISK_REVIEW", message: "Composite risk profile detected — route to senior underwriter." },
    ],
    createdDaysAgo: 10,
    updatedDaysAgo: 3,
    groupId: "grp-risk-review",
  }),

  // ---------------- INSURANCE ----------------
  makeRule({
    id: "RL-202",
    name: "Minimum Age for Coverage",
    domain: "Insurance",
    category: "Eligibility",
    priority: 1,
    status: "Active",
    description: "Rejects proposals from applicants below the minimum insurable age.",
    owner: "Actuarial Underwriting",
    rootGroup: group("AND", [cond("applicant_age", "<", "18")]),
    actions: [{ id: cid(), type: "Reject", reasonCode: "UNDERAGE_APPLICANT", message: "Applicant is below the minimum insurable age of 18." }],
    createdDaysAgo: 130, updatedDaysAgo: 20,
  }),
  makeRule({
    id: "RL-203",
    name: "Senior Applicant Underwriting Referral",
    domain: "Insurance",
    category: "Underwriting",
    priority: 2,
    status: "Active",
    description: "Refers applicants above standard age bands for senior medical underwriting review.",
    owner: "Actuarial Underwriting",
    rootGroup: group("AND", [cond("applicant_age", ">", "65")]),
    actions: [{ id: cid(), type: "Show Message", reasonCode: "SENIOR_UNDERWRITING_REQUIRED", message: "Manual senior underwriting review required for applicants above 65." }],
    createdDaysAgo: 100, updatedDaysAgo: 12,
  }),
  makeRule({
    id: "RL-204",
    name: "High BMI Medical Referral",
    domain: "Insurance",
    category: "Underwriting",
    priority: 2,
    status: "Active",
    description: "Flags applicants with elevated BMI for a supplementary medical assessment.",
    owner: "Actuarial Underwriting",
    rootGroup: group("AND", [cond("bmi", ">", "35")]),
    actions: [{ id: cid(), type: "Show Message", reasonCode: "MEDICAL_REFERRAL_REQUIRED", message: "BMI above 35 requires supplementary medical assessment." }],
    createdDaysAgo: 90, updatedDaysAgo: 25,
  }),
  makeRule({
    id: "RL-205",
    name: "Dual Risk Factor Referral",
    domain: "Insurance",
    category: "Risk & Fraud",
    priority: 2,
    status: "Active",
    description: "Escalates applicants combining adverse medical history with high-risk occupation.",
    owner: "Actuarial Underwriting",
    rootGroup: group("AND", [
      cond("medical_history", "=", "true"),
      cond("occupation_type", "=", "High Risk"),
    ]),
    actions: [{ id: cid(), type: "Show Message", reasonCode: "DUAL_RISK_REFERRAL", message: "Combined medical history and high-risk occupation requires referral." }],
    createdDaysAgo: 75, updatedDaysAgo: 5,
  }),
  makeRule({
    id: "RL-206",
    name: "High Sum Assured Verification",
    domain: "Insurance",
    category: "Compliance",
    priority: 3,
    status: "Active",
    description: "Requires additional financial verification for very large sum assured requests.",
    owner: "Compliance Office",
    rootGroup: group("AND", [cond("sum_assured", ">", "5000000")]),
    actions: [{ id: cid(), type: "Show Message", reasonCode: "HIGH_SUM_ASSURED_CHECK", message: "Sum assured above ₹50,00,000 requires financial verification." }],
    createdDaysAgo: 70, updatedDaysAgo: 33,
  }),
  makeRule({
    id: "RL-201",
    name: "Smoker Risk Classification",
    domain: "Insurance",
    category: "Pricing",
    priority: 4,
    status: "Active",
    description: "Tags smoker declarations so premium loading is applied from the Insurance Premium Rate Slabs matrix.",
    owner: "Actuarial Underwriting",
    rootGroup: group("AND", [cond("smoker", "=", "true")]),
    actions: [{ id: cid(), type: "Assign Value", outputField: "risk_classification", outputValue: "Loaded", reasonCode: "SMOKER_LOADING" }],
    createdDaysAgo: 140, updatedDaysAgo: 3,
  }),
  makeRule({
    id: "RL-207",
    name: "Standard Policy Approval",
    domain: "Insurance",
    category: "Eligibility",
    priority: 5,
    status: "Active",
    description: "Baseline approval action applied once all higher-priority underwriting checks pass.",
    owner: "Actuarial Underwriting",
    rootGroup: group("AND", []),
    actions: [{ id: cid(), type: "Approve", reasonCode: "ELIGIBLE_CUSTOMER", message: "Applicant meets all underwriting criteria for standard policy issuance." }],
    createdDaysAgo: 140, updatedDaysAgo: 60,
  }),
  makeRule({
    id: "RL-208",
    name: "Hazardous Occupation Exclusion",
    domain: "Insurance",
    category: "Compliance",
    priority: 1,
    status: "Draft",
    description: "Draft rule under actuarial review: would exclude combined smoker + high-risk-occupation proposals.",
    owner: "Compliance Office",
    rootGroup: group("AND", [
      cond("occupation_type", "=", "High Risk"),
      cond("smoker", "=", "true"),
    ]),
    actions: [{ id: cid(), type: "Reject", reasonCode: "HAZARDOUS_EXCLUSION", message: "Combined smoker and high-risk occupation profile excluded under draft policy." }],
    createdDaysAgo: 4, updatedDaysAgo: 1,
  }),
  makeRule({
    id: "RL-210",
    name: "Composite Underwriting Risk Gate",
    domain: "Insurance",
    category: "Risk & Fraud",
    priority: 2,
    status: "Active",
    description:
      "Nested group demo (OR of two ANDs): flags a proposal if either an overweight smoker, or a high-risk occupation combined with a large sum assured, is detected.",
    owner: "Actuarial Underwriting",
    rootGroup: group("OR", [
      group("AND", [cond("smoker", "=", "true"), cond("bmi", ">", "30")]),
      group("AND", [cond("occupation_type", "=", "High Risk"), cond("sum_assured", ">", "3000000")]),
    ]),
    actions: [
      { id: cid(), type: "Show Message", reasonCode: "COMPOSITE_UNDERWRITING_RISK", message: "Composite underwriting risk detected — route for manual review." },
    ],
    createdDaysAgo: 7, updatedDaysAgo: 1,
    groupId: "grp-risk-review",
  }),

  // ---------------- NBFC / GOLD LOAN ----------------
  makeRule({
    id: "RL-301",
    name: "Unsupported Collateral Exclusion",
    domain: "NBFC",
    category: "Collateral",
    priority: 1,
    status: "Active",
    description: "Rejects collateral types that are not currently supported for secured lending.",
    owner: "Asset Management Group",
    rootGroup: group("AND", [cond("collateral_type", "=", "Securities")]),
    actions: [{ id: cid(), type: "Reject", reasonCode: "UNSUPPORTED_COLLATERAL", message: "Securities are not accepted as collateral under current policy." }],
    createdDaysAgo: 115, updatedDaysAgo: 50,
  }),
  makeRule({
    id: "RL-302",
    name: "Minimum Appraised Value Threshold",
    domain: "NBFC",
    category: "Collateral",
    priority: 2,
    status: "Active",
    description: "Rejects collateral appraised below the minimum lendable value.",
    owner: "Asset Management Group",
    rootGroup: group("AND", [cond("appraised_value", "<", "50000")]),
    actions: [{ id: cid(), type: "Reject", reasonCode: "BELOW_MIN_VALUATION", message: "Appraised asset value is below the minimum lendable threshold of ₹50,000." }],
    createdDaysAgo: 105, updatedDaysAgo: 18,
  }),
  makeRule({
    id: "RL-303",
    name: "Gold Purity Grade Check",
    domain: "NBFC",
    category: "Compliance",
    priority: 2,
    status: "Active",
    description: "Rejects gold collateral that does not meet the minimum purity grade for valuation.",
    owner: "Asset Management Group",
    rootGroup: group("AND", [
      cond("collateral_type", "=", "Gold"),
      cond("purity_grade", "<", "75"),
    ]),
    actions: [{ id: cid(), type: "Reject", reasonCode: "SUBSTANDARD_PURITY", message: "Gold purity below 75% does not meet policy standard." }],
    createdDaysAgo: 98, updatedDaysAgo: 9,
  }),
  makeRule({
    id: "RL-304",
    name: "LTV Ceiling Guardrail",
    domain: "NBFC",
    category: "Risk & Fraud",
    priority: 2,
    status: "Active",
    description: "Flags loan-to-value requests that exceed the maximum permitted ceiling for manual review.",
    owner: "Credit Risk Division",
    rootGroup: group("AND", [cond("ltv_requested", ">", "75")]),
    actions: [{ id: cid(), type: "Show Message", reasonCode: "LTV_EXCEEDS_CEILING", message: "Requested LTV exceeds the 75% policy ceiling; review required." }],
    createdDaysAgo: 88, updatedDaysAgo: 22,
  }),
  makeRule({
    id: "RL-305",
    name: "High-Value Asset Manager Sign-off",
    domain: "NBFC",
    category: "Underwriting",
    priority: 3,
    status: "Active",
    description: "Escalates high-value collateral for manager sign-off before disbursement.",
    owner: "Asset Management Group",
    rootGroup: group("AND", [cond("appraised_value", ">", "1000000")]),
    actions: [{ id: cid(), type: "Show Message", reasonCode: "HIGH_VALUE_ASSET_SIGNOFF", message: "Asset value above ₹10,00,000 requires manager sign-off." }],
    createdDaysAgo: 82, updatedDaysAgo: 40,
  }),
  makeRule({
    id: "RL-306",
    name: "Standard Collateral Approval",
    domain: "NBFC",
    category: "Eligibility",
    priority: 5,
    status: "Active",
    description: "Baseline approval action applied once all higher-priority collateral checks pass.",
    owner: "Asset Management Group",
    rootGroup: group("AND", []),
    actions: [{ id: cid(), type: "Approve", reasonCode: "ELIGIBLE_CUSTOMER", message: "Collateral meets all eligibility criteria for secured financing." }],
    createdDaysAgo: 115, updatedDaysAgo: 65,
  }),
  makeRule({
    id: "RL-307",
    name: "Used Vehicle Age Restriction",
    domain: "NBFC",
    category: "Compliance",
    priority: 2,
    status: "Inactive",
    description: "Paused rule that previously restricted financing on vehicles beyond a certain registration age.",
    owner: "Asset Management Group",
    rootGroup: group("AND", [cond("collateral_type", "=", "Vehicle")]),
    actions: [{ id: cid(), type: "Show Message", reasonCode: "VEHICLE_AGE_CHECK", message: "Vehicle registration age verification required." }],
    createdDaysAgo: 55, updatedDaysAgo: 48,
  }),
  makeRule({
    id: "RL-310",
    name: "Bulk High-Value Pledge Escalation",
    domain: "NBFC",
    category: "Risk & Fraud",
    priority: 2,
    status: "Active",
    description:
      "Nested group demo (OR of two ANDs): escalates a pledge if either high-value gold collateral or a high-LTV property pledge is detected.",
    owner: "Credit Risk Division",
    rootGroup: group("OR", [
      group("AND", [cond("collateral_type", "=", "Gold"), cond("appraised_value", ">", "800000")]),
      group("AND", [cond("collateral_type", "=", "Property"), cond("ltv_requested", ">", "60")]),
    ]),
    actions: [{ id: cid(), type: "Show Message", reasonCode: "BULK_PLEDGE_ESCALATION", message: "High-value pledge profile detected — route for manager escalation." }],
    createdDaysAgo: 5, updatedDaysAgo: 1,
    groupId: "grp-risk-review",
  }),
];

// ============================================================
// FILLER RULES — pad repository/dashboard to enterprise scale.
// Always non-blocking (Show Message) so they never affect the
// live simulator outcome; only Draft/Inactive/Archived status
// keeps the "wired" Active core rules fully in control.
// ============================================================
const FILLER_DOMAINS: Domain[] = ["Lending", "Insurance", "NBFC"];
const FILLER_FIELDS: Record<Domain, string[]> = {
  Lending: ["credit_score", "monthly_income", "loan_amount", "employment_type", "applicant_age"],
  Insurance: ["bmi", "sum_assured", "occupation_type", "applicant_age", "base_premium"],
  NBFC: ["appraised_value", "purity_grade", "ltv_requested", "collateral_type"],
};
const FILLER_NAME_STEMS = [
  "Legacy Threshold Review", "Regional Pricing Adjustment", "Channel Eligibility Note",
  "Seasonal Campaign Flag", "Partner Portal Variance Check", "Document Completeness Note",
  "Secondary Verification Flag", "Cross-Sell Eligibility Tag", "Retention Offer Check",
  "Portfolio Concentration Note", "Legacy System Migration Flag", "Batch Reconciliation Note",
  "Onboarding Friction Check", "Channel Mix Adjustment", "Promotional Rate Note",
  "Data Quality Flag", "Regulatory Watchlist Note", "Backoffice Escalation Tag",
];

function generateFillerRules(count: number): BusinessRule[] {
  const statuses: RuleStatus[] = ["Active", "Active", "Active", "Active", "Draft", "Draft", "Inactive", "Archived"];
  const out: BusinessRule[] = [];
  for (let i = 0; i < count; i++) {
    const domain = pick(FILLER_DOMAINS);
    const field = pick(FILLER_FIELDS[domain]);
    const status = pick(statuses);
    const stem = pick(FILLER_NAME_STEMS);
    ruleCounter += 1;
    const opNum = rng() > 0.5 ? ">" : "<";
    const val = Math.floor(rng() * 500 + 10);
    out.push(
      makeRule({
        id: `RL-${ruleCounter}`,
        name: `${stem} #${ruleCounter}`,
        domain,
        category: pick(DEFAULT_RULE_CATEGORIES).name,
        priority: (Math.ceil(rng() * 5) as Priority),
        status,
        description: `Supporting configuration rule covering ${field.replace(/_/g, " ")} variance handling for ${domain.toLowerCase()} operations.`,
        owner: pick(DEFAULT_OWNERS),
        rootGroup: group("AND", [cond(field, opNum, String(val))]),
        actions: [{ id: cid(), type: "Show Message", reasonCode: "INFO_FLAG", message: "Informational flag — does not affect final decision." }],
        createdDaysAgo: Math.floor(rng() * 150) + 1,
        updatedDaysAgo: Math.floor(rng() * 30),
        simulatable: false,
      })
    );
  }
  return out;
}

export const ALL_RULES: BusinessRule[] = [...CORE_RULES, ...generateFillerRules(98)];

// ============================================================
// DECISION MATRICES
// ============================================================
export const MATRICES: DecisionMatrix[] = [
  {
    id: "MTX-LEND-01",
    domain: "Lending",
    name: "Bank Risk-Tiered Core Pricing Slabs",
    description: "Maps bureau credit score bands to interest rate multipliers and processing workflow.",
    columns: [
      { key: "scoreMin", label: "Score Min", type: "number" },
      { key: "scoreMax", label: "Score Max", type: "number" },
      { key: "interestRate", label: "Interest Rate", type: "percent", unit: "%" },
      { key: "workflow", label: "Workflow Assignment", type: "text" },
    ],
    rangeColumns: ["scoreMin", "scoreMax"],
    rows: [
      { id: "R1", values: { scoreMin: 800, scoreMax: 900, interestRate: 8.5, workflow: "Preferred Underwriting Stream" } },
      { id: "R2", values: { scoreMin: 750, scoreMax: 799, interestRate: 9.0, workflow: "Standard Processing Queue" } },
      { id: "R3", values: { scoreMin: 700, scoreMax: 749, interestRate: 10.0, workflow: "Enhanced Monitoring" } },
      { id: "R4", values: { scoreMin: 650, scoreMax: 699, interestRate: 11.5, workflow: "Co-Signer Evaluation Required" } },
    ],
    updatedAt: daysAgo(2),
  },
  {
    id: "MTX-NBFC-01",
    domain: "NBFC",
    name: "Asset Allocation Haircut & LTV Matrix",
    description: "Defines haircut margin and eligible LTV ceiling by collateral type and appraised value tier.",
    columns: [
      { key: "collateralType", label: "Collateral Type", type: "select", options: ["Gold", "Vehicle", "Property"] },
      { key: "minValue", label: "Min Value (₹)", type: "currency" },
      { key: "haircutPercent", label: "Haircut %", type: "percent", unit: "%" },
      { key: "maxLtv", label: "Max LTV %", type: "percent", unit: "%" },
    ],
    rows: [
      { id: "R1", values: { collateralType: "Gold", minValue: 50000, haircutPercent: 25, maxLtv: 75 } },
      { id: "R2", values: { collateralType: "Gold", minValue: 500000, haircutPercent: 22, maxLtv: 78 } },
      { id: "R3", values: { collateralType: "Vehicle", minValue: 50000, haircutPercent: 40, maxLtv: 60 } },
      { id: "R4", values: { collateralType: "Vehicle", minValue: 800000, haircutPercent: 35, maxLtv: 65 } },
      { id: "R5", values: { collateralType: "Property", minValue: 500000, haircutPercent: 30, maxLtv: 70 } },
    ],
    updatedAt: daysAgo(5),
  },
  {
    id: "MTX-INS-01",
    domain: "Insurance",
    name: "Insurance Premium Rate Slabs",
    description: "Determines base premium and smoker risk loading by applicant age band.",
    columns: [
      { key: "ageMin", label: "Age Min", type: "number" },
      { key: "ageMax", label: "Age Max", type: "number" },
      { key: "smoker", label: "Smoker", type: "select", options: ["No", "Yes"] },
      { key: "basePremium", label: "Base Premium (₹)", type: "currency" },
      { key: "riskLoadingPercent", label: "Risk Loading %", type: "percent", unit: "%" },
    ],
    rangeColumns: ["ageMin", "ageMax"],
    rows: [
      { id: "R1", values: { ageMin: 18, ageMax: 30, smoker: "No", basePremium: 10000, riskLoadingPercent: 0 } },
      { id: "R2", values: { ageMin: 18, ageMax: 30, smoker: "Yes", basePremium: 10000, riskLoadingPercent: 20 } },
      { id: "R3", values: { ageMin: 31, ageMax: 45, smoker: "No", basePremium: 12000, riskLoadingPercent: 0 } },
      { id: "R4", values: { ageMin: 31, ageMax: 45, smoker: "Yes", basePremium: 12000, riskLoadingPercent: 20 } },
      { id: "R5", values: { ageMin: 46, ageMax: 60, smoker: "No", basePremium: 16000, riskLoadingPercent: 0 } },
      { id: "R6", values: { ageMin: 46, ageMax: 60, smoker: "Yes", basePremium: 16000, riskLoadingPercent: 35 } },
    ],
    updatedAt: daysAgo(1),
  },
];

// ============================================================
// AUDIT LOG
// ============================================================
export const AUDIT_LOG: AuditEntry[] = buildHashChain([
  { id: "A1", timestamp: daysAgo(0.05), user: "Jyoti Sonani", action: "Published Rule", entity: "BusinessRule", entityId: "RL-101", details: "Status changed Draft → Active." },
  { id: "A2", timestamp: daysAgo(0.3), user: "Naveen Kumar", action: "Edited Matrix", entity: "DecisionMatrix", entityId: "MTX-LEND-01", details: "Updated interest rate for 650–699 band from 12.0% to 11.5%." },
  { id: "A3", timestamp: daysAgo(0.5), user: "Radhe", action: "Ran Simulation", entity: "Simulation", entityId: "SIM-4471", details: "Digital Lending scenario, outcome Approved." },
  { id: "A4", timestamp: daysAgo(1), user: "Saurabh Anand", action: "Cloned Rule", entity: "BusinessRule", entityId: "RL-206", details: "Cloned to RL-2061 as Draft." },
  { id: "A5", timestamp: daysAgo(1.4), user: "Shivang Sharma", action: "Save Failed", entity: "BusinessRule", entityId: "RL-303", details: "Validation error: mandatory Value field missing." },
  { id: "A6", timestamp: daysAgo(2), user: "System", action: "Export Delivered", entity: "Report", entityId: "RPT-WEEKLY-14", details: "CSV export delivered to risk-ops@qualtechedge.com." },
  { id: "A7", timestamp: daysAgo(4), user: "Ashutosh Vishwakarma", action: "Disabled Rule", entity: "BusinessRule", entityId: "RL-109", details: "Status changed Active → Inactive." },
  { id: "A8", timestamp: daysAgo(6), user: "Jyoti Sonani", action: "Created Rule", entity: "BusinessRule", entityId: "RL-108", details: "New Draft rule created in Compliance category." },
]);

export const RECENT_DEPLOYMENTS = [
  { id: "D1", ruleId: "RL-101", ruleName: "Minimum Credit Score Validation", domain: "Lending" as Domain, timestamp: daysAgo(0.05), status: "Live" as const },
  { id: "D2", ruleId: "RL-201", ruleName: "Smoker Risk Classification", domain: "Insurance" as Domain, timestamp: daysAgo(3), status: "Live" as const },
  { id: "D3", ruleId: "RL-304", ruleName: "LTV Ceiling Guardrail", domain: "NBFC" as Domain, timestamp: daysAgo(9), status: "Live" as const },
  { id: "D4", ruleId: "RL-108", ruleName: "Non-Metro KYC Compliance Check", domain: "Lending" as Domain, timestamp: daysAgo(6), status: "Pending" as const },
];

// ============================================================
// ROLES — seeded 1:1 from BRD §5.4's Target Role-Based Access Matrix, loaded
// from src/data/roles.json (personaName + icon power the "Switch Role" demo
// picker). Fully renameable/editable via the Configuration Studio;
// enforcement is client-side only (no backend in this prototype).
// ============================================================
export const DEFAULT_ROLES: Role[] = rolesData as Role[];

// ============================================================
// RULE GROUPS — organizational collections, independent of Category.
// ============================================================
export const DEFAULT_RULE_GROUPS: RuleGroup[] = [
  { id: "grp-core-eligibility", name: "Core Eligibility Bundle", description: "The baseline pass/fail checks every application must clear first." },
  { id: "grp-risk-review", name: "Risk & Compliance Review", description: "Rules that flag a case for manual review rather than an automatic decision." },
  { id: "grp-pricing", name: "Pricing & Calculation", description: "Rules that compute or adjust a numeric outcome rather than approve/reject." },
];

// ============================================================
// PRODUCT MASTER + PRODUCT-RULE MAPPING — a Product is just a configurable
// named scheme a client offers (Home Loan, Auto Loan, ...); which rules apply
// to it is entirely data (ProductRuleMapping), not code. Seeded here so the
// new Studio pages and Simulator aren't empty on first load.
// ============================================================

const PRODUCT_SEED_TIMESTAMP = "2026-01-15T09:00:00.000Z";

export const DEFAULT_PRODUCTS: Product[] = [
  { id: "prod-home-loan", name: "Home Loan", code: "HOME_LOAN", domain: "Lending", description: "Standard salaried/self-employed home loan scheme.", status: "Active", publishStatus: "Published", lastPublishedAt: PRODUCT_SEED_TIMESTAMP, createdAt: PRODUCT_SEED_TIMESTAMP, updatedAt: PRODUCT_SEED_TIMESTAMP },
  { id: "prod-auto-loan", name: "Auto Loan", code: "AUTO_LOAN", domain: "Lending", description: "New/used vehicle purchase financing.", status: "Active", publishStatus: "Draft", createdAt: PRODUCT_SEED_TIMESTAMP, updatedAt: PRODUCT_SEED_TIMESTAMP },
  { id: "prod-term-life", name: "Term Life Cover", code: "TERM_LIFE", domain: "Insurance", description: "Pure protection term life plan.", status: "Active", publishStatus: "Published", lastPublishedAt: PRODUCT_SEED_TIMESTAMP, createdAt: PRODUCT_SEED_TIMESTAMP, updatedAt: PRODUCT_SEED_TIMESTAMP },
  { id: "prod-gold-loan", name: "Gold Loan", code: "GOLD_LOAN", domain: "NBFC", description: "Collateral-backed gold loan scheme.", status: "Active", publishStatus: "Draft", createdAt: PRODUCT_SEED_TIMESTAMP, updatedAt: PRODUCT_SEED_TIMESTAMP },
];

function mapping(id: string, productId: string, ruleId: string, order: number): ProductRuleMapping {
  return { id, productId, ruleId, active: true, order, createdAt: PRODUCT_SEED_TIMESTAMP };
}

export const DEFAULT_PRODUCT_RULE_MAPPINGS: ProductRuleMapping[] = [
  mapping("prm-1", "prod-home-loan", "RL-101", 0),
  mapping("prm-2", "prod-home-loan", "RL-103", 1),
  mapping("prm-3", "prod-home-loan", "RL-104", 2),
  mapping("prm-4", "prod-home-loan", "RL-106", 3),
  mapping("prm-5", "prod-auto-loan", "RL-103", 0),
  mapping("prm-6", "prod-auto-loan", "RL-107", 1),
  mapping("prm-7", "prod-term-life", "RL-202", 0),
  mapping("prm-8", "prod-term-life", "RL-201", 1),
  mapping("prm-9", "prod-gold-loan", "RL-301", 0),
  mapping("prm-10", "prod-gold-loan", "RL-302", 1),
];

// ============================================================
// USER ROSTER — individual named people. `role` is a free-text title, not a
// foreign key (deliberately independent of the `Role` capability-template
// list below). approvalCategories powers Maker-Checker: which Rule Category
// names (RuleCategory.name, from the configurable ruleCategories list) this
// person is authorized to approve. Seeded here with the business-reference
// mapping from the BRD, but it's plain configuration — the System
// Administrator can assign any category to any user via the checkboxes,
// nothing below is enforced in code.
//
// Mirrors the 6 personas from src/data/roles.json (name + capabilities) so
// User Management is a complete, self-contained roster — Roles itself is no
// longer surfaced as its own Configuration Studio page.
// ============================================================
const USER_SEED_TIMESTAMP = "2026-02-01T09:00:00.000Z";

export const DEFAULT_USERS: AppUser[] = [
  {
    id: "usr-kavita-rao",
    name: "Kavita Rao",
    email: "kavita.rao@example.com",
    role: "Credit/Risk Manager",
    department: "Credit Risk",
    status: "Active",
    permissions: ["rule.view", "rule.create", "rule.edit", "rule.simulate", "rule.publish"],
    approvalCategories: ["Eligibility"],
    createdAt: USER_SEED_TIMESTAMP,
    updatedAt: USER_SEED_TIMESTAMP,
  },
  {
    id: "usr-arjun-nair",
    name: "Arjun Nair",
    email: "arjun.nair@example.com",
    role: "Underwriter/Claims",
    department: "Underwriting & Claims",
    status: "Active",
    permissions: ["rule.view", "rule.create", "rule.edit", "rule.simulate", "rule.publish"],
    approvalCategories: ["Risk & Fraud", "Collateral"],
    createdAt: USER_SEED_TIMESTAMP,
    updatedAt: USER_SEED_TIMESTAMP,
  },
  {
    id: "usr-rohan-mehta",
    name: "Rohan Mehta",
    email: "rohan.mehta@example.com",
    role: "Product Manager",
    department: "Product Strategy",
    status: "Active",
    permissions: ["rule.view", "rule.create", "rule.edit", "rule.simulate", "rule.publish", "config.manage"],
    approvalCategories: ["Pricing"],
    createdAt: USER_SEED_TIMESTAMP,
    updatedAt: USER_SEED_TIMESTAMP,
  },
  {
    id: "usr-ananya-verma",
    name: "Ananya Verma",
    email: "ananya.verma@example.com",
    role: "Business Analyst",
    department: "Business Analysis",
    status: "Active",
    permissions: ["rule.view", "rule.create", "rule.edit", "rule.simulate"],
    approvalCategories: [],
    createdAt: USER_SEED_TIMESTAMP,
    updatedAt: USER_SEED_TIMESTAMP,
  },
  {
    id: "usr-divya-iyer",
    name: "Divya Iyer",
    email: "divya.iyer@example.com",
    role: "Operations",
    department: "Operations",
    status: "Active",
    permissions: ["rule.view", "rule.simulate"],
    approvalCategories: [],
    createdAt: USER_SEED_TIMESTAMP,
    updatedAt: USER_SEED_TIMESTAMP,
  },
  {
    id: "usr-vikram-chawla",
    name: "Vikram Chawla",
    email: "vikram.chawla@example.com",
    role: "System Administrator",
    department: "IT / System Administration",
    status: "Active",
    permissions: ["rule.view", "rule.create", "rule.edit", "rule.delete", "rule.simulate", "rule.publish", "system.manage", "config.manage"],
    approvalCategories: [],
    createdAt: USER_SEED_TIMESTAMP,
    updatedAt: USER_SEED_TIMESTAMP,
  },
];

// ============================================================
// RULE TEMPLATES — generic, industry-agnostic starting shapes. Instantiating
// one just pre-fills the Rule Builder; the result is a normal editable rule.
// ============================================================
export const DEFAULT_RULE_TEMPLATES: RuleTemplate[] = [
  // Generic, industry-agnostic skeletons — blank field slots are intentional
  // since these apply across every domain; pick a field after inserting.
  {
    id: "tmpl-threshold-check",
    name: "Threshold Check",
    description: "Reject when a numeric field breaches a configured minimum or maximum.",
    categoryId: "eligibility",
    rootGroup: group("AND", [cond("", "<", "")]),
    actions: [{ id: cid(), type: "Reject", reasonCode: "THRESHOLD_BREACH", message: "Value did not meet the configured threshold." }],
  },
  {
    id: "tmpl-eligibility-gate",
    name: "Eligibility Gate",
    description: "Require two conditions to both hold before allowing the case to proceed.",
    categoryId: "eligibility",
    rootGroup: group("AND", [cond("", "=", ""), cond("", "=", "")]),
    actions: [{ id: cid(), type: "Approve", reasonCode: "ELIGIBLE_CUSTOMER", message: "All eligibility conditions satisfied." }],
  },
  {
    id: "tmpl-review-flag",
    name: "Manual Review Flag",
    description: "Route a case to manual review when a risk condition is met, without an automatic reject.",
    categoryId: "risk-fraud",
    rootGroup: group("AND", [cond("", ">", "")]),
    actions: [{ id: cid(), type: "Show Message", reasonCode: "MANUAL_REVIEW", message: "This case has been flagged for manual review." }],
  },
  {
    id: "tmpl-value-assignment",
    name: "Value Assignment",
    description: "Assign or calculate an output value onto the case when a condition is met.",
    categoryId: "pricing",
    rootGroup: group("AND", [cond("", "=", "")]),
    actions: [{ id: cid(), type: "Assign Value", outputField: "", outputValue: "" }],
  },

  // Domain-scoped examples — real field references, so they're usable
  // as-is (adjust the threshold/value) instead of just a bare shape.
  {
    id: "tmpl-lending-high-dti-reject",
    name: "High DTI Reject",
    description: "Decline lending applications whose debt-to-income ratio exceeds a safe threshold.",
    domain: "Lending",
    categoryId: "underwriting",
    rootGroup: group("AND", [cond("dti_ratio", ">", "50")]),
    actions: [{ id: cid(), type: "Reject", reasonCode: "DTI_EXCEEDED", message: "Debt-to-income ratio exceeds the acceptable limit." }],
  },
  {
    id: "tmpl-insurance-smoker-loading",
    name: "Smoker Premium Loading",
    description: "Apply an extra premium loading percentage when the applicant is a declared smoker.",
    domain: "Insurance",
    categoryId: "pricing",
    rootGroup: group("AND", [cond("smoker", "=", "true")]),
    actions: [{ id: cid(), type: "Assign Value", outputField: "premium_loading_pct", outputValue: "15", outputType: "number" }],
  },
  {
    id: "tmpl-nbfc-ltv-cap",
    name: "LTV Cap Check",
    description: "Reject gold/asset-backed loan requests whose requested LTV breaches the collateral policy cap.",
    domain: "NBFC",
    categoryId: "collateral",
    rootGroup: group("AND", [cond("ltv_requested", ">", "75")]),
    actions: [{ id: cid(), type: "Reject", reasonCode: "LTV_CAP_BREACH", message: "Requested LTV exceeds the collateral policy cap." }],
  },
];

// ============================================================
// NOTIFYX — trigger -> condition -> action workflow automation (config-only
// prototype, no execution engine — runCount/logs are seed data, same as
// every other seeded rollup in this file). Categories/Triggers are
// configurable registries; see src/lib/notify-vocabulary.ts for the small
// fixed vocabularies (action types/operators/delays).
// ============================================================
let notifyStepCounter = 0;
const nsid = () => `NS-${(++notifyStepCounter).toString().padStart(4, "0")}`;

export const DEFAULT_NOTIFY_CATEGORIES: NotifyCategory[] = [
  { id: "cat-rule-governance", name: "Rule Governance", colorToken: "blue" },
  { id: "cat-product-lifecycle", name: "Product Lifecycle", colorToken: "emerald" },
  { id: "cat-simulation", name: "Simulation & Testing", colorToken: "violet" },
  { id: "cat-compliance", name: "Compliance & Audit", colorToken: "red" },
  { id: "cat-system-access", name: "System & Access", colorToken: "slate" },
];

export const DEFAULT_NOTIFY_TRIGGERS: NotifyTrigger[] = [
  { id: "trg-rule-submitted", label: "Rule Submitted for Review", categoryId: "cat-rule-governance" },
  { id: "trg-rule-approved", label: "Rule Approved & Published", categoryId: "cat-rule-governance" },
  { id: "trg-rule-sent-back", label: "Rule Sent Back to Draft", categoryId: "cat-rule-governance" },
  { id: "trg-product-published", label: "Product Published", categoryId: "cat-product-lifecycle" },
  { id: "trg-product-created", label: "Product Created", categoryId: "cat-product-lifecycle" },
  { id: "trg-sim-rejected", label: "Simulation Rejected Outcome", categoryId: "cat-simulation" },
  { id: "trg-sim-review", label: "Simulation Review-Required Outcome", categoryId: "cat-simulation" },
  { id: "trg-sandbox-run", label: "Sandbox Test Run", categoryId: "cat-simulation" },
  { id: "trg-audit-chain-failed", label: "Audit Chain Verification Failed", categoryId: "cat-compliance" },
  { id: "trg-rule-conflict", label: "Rule Conflict Detected", categoryId: "cat-compliance" },
  { id: "trg-role-created", label: "New Role Created", categoryId: "cat-system-access" },
];

function nlog(description: string, result: NotifyExecutionLog["result"], daysBack: number): NotifyExecutionLog {
  return { id: nsid(), timestamp: daysAgo(daysBack), description, result };
}

export const DEFAULT_NOTIFY_WORKFLOWS: NotifyWorkflow[] = [
  {
    id: "wf-rule-review-reminder",
    name: "Rule Review Reminder",
    categoryId: "cat-rule-governance",
    triggerId: "trg-rule-submitted",
    status: "Active",
    steps: [
      { id: nsid(), kind: "wait", duration: "24 hours" },
      { id: nsid(), kind: "condition", field: "Rule Status", operator: "is", value: "Testing" },
      { id: nsid(), kind: "action", actionType: "Notify Stakeholders", recipient: "Credit/Risk Manager", message: "This rule has been awaiting review for over 24 hours." },
    ],
    createdAt: daysAgo(90),
    updatedAt: daysAgo(2),
    createdBy: "Vikram Chawla",
    runCount: 14,
    logs: [
      nlog("Notified Credit/Risk Manager — RL-303 still in Testing after 24h", "Success", 0.6),
      nlog("Notified Credit/Risk Manager — RL-108 still in Testing after 24h", "Success", 5),
      nlog("Skipped — RL-206 approved before the 24h wait elapsed", "Skipped", 9),
    ],
  },
  {
    id: "wf-rule-rejection-escalation",
    name: "Rule Rejection Escalation",
    categoryId: "cat-rule-governance",
    triggerId: "trg-rule-sent-back",
    status: "Active",
    steps: [
      { id: nsid(), kind: "condition", field: "Priority", operator: "is", value: "1" },
      { id: nsid(), kind: "action", actionType: "Create Escalation", recipient: "System Administrator", message: "Critical-priority rule was sent back to Draft — needs attention." },
    ],
    createdAt: daysAgo(60),
    updatedAt: daysAgo(12),
    createdBy: "Rohan Mehta",
    runCount: 3,
    logs: [
      nlog("Escalated RL-109 rejection to System Administrator", "Success", 12),
      nlog("Escalated RL-303 rejection to System Administrator", "Success", 40),
    ],
  },
  {
    id: "wf-product-publish-broadcast",
    name: "Product Publish Broadcast",
    categoryId: "cat-product-lifecycle",
    triggerId: "trg-product-published",
    status: "Active",
    steps: [
      { id: nsid(), kind: "action", actionType: "Send Email", recipient: "All Stakeholders", message: "A product has just been published and is now live via the API." },
      { id: nsid(), kind: "action", actionType: "Send In-App Notification", recipient: "Product Manager", message: "Review the published product's API Information tab." },
    ],
    createdAt: daysAgo(75),
    updatedAt: daysAgo(1),
    createdBy: "Rohan Mehta",
    runCount: 22,
    logs: [
      nlog("Broadcast sent for Home Loan publish", "Success", 1),
      nlog("Broadcast sent for Term Life Cover publish", "Success", 20),
      nlog("Email delivery failed — distribution list unreachable", "Failed", 33),
    ],
  },
  {
    id: "wf-new-product-setup-reminder",
    name: "New Product Setup Reminder",
    categoryId: "cat-product-lifecycle",
    triggerId: "trg-product-created",
    status: "Draft",
    steps: [
      { id: nsid(), kind: "wait", duration: "3 days" },
      { id: nsid(), kind: "condition", field: "Mapped Rules", operator: "is", value: "0" },
      { id: nsid(), kind: "action", actionType: "Create Follow-up Task", recipient: "Product Manager", message: "This product still has no rules mapped 3 days after creation." },
    ],
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
    createdBy: "Rohan Mehta",
    runCount: 0,
    logs: [],
  },
  {
    id: "wf-simulation-rejection-followup",
    name: "Simulation Rejection Follow-up",
    categoryId: "cat-simulation",
    triggerId: "trg-sim-rejected",
    status: "Paused",
    steps: [
      { id: nsid(), kind: "action", actionType: "Notify Stakeholders", recipient: "Underwriter/Claims", message: "A simulation returned a Rejected outcome for review." },
      { id: nsid(), kind: "wait", duration: "24 hours" },
      { id: nsid(), kind: "action", actionType: "Create Follow-up Task", recipient: "Underwriter/Claims", message: "Follow up on the rejected simulation if unactioned." },
    ],
    createdAt: daysAgo(45),
    updatedAt: daysAgo(15),
    createdBy: "Kavita Rao",
    runCount: 2,
    logs: [
      nlog("Notified Underwriter/Claims of Rejected outcome", "Success", 16),
      nlog("Notified Underwriter/Claims of Rejected outcome", "Success", 38),
    ],
  },
  {
    id: "wf-sandbox-test-digest",
    name: "Sandbox Test Digest",
    categoryId: "cat-simulation",
    triggerId: "trg-sandbox-run",
    status: "Draft",
    steps: [{ id: nsid(), kind: "action", actionType: "Send In-App Notification", recipient: "Business Analyst", message: "A sandbox test was run against a pending rule." }],
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
    createdBy: "Ananya Verma",
    runCount: 0,
    logs: [],
  },
  {
    id: "wf-compliance-audit-alert",
    name: "Compliance Audit Alert",
    categoryId: "cat-compliance",
    triggerId: "trg-audit-chain-failed",
    status: "Active",
    steps: [
      { id: nsid(), kind: "action", actionType: "Create Escalation", recipient: "System Administrator", message: "Audit chain integrity check failed — investigate immediately." },
      { id: nsid(), kind: "action", actionType: "Send Email", recipient: "System Administrator" },
    ],
    createdAt: daysAgo(70),
    updatedAt: daysAgo(25),
    createdBy: "Vikram Chawla",
    runCount: 3,
    logs: [
      nlog("Escalated audit chain verification failure", "Success", 25),
      nlog("Escalated audit chain verification failure", "Success", 55),
    ],
  },
  {
    id: "wf-new-role-provisioning-notice",
    name: "New Role Provisioning Notice",
    categoryId: "cat-system-access",
    triggerId: "trg-role-created",
    status: "Paused",
    steps: [{ id: nsid(), kind: "action", actionType: "Send In-App Notification", recipient: "All Stakeholders", message: "A new role has been provisioned in Configuration Studio." }],
    createdAt: daysAgo(30),
    updatedAt: daysAgo(18),
    createdBy: "Vikram Chawla",
    runCount: 2,
    logs: [
      nlog("Notified all stakeholders of new role \"Operations\"", "Success", 18),
      nlog("Notified all stakeholders of new role \"Underwriter/Claims\"", "Success", 28),
    ],
  },
];

export const DEFAULT_NOTIFY_WORKFLOW_TEMPLATES: NotifyWorkflowTemplate[] = [
  {
    id: "tmpl-notify-rule-approval-reminder",
    name: "Rule Approval Reminder",
    categoryId: "cat-rule-governance",
    triggerId: "trg-rule-submitted",
    steps: [
      { id: nsid(), kind: "wait", duration: "24 hours" },
      { id: nsid(), kind: "condition", field: "Rule Status", operator: "is", value: "Testing" },
      { id: nsid(), kind: "action", actionType: "Notify Stakeholders", recipient: "Credit/Risk Manager", message: "Reminder: this rule is still awaiting review." },
    ],
  },
  {
    id: "tmpl-notify-sla-breach-escalation",
    name: "SLA Breach Escalation",
    categoryId: "cat-compliance",
    triggerId: "trg-audit-chain-failed",
    steps: [
      { id: nsid(), kind: "action", actionType: "Notify Stakeholders", recipient: "System Administrator", message: "An SLA-relevant compliance event occurred." },
      { id: nsid(), kind: "wait", duration: "24 hours before SLA breach" },
      { id: nsid(), kind: "action", actionType: "Create Escalation", recipient: "System Administrator", message: "SLA is about to breach — escalating." },
    ],
  },
  {
    id: "tmpl-notify-product-publish-broadcast",
    name: "Product Publish Broadcast",
    categoryId: "cat-product-lifecycle",
    triggerId: "trg-product-published",
    steps: [
      { id: nsid(), kind: "action", actionType: "Send Email", recipient: "All Stakeholders", message: "A product has just been published." },
      { id: nsid(), kind: "action", actionType: "Send In-App Notification", recipient: "Product Manager" },
    ],
  },
  {
    id: "tmpl-notify-simulation-failure-followup",
    name: "Simulation Failure Follow-up",
    categoryId: "cat-simulation",
    triggerId: "trg-sim-rejected",
    steps: [
      { id: nsid(), kind: "action", actionType: "Notify Stakeholders", recipient: "Underwriter/Claims", message: "A simulation returned a Rejected outcome." },
      { id: nsid(), kind: "wait", duration: "24 hours" },
      { id: nsid(), kind: "action", actionType: "Create Follow-up Task", recipient: "Underwriter/Claims", message: "Follow up if this case is still unresolved." },
    ],
  },
];
