import { RequestParameterDef, RuleExecutionMapping } from "./types";

// Seed data only — fully editable at runtime via Configuration Studio →
// Execution Manager → Request Parameters. Industry is deliberately not
// listed here — it already has its own catalog (industries.ts) and is
// always available as a mapping condition.
export const DEFAULT_REQUEST_PARAMETER_DEFS: RequestParameterDef[] = [
  { id: "product", label: "Product", sourceKey: "product", builtIn: true },
  { id: "subProduct", label: "Sub Product", sourceKey: "subProduct", builtIn: true },
  { id: "customerType", label: "Customer Type", sourceKey: "customerType", builtIn: true },
  { id: "channel", label: "Channel", sourceKey: "channel", builtIn: true },
  { id: "region", label: "Region", sourceKey: "region", builtIn: true },
];

// Most-specific-match wins: a mapping's `conditions` must all match the
// given params (a mapping with fewer conditions is more general and only
// wins if nothing more specific also matches). Returns null when nothing
// matches — callers fall back to the plain, single-industry runSimulation.
export function resolveMapping(
  mappings: RuleExecutionMapping[],
  params: Record<string, string>
): RuleExecutionMapping | null {
  const candidates = mappings.filter((m) =>
    Object.entries(m.conditions).every(([key, value]) => value === "" || params[key] === value)
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((best, m) => {
    const bestSpecificity = Object.values(best.conditions).filter(Boolean).length;
    const mSpecificity = Object.values(m.conditions).filter(Boolean).length;
    if (mSpecificity !== bestSpecificity) return mSpecificity > bestSpecificity ? m : best;
    return new Date(m.updatedAt) > new Date(best.updatedAt) ? m : best;
  });
}
