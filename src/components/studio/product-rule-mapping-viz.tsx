"use client";

import { useMemo } from "react";
import { Product, BusinessRule, ProductRuleMapping } from "@/lib/types";
import { getMappedRules } from "@/lib/product-rule-engine";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Network } from "lucide-react";

export function ProductRuleCoverageChart({
  products,
  rules,
  mappings,
}: {
  products: Product[];
  rules: BusinessRule[];
  mappings: ProductRuleMapping[];
}) {
  const coverage = useMemo(() => {
    return products.map((p) => ({
      name: p.name,
      count: getMappedRules(p.id, rules, mappings).length,
      id: p.id,
    }));
  }, [products, rules, mappings]);

  const maxCount = Math.max(...coverage.map((c) => c.count), 1);

  return (
    <div className="rounded-lg border bg-white p-4 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="size-4 text-primary" />
        <h3 className="text-sm font-semibold text-gray-900">Product Coverage</h3>
        <span className="text-xs text-gray-500 ml-auto">{products.length} products</span>
      </div>

      <div className="space-y-3">
        {coverage.map((item) => (
          <div key={item.id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-900 truncate">{item.name}</span>
              <Badge variant="outline" className="text-[10px]">
                {item.count} rule{item.count !== 1 ? "s" : ""}
              </Badge>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductRuleNetworkDiagram({
  products,
  rules,
  mappings,
}: {
  products: Product[];
  rules: BusinessRule[];
  mappings: ProductRuleMapping[];
}) {
  const data = useMemo(() => {
    const productMap = new Map(products.map((p) => [p.id, p.name]));
    const categoryMap = new Map<string, number>();

    mappings.forEach((m) => {
      const rule = rules.find((r) => r.id === m.ruleId);
      if (rule?.category) {
        categoryMap.set(rule.category, (categoryMap.get(rule.category) || 0) + 1);
      }
    });

    return Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [products, rules, mappings]);

  const maxCount = Math.max(...data.map((d) => d[1]), 1);

  return (
    <div className="rounded-lg border bg-white p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Network className="size-4 text-primary" />
        <h3 className="text-sm font-semibold text-gray-900">Rule Categories</h3>
        <span className="text-xs text-gray-500 ml-auto">{data.length} active</span>
      </div>

      <div className="space-y-2.5">
        {data.map(([category, count]) => (
          <div key={category} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-900 capitalize">{category}</span>
              <span className="text-gray-500">{count}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
