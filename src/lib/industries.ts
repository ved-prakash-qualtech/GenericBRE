import {
  CreditCard,
  Landmark,
  ShieldPlus,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { Industry } from "./types";

// Seed data only — industries are configurable at runtime via the
// Configuration Studio (/settings). Nothing downstream should assume these
// three are the only values; they exist purely as demo content.
export const DEFAULT_INDUSTRIES: Industry[] = [
  {
    id: "Lending",
    name: "Lending",
    icon: "CreditCard",
    description: "Bureau score, income & DTI checks with instant interest rate pricing.",
  },
  {
    id: "Insurance",
    name: "Insurance",
    icon: "ShieldPlus",
    description: "Age & smoker-based underwriting with automatic risk loading.",
  },
  {
    id: "NBFC",
    name: "NBFC / Gold Loan",
    icon: "Landmark",
    description: "Collateral valuation, purity checks & LTV-based haircut calculation.",
  },
];

const ICON_MAP: Record<string, LucideIcon> = {
  CreditCard,
  Landmark,
  ShieldPlus,
  Building2,
};

export function iconForIndustry(iconName: string | undefined): LucideIcon {
  return (iconName && ICON_MAP[iconName]) || Building2;
}

export const INDUSTRY_ICON_OPTIONS = Object.keys(ICON_MAP);

const CHART_COLOR_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function colorForIndustry(industries: Industry[], industryId: string): string {
  const index = industries.findIndex((i) => i.id === industryId);
  return CHART_COLOR_PALETTE[(index < 0 ? 0 : index) % CHART_COLOR_PALETTE.length];
}
