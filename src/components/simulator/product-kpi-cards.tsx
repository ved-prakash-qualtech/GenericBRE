"use client";

import { Package } from "lucide-react";
import { Product, Industry, BusinessRule, ProductRuleMapping } from "@/lib/types";
import { getMappedRules } from "@/lib/product-rule-engine";
import { iconForIndustry } from "@/lib/industries";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Product selection as clickable KPI cards — replaces the old dropdown.
// Only Active products are shown (Inactive ones aren't valid simulation
// targets); clicking a card loads that product into the simulator, same as
// the dropdown's onValueChange used to.
export function ProductKpiCards({
  products,
  industries,
  rules,
  mappings,
  selectedProductId,
  onSelect,
}: {
  products: Product[];
  industries: Industry[];
  rules: BusinessRule[];
  mappings: ProductRuleMapping[];
  selectedProductId: string | undefined;
  onSelect: (product: Product) => void;
}) {
  const active = products.filter((p) => p.status === "Active");

  if (active.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
        No active products yet — add one in Configuration Studio → Product Master.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {active.map((p) => {
        const industry = industries.find((i) => i.id === p.domain);
        const Icon = iconForIndustry(industry?.icon) ?? Package;
        const mappedCount = getMappedRules(p.id, rules, mappings).length;
        const selected = p.id === selectedProductId;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className={cn(
              "flex flex-col gap-2 rounded-xl border bg-card p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/40",
              selected && "border-primary bg-primary/5 ring-1 ring-primary/30"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary")}>
                <Icon className="size-4.5" />
              </span>
              <Badge variant="default" className="shrink-0 text-[9px]">{p.status}</Badge>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{p.name}</p>
              <p className="truncate font-mono text-[10px] text-muted-foreground">{p.code}</p>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground">{mappedCount}</span> mapped rule{mappedCount === 1 ? "" : "s"}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground/70">
              Last updated {new Date(p.updatedAt).toLocaleDateString()}
            </p>
          </button>
        );
      })}
    </div>
  );
}
