import { BusinessField, Domain, Operator } from "./types";

export const BUSINESS_FIELDS: BusinessField[] = [
  // Common
  { key: "applicant_age", label: "Applicant Age", domain: "Common", type: "number", unit: "years" },
  { key: "gender", label: "Gender", domain: "Common", type: "enum", options: ["Male", "Female", "Other"] },
  { key: "city", label: "Current City", domain: "Common", type: "enum", options: ["Mumbai", "Delhi", "Bengaluru", "Chennai", "Pune", "Other"] },
  { key: "segment", label: "Segment Tier", domain: "Common", type: "enum", options: ["Mass", "Affluent", "Premium"] },

  // Lending
  { key: "credit_score", label: "Bureau Credit Score", domain: "Lending", type: "number" },
  { key: "monthly_income", label: "Monthly Income", domain: "Lending", type: "currency", unit: "₹" },
  { key: "monthly_liabilities", label: "Monthly Liabilities", domain: "Lending", type: "currency", unit: "₹" },
  { key: "loan_amount", label: "Loan Amount Requested", domain: "Lending", type: "currency", unit: "₹" },
  { key: "loan_type", label: "Loan Type", domain: "Lending", type: "enum", options: ["Personal Loan", "Home Loan", "Vehicle Loan", "Business Loan"] },
  { key: "dti_ratio", label: "Debt-to-Income Ratio", domain: "Lending", type: "number", unit: "%" },
  { key: "employment_type", label: "Employment Type", domain: "Lending", type: "enum", options: ["Salaried", "Self-Employed", "Business Owner"] },

  // Insurance
  { key: "smoker", label: "Smoker Status", domain: "Insurance", type: "boolean" },
  { key: "occupation_type", label: "Occupation Risk Tier", domain: "Insurance", type: "enum", options: ["Low Risk", "Medium Risk", "High Risk"] },
  { key: "bmi", label: "BMI Metric", domain: "Insurance", type: "number" },
  { key: "sum_assured", label: "Sum Assured Capital", domain: "Insurance", type: "currency", unit: "₹" },
  { key: "base_premium", label: "Base Premium", domain: "Insurance", type: "currency", unit: "₹" },
  { key: "medical_history", label: "Medical History Flag", domain: "Insurance", type: "boolean" },

  // NBFC / Gold Loan
  { key: "collateral_type", label: "Collateral Asset Type", domain: "NBFC", type: "enum", options: ["Gold", "Vehicle", "Property", "Securities"] },
  { key: "appraised_value", label: "Appraised Asset Value", domain: "NBFC", type: "currency", unit: "₹" },
  { key: "purity_grade", label: "Purity / Grade %", domain: "NBFC", type: "number", unit: "%" },
  { key: "ltv_requested", label: "LTV Requested", domain: "NBFC", type: "number", unit: "%" },
];

export const OPERATORS: { value: Operator; label: string; types: string[] }[] = [
  { value: "=", label: "Equal to", types: ["number", "string", "boolean", "enum", "currency"] },
  { value: "!=", label: "Not equal to", types: ["number", "string", "boolean", "enum", "currency"] },
  { value: ">", label: "Greater than", types: ["number", "currency"] },
  { value: "<", label: "Less than", types: ["number", "currency"] },
  { value: ">=", label: "Greater or equal", types: ["number", "currency"] },
  { value: "<=", label: "Less or equal", types: ["number", "currency"] },
  { value: "contains", label: "Contains", types: ["string"] },
  { value: "starts_with", label: "Starts with", types: ["string"] },
  { value: "in", label: "In (list)", types: ["enum", "string"] },
  { value: "between", label: "Between", types: ["number", "currency"] },
];

export function fieldsForDomain(domain: Domain): BusinessField[] {
  return BUSINESS_FIELDS.filter((f) => f.domain === domain || f.domain === "Common");
}

export function getField(key: string): BusinessField | undefined {
  return BUSINESS_FIELDS.find((f) => f.key === key);
}

export const CATEGORIES = [
  "Eligibility",
  "Pricing",
  "Underwriting",
  "Risk & Fraud",
  "Compliance",
  "Collateral",
  "Claims",
] as const;

export const OWNERS = [
  "Credit Risk Division",
  "Actuarial Underwriting",
  "Asset Management Group",
  "Claims Governance Board",
  "Product Strategy Team",
  "Compliance Office",
];
