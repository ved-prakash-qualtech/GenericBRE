"use client";

import { Package, Settings2, PlayCircle } from "lucide-react";
import { Product, Industry, BusinessRule, ProductRuleMapping, SimulationResult } from "@/lib/types";
import { getMappedRules } from "@/lib/product-rule-engine";
import { iconForIndustry } from "@/lib/industries";
import { OutcomeBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The Product-centric card grid — shared by the Dashboard's pinned Product
// section and the standalone /products Hub page, so both stay in sync as a
// single source of truth (see ProductKpiCards in simulator/, which this
// supersedes for anywhere a full card with actions is needed rather than a
// plain select-target).
export function ProductHubGrid({
  products,
  industries,
  rules,
  mappings,
  simulations,
  onConfigure,
  onRunSimulation,
}: {
  products: Product[];
  industries: Industry[];
  rules: BusinessRule[];
  mappings: ProductRuleMapping[];
  simulations: SimulationResult[];
  onConfigure: (product: Product) => void;
  onRunSimulation: (product: Product) => void;
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
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {active.map((p) => {
        const industry = industries.find((i) => i.id === p.domain);
        const Icon = iconForIndustry(industry?.icon) ?? Package;
        const mappedRules = getMappedRules(p.id, rules, mappings);
        const mappedCount = mappedRules.length;
        const lastSim = simulations.find((s) => s.productId === p.id);
        const published = p.publishStatus === "Published";

        // Priority mix (P1..P5) among this product's mapped rules — drives the
        // sparkline. Real derived data, not decorative filler.
        const priorityCounts = [1, 2, 3, 4, 5].map((pr) => mappedRules.filter((r) => r.priority === pr).length);
        const maxPriorityCount = Math.max(1, ...priorityCounts);

        // Status mix among mapped rules — drives the small heatmap row.
        const statusMix: { status: BusinessRule["status"]; color: string }[] = [
          { status: "Active", color: "bg-emerald-500" },
          { status: "Draft", color: "bg-amber-500" },
          { status: "Testing", color: "bg-sky-500" },
          { status: "Inactive", color: "bg-muted-foreground/40" },
          { status: "Archived", color: "bg-muted-foreground/20" },
        ];
        const statusDots = statusMix.flatMap(({ status, color }) =>
          Array.from({ length: Math.min(4, mappedRules.filter((r) => r.status === status).length) }, (_, i) => (
            <span key={`${status}-${i}`} className={cn("size-1.5 rounded-full", color)} />
          ))
        );

        return (
          <div
            key={p.id}
            role="button"
            tabIndex={0}
            onClick={() => onConfigure(p)}
            onKeyDown={(e) => e.key === "Enter" && onConfigure(p)}
            className="flex cursor-pointer flex-col gap-1.5 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" />
              </span>
              <div className="flex h-6 items-end gap-0.5" title="Mapped rules by priority (P1–P5)">
                {priorityCounts.map((c, i) => (
                  <span
                    key={i}
                    className={cn("w-1 rounded-sm", c > 0 ? "bg-primary/60" : "bg-muted")}
                    style={{ height: `${Math.max(15, (c / maxPriorityCount) * 100)}%` }}
                  />
                ))}
              </div>
              <Badge variant={published ? "default" : "secondary"} className="shrink-0 text-[9px]">
                {p.publishStatus ?? "Draft"}
              </Badge>
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{p.name}</p>
              <p className="truncate font-mono text-[10px] text-muted-foreground">{p.code}</p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground">{mappedCount}</span> mapped rule{mappedCount === 1 ? "" : "s"}
              </span>
              {lastSim && <OutcomeBadge outcome={lastSim.outcome} className="px-1.5 py-0 text-[9px]" />}
            </div>

            {statusDots.length > 0 && (
              <div className="flex items-center gap-1" title="Mapped rule status mix">
                {statusDots}
              </div>
            )}

            <p className="text-[10px] text-muted-foreground/70">
              {published && p.lastPublishedAt
                ? `Published ${new Date(p.lastPublishedAt).toLocaleDateString()}`
                : `Last updated ${new Date(p.updatedAt).toLocaleDateString()}`}
            </p>

            <div className="grid grid-cols-2 gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-[11px]"
                onClick={() => onConfigure(p)}
              >
                <Settings2 className="size-3" /> Configure
              </Button>
              <Button
                size="sm"
                className="h-7 gap-1 text-[11px]"
                onClick={() => onRunSimulation(p)}
              >
                <PlayCircle className="size-3" /> Simulate
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
