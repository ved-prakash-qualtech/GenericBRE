"use client";

import { useMemo, useState } from "react";
import { Package, Settings2, PlayCircle, Search, Download } from "lucide-react";
import { Product, Industry, BusinessRule, ProductRuleMapping, SimulationResult } from "@/lib/types";
import { getMappedRules } from "@/lib/product-rule-engine";
import { iconForIndustry } from "@/lib/industries";
import { downloadCsv } from "@/lib/csv";
import { OutcomeBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { cn } from "@/lib/utils";

// The Product-centric card grid — shared by the Dashboard's pinned Product
// section and the standalone /products Hub page, so both stay in sync as a
// single source of truth (see ProductKpiCards in simulator/, which this
// supersedes for anywhere a full card with actions is needed rather than a
// plain select-target). `showControls` opts in the search/filter/CSV bar —
// on for the full Hub page, off for the Dashboard's compact preview panel.
export function ProductHubGrid({
  products,
  industries,
  rules,
  mappings,
  simulations,
  onConfigure,
  onRunSimulation,
  showControls,
}: {
  products: Product[];
  industries: Industry[];
  rules: BusinessRule[];
  mappings: ProductRuleMapping[];
  simulations: SimulationResult[];
  onConfigure: (product: Product) => void;
  onRunSimulation: (product: Product) => void;
  showControls?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState<string[]>([]);
  // Status defaults to Active-only (unchanged behavior), but — unlike the old
  // hard filter — showControls lets a user opt into seeing Inactive products
  // too, since they otherwise become permanently invisible clutter with no
  // way back for roles that can't reach Product Master (audit finding B20).
  const [statusFilter, setStatusFilter] = useState<string[]>(["Active"]);

  const base = showControls ? products : products.filter((p) => p.status === "Active");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return base.filter((p) => {
      if (showControls && statusFilter.length > 0 && !statusFilter.includes(p.status)) return false;
      if (domainFilter.length > 0 && !domainFilter.includes(p.domain)) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [base, search, domainFilter, statusFilter, showControls]);

  const exportCsv = () => {
    downloadCsv(
      "products",
      filtered.map((p) => ({
        Name: p.name,
        Code: p.code,
        Domain: industries.find((i) => i.id === p.domain)?.name ?? p.domain,
        "Publish Status": p.publishStatus ?? "Draft",
        "Mapped Rules": getMappedRules(p.id, rules, mappings).length,
      }))
    );
  };

  if (base.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
        No active products yet — add one in Configuration Studio → Product Master.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {showControls && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or code..."
              className="h-8 pl-8 text-xs"
            />
          </div>
          <MultiSelect
            label="Domain"
            options={industries.map((i) => ({ value: i.id, label: i.name }))}
            selected={domainFilter}
            onChange={setDomainFilter}
            className="h-8 text-xs"
          />
          <MultiSelect
            label="Status"
            options={[
              { value: "Active", label: "Active" },
              { value: "Inactive", label: "Inactive" },
            ]}
            selected={statusFilter}
            onChange={setStatusFilter}
            className="h-8 text-xs"
          />
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="size-3.5" /> Export CSV
          </Button>
          <span className="text-[11px] text-muted-foreground">{filtered.length} of {base.length}</span>
        </div>
      )}
      {filtered.length === 0 && (
        <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">No products match this filter.</p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filtered.map((p) => {
        const industry = industries.find((i) => i.id === p.domain);
        const Icon = iconForIndustry(industry?.icon) ?? Package;
        const mappedCount = getMappedRules(p.id, rules, mappings).length;
        const lastSim = simulations.find((s) => s.productId === p.id);
        const published = p.publishStatus === "Published";

        return (
          <div
            key={p.id}
            role="button"
            tabIndex={0}
            onClick={() => onConfigure(p)}
            onKeyDown={(e) => e.key === "Enter" && onConfigure(p)}
            className={cn(
              "flex cursor-pointer flex-col gap-2.5 rounded-xl border bg-card p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/40",
              p.status === "Inactive" && "opacity-60"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4.5" />
              </span>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {p.status === "Inactive" && <Badge variant="outline" className="text-[9px]">Inactive</Badge>}
                <Badge variant={published ? "default" : "secondary"} className="text-[9px]">
                  {p.publishStatus ?? "Draft"}
                </Badge>
              </div>
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

            <p className="text-[10px] text-muted-foreground/70">
              {published && p.lastPublishedAt
                ? `Published ${new Date(p.lastPublishedAt).toLocaleDateString()}`
                : `Last updated ${new Date(p.updatedAt).toLocaleDateString()}`}
            </p>

            <div className={cn("mt-1 grid grid-cols-2 gap-1.5")} onClick={(e) => e.stopPropagation()}>
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
    </div>
  );
}
