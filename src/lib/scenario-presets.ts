export type PresetKey = "happy" | "reject" | "review";

// Seed content only, keyed by Industry.id. Industries added at runtime via the
// Configuration Studio simply have no presets — the Simulator falls back to
// its full field catalog and a blank form (see scenario-presets lookups using
// `?.` below and in the Simulator page).
export const SCENARIO_PRESETS: Record<string, Record<PresetKey, Record<string, string | number | boolean>>> = {
  Lending: {
    happy: {
      applicant_age: 30,
      credit_score: 740,
      monthly_income: 80000,
      monthly_liabilities: 20000,
      loan_amount: 1000000,
      loan_type: "Personal Loan",
      employment_type: "Salaried",
      city: "Mumbai",
    },
    reject: {
      applicant_age: 28,
      credit_score: 612,
      monthly_income: 50000,
      monthly_liabilities: 10000,
      loan_amount: 500000,
      loan_type: "Personal Loan",
      employment_type: "Salaried",
      city: "Pune",
    },
    review: {
      applicant_age: 34,
      credit_score: 710,
      monthly_income: 200000,
      monthly_liabilities: 40000,
      loan_amount: 6000000,
      loan_type: "Home Loan",
      employment_type: "Salaried",
      city: "Bengaluru",
    },
  },
  NBFC: {
    happy: {
      collateral_type: "Gold",
      appraised_value: 500000,
      purity_grade: 91,
      ltv_requested: 70,
    },
    reject: {
      collateral_type: "Gold",
      appraised_value: 200000,
      purity_grade: 60,
      ltv_requested: 65,
    },
    review: {
      collateral_type: "Gold",
      appraised_value: 450000,
      purity_grade: 88,
      ltv_requested: 85,
    },
  },
  Insurance: {
    happy: {
      applicant_age: 28,
      smoker: false,
      occupation_type: "Low Risk",
      bmi: 23,
      medical_history: false,
      sum_assured: 1000000,
    },
    reject: {
      applicant_age: 15,
      smoker: false,
      occupation_type: "Low Risk",
      bmi: 21,
      medical_history: false,
      sum_assured: 500000,
    },
    review: {
      applicant_age: 70,
      smoker: true,
      occupation_type: "Medium Risk",
      bmi: 27,
      medical_history: false,
      sum_assured: 2000000,
    },
  },
};
