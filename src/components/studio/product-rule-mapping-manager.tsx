"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Save, Package, CheckSquare, Square, GripVertical, ListOrdered } from "lucide-react";
import { useAppStore } from "@/lib/store";
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
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const ordered = getMappedRules(product.id, rules, mappings);

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
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
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b bg-muted/30 px-3.5 py-2.5">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <ListOrdered className="size-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold">Execution Sequence</p>
          <p className="text-[10.5px] text-muted-foreground">Drag the grip handle to reorder — runs top to bottom</p>
        </div>
        <Badge variant="secondary" className="ml-auto shrink-0 text-[9px]">{ordered.length} rule{ordered.length === 1 ? "" : "s"}</Badge>
      </div>
      <div className="max-h-48 space-y-1.5 overflow-y-auto p-2.5">
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
              draggable
              onDragStart={() => setDraggedId(r.id)}
              onDragEnd={() => setDraggedId(null)}
              className="flex shrink-0 cursor-grab text-muted-foreground/60 active:cursor-grabbing"
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
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [selection, setSelection] = useState<Set<string> | null>(null);

  const savedRuleIds = useMemo(
    () => new Set(getMappedRules(product.id, rules, mappings).map((r) => r.id)),
    [product.id, rules, mappings]
  );
  const activeSelection = selection ?? savedRuleIds;
  const dirty = selection !== null;

  const filteredRules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rules.filter((r) => {
      if (categoryFilter && r.category !== categoryFilter) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rules, search, categoryFilter]);

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
    saveProductRuleMapping(product.id, Array.from(activeSelection));
    setSelection(null);
    toast.success(`Mapping saved — ${activeSelection.size} rule${activeSelection.size === 1 ? "" : "s"} mapped to "${product.name}".`);
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-3.5 py-2.5">
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
        </div>

        <div className="flex items-center justify-between px-3.5 py-2 text-[11px] text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">{activeSelection.size}</span> rule{activeSelection.size === 1 ? "" : "s"} mapped to{" "}
            <span className="font-semibold text-foreground">{product.name}</span>
          </span>
          <span>{filteredRules.length} shown</span>
        </div>

        <div className="mx-3.5 mb-3.5 rounded-lg border overflow-hidden">
          <div className="flex items-center gap-3 bg-muted/50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b select-none">
            <div className="flex items-center">
              <Checkbox checked={allFilteredSelected} onCheckedChange={toggleSelectAllFiltered} />
            </div>
            <span className="w-16 shrink-0">ID</span>
            <span className="min-w-0 flex-1">Rule</span>
            <span className="w-24 shrink-0 text-center">Eligibility</span>
            <span className="w-20 shrink-0 text-center">Domain</span>
          </div>

          <ScrollArea className="h-[260px]">
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
        <Button size="sm" className="gap-1.5" onClick={save} disabled={!dirty}>
          <Save className="size-3.5" /> Save Mapping
        </Button>
      </div>
    </div>
  );
}

// Product-Rule Mapping — the many-to-many wiring that replaces Execution
// Manager's group/step routing. Category here is filter-only (narrows the
// picker), never part of execution.
const productColors = [
  "bg-blue-50 border-blue-200 hover:bg-blue-100",
  "bg-emerald-50 border-emerald-200 hover:bg-emerald-100",
  "bg-purple-50 border-purple-200 hover:bg-purple-100",
  "bg-amber-50 border-amber-200 hover:bg-amber-100",
  "bg-rose-50 border-rose-200 hover:bg-rose-100",
  "bg-cyan-50 border-cyan-200 hover:bg-cyan-100",
];

export function ProductRuleMappingManager() {
  const products = useAppStore((s) => s.products);
  const rules = useAppStore((s) => s.rules);
  const ruleCategories = useAppStore((s) => s.ruleCategories);
  const productRuleMappings = useAppStore((s) => s.productRuleMappings);
  const saveProductRuleMapping = useAppStore((s) => s.saveProductRuleMapping);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(products[0] ?? null);

  const selectProduct = (p: Product) => {
    setSelectedProduct(p);
  };

  const reorderMapped = (orderedIds: string[]) => {
    if (!selectedProduct) return;
    saveProductRuleMapping(selectedProduct.id, orderedIds);
    toast.success("Execution sequence updated.");
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Products Horizontal Layout */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <p className="text-xs font-semibold text-muted-foreground">Select Product</p>
          <Badge variant="secondary" className="text-[9px]">{products.length} product{products.length === 1 ? "" : "s"}</Badge>
        </div>

        {products.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <Package className="mx-auto mb-2 size-6 text-muted-foreground/40" />
            <p className="text-[11px] text-muted-foreground">No products yet — add one in Product Master first.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5 overflow-x-auto pb-1">
            {products.map((p, idx) => {
              const mappedCount = getMappedRules(p.id, rules, productRuleMappings).length;
              const isSelected = selectedProduct?.id === p.id;
              const colorClass = productColors[idx % productColors.length];

              return (
                <button
                  key={p.id}
                  onClick={() => selectProduct(p)}
                  className={cn(
                    "flex shrink-0 items-center gap-2.5 rounded-lg border-2 px-3.5 py-2.5 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/20"
                      : `border ${colorClass}`
                  )}
                >
                  <span className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold",
                    isSelected ? "bg-primary/20 text-primary" : "bg-white/40 text-muted-foreground"
                  )}>
                    <Package className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold whitespace-nowrap">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {mappedCount} rule{mappedCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

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

          {/* Two-Column Layout: Available Rules + Selected Sequence */}
          <div className="flex flex-1 gap-4 min-h-0">
            {/* Left: Available Rules */}
            <div className="flex-1 min-w-0">
              <MappedRulesChecklist
                product={selectedProduct}
                rules={rules}
                ruleCategories={ruleCategories}
                mappings={productRuleMappings}
              />
            </div>

            {/* Right: Execution Sequence */}
            <div className="w-80 shrink-0 flex flex-col gap-3">
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
  );
}
