"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Save, Package, CheckSquare, Square, GripVertical, ListOrdered, ShieldAlert, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useAppStore, useHasCapability } from "@/lib/store";
import { getMappedRules } from "@/lib/product-rule-engine";
import { BusinessRule, Product, ProductRuleMapping } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ProductRuleCoverageChart, ProductRuleNetworkDiagram } from "@/components/studio/product-rule-mapping-viz";

// The Rule Sequencer for product execution — reorders the rules already
// mapped to this product (ProductRuleMapping.order). Same established
// grip-handle drag pattern as rule-builder/rule-sequence-panel.tsx: draggable
// lives on a dedicated handle span, not the whole row. Operates on the live
// saved mapping directly (reorder saves immediately on drop), independent of
// any in-progress add/remove selection below.
export function MappedRulesReorder({
  product,
  rules,
  mappings,
  onReorder,
}: {
  product: Product;
  rules: BusinessRule[];
  mappings: ProductRuleMapping[];
  onReorder: (orderedIds: string[]) => void;
}) {
  const canManage = useHasCapability("config.manage");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const ordered = getMappedRules(product.id, rules, mappings);

  const handleDrop = (targetId: string) => {
    if (!canManage || !draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }
    const ids = ordered.map((r) => r.id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(targetId);
    setDraggedId(null);
    if (from === -1 || to === -1) return;
    ids.splice(from, 1);
    ids.splice(to, 0, draggedId);
    onReorder(ids);
  };

  if (ordered.length === 0) return null;

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <div className="flex shrink-0 items-center gap-2 border-b bg-muted/30 px-3.5 py-2.5">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <ListOrdered className="size-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold">Execution Sequence</p>
          <p className="text-[10.5px] text-muted-foreground">Drag the grip handle to reorder — runs top to bottom</p>
        </div>
        <Badge variant="secondary" className="ml-auto shrink-0 text-[9px]">{ordered.length} rule{ordered.length === 1 ? "" : "s"}</Badge>
      </div>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5">
        {ordered.map((r, i) => (
          <div
            key={r.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(r.id)}
            className={cn(
              "flex select-none items-center gap-2.5 rounded-lg border bg-background px-2.5 py-2 text-xs transition-colors",
              draggedId === r.id ? "opacity-50" : "hover:border-primary/40 hover:shadow-sm"
            )}
          >
            <span
              draggable={canManage}
              onDragStart={() => canManage && setDraggedId(r.id)}
              onDragEnd={() => setDraggedId(null)}
              title={canManage ? undefined : "Your role doesn't include permission to reorder execution sequence"}
              className={cn(
                "flex shrink-0 text-muted-foreground/60",
                canManage ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed opacity-50"
              )}
            >
              <GripVertical className="size-4" />
            </span>
            <span className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[10px] font-bold text-primary">
              {i + 1}
            </span>
            <span className="w-16 shrink-0 font-mono text-[10px] text-muted-foreground">{r.id}</span>
            <span className="min-w-0 flex-1 truncate font-medium">{r.name}</span>
            <Badge variant="secondary" className="shrink-0 text-[9px]">{r.category || "Uncategorized"}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

// The map/unmap checklist half — search + category filter + select-all +
// table + explicit "Save Mapping" (dirty-state gated). Extracted so both the
// Settings-page two-pane manager below and the Product Workspace's Mapped
// Rules tab (src/app/products/[id]/page.tsx) share one implementation
// instead of two copies that could drift.
export function MappedRulesChecklist({
  product,
  rules,
  ruleCategories,
  mappings,
}: {
  product: Product;
  rules: BusinessRule[];
  ruleCategories: { id: string; name: string }[];
  mappings: ProductRuleMapping[];
}) {
  const saveProductRuleMapping = useAppStore((s) => s.saveProductRuleMapping);
  const canManage = useHasCapability("config.manage");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [selection, setSelection] = useState<Set<string> | null>(null);
  // Cross-domain mapping (e.g. an Insurance rule mapped to a Lending product)
  // is rarely intentional and silently meaningless at execution time — hide
  // other domains by default, with an explicit opt-out for the deliberate
  // reuse case.
  const [showAllDomains, setShowAllDomains] = useState(false);

  const savedRuleIds = useMemo(
    () => new Set(getMappedRules(product.id, rules, mappings).map((r) => r.id)),
    [product.id, rules, mappings]
  );
  const activeSelection = selection ?? savedRuleIds;
  const dirty = selection !== null;
  const crossDomainMappedCount = useMemo(
    () => rules.filter((r) => activeSelection.has(r.id) && r.domain !== product.domain).length,
    [rules, activeSelection, product.domain]
  );

  const filteredRules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rules.filter((r) => {
      if (!showAllDomains && r.domain !== product.domain) return false;
      if (categoryFilter && r.category !== categoryFilter) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rules, search, categoryFilter, showAllDomains, product.domain]);

  const toggleRule = (ruleId: string) => {
    const next = new Set(activeSelection);
    if (next.has(ruleId)) next.delete(ruleId);
    else next.add(ruleId);
    setSelection(next);
  };

  const allFilteredSelected = filteredRules.length > 0 && filteredRules.every((r) => activeSelection.has(r.id));
  const toggleSelectAllFiltered = () => {
    const next = new Set(activeSelection);
    if (allFilteredSelected) {
      filteredRules.forEach((r) => next.delete(r.id));
    } else {
      filteredRules.forEach((r) => next.add(r.id));
    }
    setSelection(next);
  };

  const save = () => {
    if (!canManage) {
      toast.error("You don't have permission to change this product's rule mapping.");
      return;
    }
    saveProductRuleMapping(product.id, Array.from(activeSelection));
    setSelection(null);
    toast.success(`Mapping saved — ${activeSelection.size} rule${activeSelection.size === 1 ? "" : "s"} mapped to "${product.name}".`);
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex min-h-0 flex-1 flex-col rounded-xl border bg-card shadow-sm">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/30 px-3.5 py-2.5">
          <div className="relative flex-1 min-w-48">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rules by name or ID..."
              className="h-8 bg-background pl-8 text-xs"
            />
          </div>
          <Select value={categoryFilter || "__all__"} onValueChange={(v) => setCategoryFilter(v === "__all__" ? "" : (v as string))}>
            <SelectTrigger size="sm" className="h-8 w-44 bg-background"><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All categories</SelectItem>
              {ruleCategories.map((c) => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-background text-xs" onClick={toggleSelectAllFiltered}>
            {allFilteredSelected ? <Square className="size-3.5" /> : <CheckSquare className="size-3.5" />}
            {allFilteredSelected ? "Clear filtered" : "Select all filtered"}
          </Button>
          <Button
            variant={showAllDomains ? "secondary" : "outline"}
            size="sm"
            className={cn("h-8 gap-1.5 text-xs", showAllDomains ? "border-primary/50 text-primary" : "bg-background")}
            onClick={() => setShowAllDomains((v) => !v)}
            title={`By default only ${product.domain} rules are shown — this product's own domain`}
          >
            {showAllDomains ? `All domains` : `${product.domain} only`}
          </Button>
        </div>

        <div className="flex shrink-0 items-center justify-between px-3.5 py-2 text-[11px] text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">{activeSelection.size}</span> rule{activeSelection.size === 1 ? "" : "s"} mapped to{" "}
            <span className="font-semibold text-foreground">{product.name}</span>
          </span>
          <span>{filteredRules.length} shown</span>
        </div>

        {crossDomainMappedCount > 0 && (
          <div className="mx-3.5 mb-3 flex shrink-0 items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
            <ShieldAlert className="size-3.5 shrink-0" />
            <span>
              <span className="font-semibold">{crossDomainMappedCount}</span> mapped rule{crossDomainMappedCount === 1 ? "" : "s"} outside this
              product&apos;s {product.domain} domain — a cross-domain rule still executes, but is rarely intentional. Toggle &quot;All domains&quot;
              above to review.
            </span>
          </div>
        )}

        <div className="mx-3.5 mb-3.5 flex min-h-0 flex-1 flex-col rounded-lg border overflow-hidden">
          <div className="flex shrink-0 items-center gap-3 bg-muted/50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b select-none">
            <div className="flex items-center">
              <Checkbox checked={allFilteredSelected} onCheckedChange={toggleSelectAllFiltered} />
            </div>
            <span className="w-16 shrink-0">ID</span>
            <span className="min-w-0 flex-1">Rule</span>
            <span className="w-24 shrink-0 text-center">Eligibility</span>
            <span className="w-20 shrink-0 text-center">Domain</span>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="divide-y">
              {filteredRules.map((r, i) => (
                <label
                  key={r.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-3 py-2 text-xs transition-colors hover:bg-primary/5",
                    activeSelection.has(r.id) ? "bg-primary/5" : i % 2 === 1 ? "bg-muted/20" : ""
                  )}
                >
                  <Checkbox checked={activeSelection.has(r.id)} onCheckedChange={() => toggleRule(r.id)} />
                  <span className="w-16 shrink-0 font-mono text-[10px] text-muted-foreground">{r.id}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{r.name}</span>
                  <div className="w-24 shrink-0 flex justify-center">
                    <Badge variant="secondary" className="text-[9px]">{r.category || "Uncategorized"}</Badge>
                  </div>
                  <div className="w-20 shrink-0 flex justify-center">
                    <Badge variant="outline" className="text-[9px]">{r.domain}</Badge>
                  </div>
                </label>
              ))}
              {filteredRules.length === 0 && (
                <p className="p-6 text-center text-[11px] text-muted-foreground">No rules match this filter.</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className={cn(
        "flex items-center justify-end gap-2.5 rounded-xl border px-3.5 py-2.5 transition-colors",
        dirty ? "border-primary/30 bg-primary/5" : "bg-card"
      )}>
        {dirty && <span className="text-[11px] font-medium text-primary">Unsaved changes</span>}
        <Button
          size="sm"
          className="gap-1.5"
          onClick={save}
          disabled={!dirty || !canManage}
          title={canManage ? undefined : "Your role doesn't include permission to change this product's rule mapping"}
        >
          <Save className="size-3.5" /> Save Mapping
        </Button>
      </div>
    </div>
  );
}

// Product-Rule Mapping — the many-to-many wiring that replaces Execution
// Manager's group/step routing. Category here is filter-only (narrows the
// picker), never part of execution.
export function ProductRuleMappingManager() {
  const products = useAppStore((s) => s.products);
  const rules = useAppStore((s) => s.rules);
  const ruleCategories = useAppStore((s) => s.ruleCategories);
  const productRuleMappings = useAppStore((s) => s.productRuleMappings);
  const saveProductRuleMapping = useAppStore((s) => s.saveProductRuleMapping);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(products[0] ?? null);
  const [productSearch, setProductSearch] = useState("");
  const [productsPanelOpen, setProductsPanelOpen] = useState(true);

  const selectProduct = (p: Product) => {
    setSelectedProduct(p);
  };

  const filteredProducts = productSearch.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(productSearch.trim().toLowerCase()) || p.code.toLowerCase().includes(productSearch.trim().toLowerCase()))
    : products;

  const reorderMapped = (orderedIds: string[]) => {
    if (!selectedProduct) return;
    saveProductRuleMapping(selectedProduct.id, orderedIds);
    toast.success("Execution sequence updated.");
  };

  return (
    // A fixed, real height on the whole component (rather than h-full, which
    // has no bounded ancestor here — Configuration Studio's content area is
    // one page-level ScrollArea, see the note below) — every column below
    // stretches to genuinely share this same height instead of each growing
    // to its own natural content size. Only applied at xl+, where all 3
    // columns fit side by side; narrower than that they stack (see below)
    // and the page's own scroll takes over instead of an internal cap.
    <div className="flex min-h-100 flex-col gap-4 sm:flex-row xl:h-125">
      {productsPanelOpen ? (
        <div className="flex h-full w-full shrink-0 flex-col gap-2.5 sm:w-52">
          <div className="flex shrink-0 items-center justify-between px-0.5">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-6 text-muted-foreground"
                title="Hide Products panel"
                onClick={() => setProductsPanelOpen(false)}
              >
                <PanelLeftClose className="size-3.5" />
              </Button>
              <p className="text-xs font-semibold text-muted-foreground">Products</p>
            </div>
            <Badge variant="secondary" className="text-[9px]">{filteredProducts.length} of {products.length}</Badge>
          </div>
          <div className="relative shrink-0">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products..."
              className="h-8 pl-8 text-xs"
            />
          </div>
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
          {filteredProducts.map((p) => {
            const mappedCount = getMappedRules(p.id, rules, productRuleMappings).length;
            const selected = selectedProduct?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => selectProduct(p)}
                className={cn(
                  "relative flex w-full items-center gap-2.5 overflow-hidden rounded-xl border p-2.5 text-left transition-all",
                  selected ? "border-primary/40 bg-primary/5 shadow-sm" : "hover:border-primary/20 hover:bg-muted/60"
                )}
              >
                {selected && <span className="absolute inset-y-0 left-0 w-1 bg-primary" />}
                <span className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg",
                  selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <Package className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{p.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {mappedCount} rule{mappedCount === 1 ? "" : "s"} mapped
                  </p>
                </div>
              </button>
            );
          })}
          {filteredProducts.length === 0 && (
            <p className="rounded-lg border border-dashed p-4 text-center text-[11px] text-muted-foreground">
              {products.length === 0 ? "No products yet — add one in Product Master first." : "No products match this search."}
            </p>
          )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setProductsPanelOpen(true)}
          title="Show Products panel"
          className="flex shrink-0 items-center gap-1.5 self-start rounded-lg border px-2 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground sm:h-full sm:flex-col sm:justify-start sm:py-2.5"
        >
          <PanelLeftOpen className="size-3.5" />
          <span className="sm:[writing-mode:vertical-rl]">Products</span>
        </button>
      )}
    <div className="flex h-full min-w-0 flex-1 flex-col gap-4">
      {/* Main Content */}
      {!selectedProduct ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed text-center">
          <Package className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Select a product to configure its rules.</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4 min-h-0">
          {/* Header */}
          <div className="flex items-center gap-2.5 border-b pb-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Package className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{selectedProduct.name}</p>
              <p className="text-[10.5px] text-muted-foreground">Configure which rules execute and their sequence.</p>
            </div>
          </div>

          {/* Two-Column Layout: Available Rules + Selected Sequence. Side by
              side only at xl+ (1280px) — below that, 3 fixed-width columns
              (Products + this row) don't reliably fit, and Execution
              Sequence being shrink-0 meant it could get pushed past the
              visible area instead of shrinking. Stacking avoids that
              entirely: each column takes the full width on its own row, so
              nothing can be squeezed off-screen. Side by side, both stretch
              to the same height (the root's xl:h-125 provides a real bound)
              and scroll their own content internally; stacked, they size to
              content and the page's own scroll takes over instead. */}
          <div className="flex min-h-0 flex-1 flex-col gap-4 xl:flex-row">
            {/* Left: Available Rules */}
            <div className="flex min-h-0 flex-1 flex-col min-w-0">
              <MappedRulesChecklist
                product={selectedProduct}
                rules={rules}
                ruleCategories={ruleCategories}
                mappings={productRuleMappings}
              />
            </div>

            {/* Right: Execution Sequence */}
            <div className="flex min-h-0 w-full flex-col xl:w-80 xl:shrink-0">
              <MappedRulesReorder
                product={selectedProduct}
                rules={rules}
                mappings={productRuleMappings}
                onReorder={reorderMapped}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
