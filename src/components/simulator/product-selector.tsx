"use client";

import { useState } from "react";
import { Package, ChevronsUpDown, Clock, Globe, CalendarCheck2 } from "lucide-react";
import { Product, Industry, BusinessRule, ProductRuleMapping } from "@/lib/types";
import { getMappedRules } from "@/lib/product-rule-engine";
import { iconForIndustry } from "@/lib/industries";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const RESULT_CAP = 50;

// Enterprise-scale replacement for the old ProductKpiCards grid: a single
// searchable combobox whose trigger doubles as the "Product Summary" card
// (spec requirement #4), so there's no separate summary element to keep in
// sync. Search-first + a capped render list is the scalability strategy for
// 500+ products (no virtualization library is installed, and the spec itself
// leads with "searchable dropdown" as the primary scale mechanism) — see the
// plan at large for the full rationale.
export function ProductSelector({
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
  const recentProductIds = useAppStore((s) => s.recentProductIds);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [recentOnly, setRecentOnly] = useState(false);

  // Only Active products are valid simulation targets — unchanged from the
  // KPI-card grid this replaces (execution-eligibility gate, not new).
  const active = products.filter((p) => p.status === "Active");
  const selected = active.find((p) => p.id === selectedProductId) ?? null;

  if (active.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
        No active products yet — add one in Configuration Studio → Product Master.
      </p>
    );
  }

  const filtered = active.filter((p) => {
    if (industryFilter.length > 0 && !industryFilter.includes(p.domain)) return false;
    if (statusFilter.length > 0 && !statusFilter.includes(p.publishStatus ?? "Draft")) return false;
    if (recentOnly && !recentProductIds.includes(p.id)) return false;
    return true;
  });
  const capped = filtered.slice(0, RESULT_CAP);
  const recentProducts = recentProductIds
    .map((id) => active.find((p) => p.id === id))
    .filter((p): p is Product => !!p && filtered.includes(p));

  const select = (product: Product) => {
    onSelect(product);
    setSearch("");
    setOpen(false);
  };

  const selectedIndustry = selected ? industries.find((i) => i.id === selected.domain) : undefined;
  // iconForIndustry looks up a stable icon reference from ICON_MAP, it doesn't
  // create a new component — false positive for react-hooks/static-components.
  const SelectedIcon = iconForIndustry(selectedIndustry?.icon) ?? Package;
  const mappedCount = selected ? getMappedRules(selected.id, rules, mappings).length : 0;
  const canCall = selected?.publishStatus === "Published";

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border bg-card p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/40",
                open && "border-primary ring-1 ring-primary/30"
              )}
            />
          }
        >
          {selected ? (
            <>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {/* eslint-disable-next-line react-hooks/static-components -- iconForIndustry returns a stable ICON_MAP reference, not a freshly created component */}
                <SelectedIcon className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-sm font-semibold">{selected.name}</p>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{selected.code}</span>
                  <Badge variant={canCall ? "default" : "secondary"} className="shrink-0 text-[9px]">
                    {selected.publishStatus ?? "Draft"}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span>{selectedIndustry?.name ?? selected.domain}</span>
                  <span>
                    <span className="font-semibold text-foreground">{mappedCount}</span> mapped rule{mappedCount === 1 ? "" : "s"}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarCheck2 className="size-3" />
                    {selected.lastPublishedAt ? new Date(selected.lastPublishedAt).toLocaleDateString() : "Not yet published"}
                  </span>
                </div>
                {canCall && (
                  <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground/80">
                    <Globe className="size-3 shrink-0" />
                    POST /api/decision · productId: &quot;{selected.code}&quot;
                  </div>
                )}
              </div>
              <ChevronsUpDown className="mt-1 size-3.5 shrink-0 opacity-50" />
            </>
          ) : (
            <>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Package className="size-4.5" />
              </span>
              <div className="flex-1 pt-1.5">
                <p className="text-sm text-muted-foreground">Search products by name, code, or industry...</p>
              </div>
              <ChevronsUpDown className="mt-2.5 size-3.5 shrink-0 opacity-50" />
            </>
          )}
        </PopoverTrigger>

        <PopoverContent align="start" className="w-[min(28rem,92vw)] p-0">
          <div className="flex items-center gap-1.5 border-b p-1.5">
            <MultiSelect
              label="Industry"
              options={industries.map((i) => ({ value: i.id, label: i.name }))}
              selected={industryFilter}
              onChange={setIndustryFilter}
              className="h-8 flex-1 text-xs"
            />
            <MultiSelect
              label="Status"
              options={[
                { value: "Published", label: "Published" },
                { value: "Draft", label: "Draft" },
              ]}
              selected={statusFilter}
              onChange={setStatusFilter}
              className="h-8 flex-1 text-xs"
            />
            <Button
              variant={recentOnly ? "secondary" : "outline"}
              size="sm"
              className={cn("h-8 gap-1.5 px-2 text-xs", recentOnly && "border-primary/50 text-primary")}
              disabled={recentProductIds.length === 0}
              onClick={() => setRecentOnly((v) => !v)}
              title="Recently simulated products"
            >
              <Clock className="size-3.5" />
            </Button>
          </div>

          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by name, code, or industry..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-80">
              <CommandEmpty>No matching products.</CommandEmpty>

              {search.trim() === "" && recentProducts.length > 0 && (
                <CommandGroup heading="Recently Used">
                  {recentProducts.map((p) => (
                    <ProductRow key={p.id} product={p} industries={industries} rules={rules} mappings={mappings} onSelect={select} />
                  ))}
                </CommandGroup>
              )}

              <CommandGroup heading="All Products">
                {capped
                  .filter((p) => {
                    if (search.trim() === "") return true;
                    const industry = industries.find((i) => i.id === p.domain);
                    const haystack = `${p.name} ${p.code} ${industry?.name ?? p.domain}`.toLowerCase();
                    return haystack.includes(search.trim().toLowerCase());
                  })
                  .map((p) => (
                    <ProductRow key={p.id} product={p} industries={industries} rules={rules} mappings={mappings} onSelect={select} />
                  ))}
              </CommandGroup>
            </CommandList>
            {filtered.length > RESULT_CAP && (
              <p className="border-t px-3 py-2 text-center text-[10.5px] text-muted-foreground">
                Showing {RESULT_CAP} of {filtered.length} matches — refine your search to narrow the list.
              </p>
            )}
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ProductRow({
  product,
  industries,
  rules,
  mappings,
  onSelect,
}: {
  product: Product;
  industries: Industry[];
  rules: BusinessRule[];
  mappings: ProductRuleMapping[];
  onSelect: (product: Product) => void;
}) {
  const industry = industries.find((i) => i.id === product.domain);
  const Icon = iconForIndustry(industry?.icon) ?? Package;
  const mappedCount = getMappedRules(product.id, rules, mappings).length;
  const published = product.publishStatus === "Published";

  return (
    <CommandItem
      value={product.id}
      onSelect={() => onSelect(product)}
      className="flex items-start gap-2.5 py-2"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        {/* eslint-disable-next-line react-hooks/static-components -- see note in ProductSelector above */}
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-xs font-semibold text-foreground">{product.name}</span>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{product.code}</span>
          <Badge variant={published ? "default" : "secondary"} className="shrink-0 text-[9px]">
            {product.publishStatus ?? "Draft"}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 text-[10.5px] text-muted-foreground">
          <span>{industry?.name ?? product.domain}</span>
          <span>{mappedCount} mapped rule{mappedCount === 1 ? "" : "s"}</span>
          <span>{product.lastPublishedAt ? new Date(product.lastPublishedAt).toLocaleDateString() : "Not published"}</span>
        </div>
      </div>
    </CommandItem>
  );
}
