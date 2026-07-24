import { Entity } from "./types";

// Seed data only — entities are configurable at runtime via the Configuration
// Studio (/settings). The Field Catalog's "Entity" dropdown references these.
export const DEFAULT_ENTITIES: Entity[] = [
  { id: "applicant", name: "Applicant", description: "The individual or business applying for a product — shared across every domain." },
  { id: "loan-account", name: "Loan Account", description: "The credit facility being originated or serviced.", industry: "Lending" },
  { id: "policy", name: "Policy", description: "An insurance policy under evaluation.", industry: "Insurance" },
  { id: "collateral", name: "Collateral", description: "Pledged gold, property or other secured asset.", industry: "NBFC" },
  { id: "credit-card-account", name: "Credit Card Account", description: "The credit card product being applied for or serviced.", industry: "CreditCards" },
  { id: "investment-account", name: "Investment Account", description: "The investment portfolio or account under advisory.", industry: "Wealth" },
];
