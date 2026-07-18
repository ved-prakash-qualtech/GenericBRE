import { ALL_RULES, DEFAULT_PRODUCTS, DEFAULT_PRODUCT_RULE_MAPPINGS } from "./lib/mock-data";
import { executeRulesByProduct } from "./lib/product-rule-engine";
import { DEFAULT_FIELD_CATALOG } from "./lib/fields";

const product = DEFAULT_PRODUCTS.find(p => p.id === "prod-gold-loan");
const input = {
  collateral_type: "Gold",
  appraised_value: 100000,
  ltv_requested: 70,
  purity_grade: 22
};

const result = executeRulesByProduct(product, ALL_RULES, DEFAULT_PRODUCT_RULE_MAPPINGS, input, DEFAULT_FIELD_CATALOG);
console.log("Result:", JSON.stringify(result, null, 2));
