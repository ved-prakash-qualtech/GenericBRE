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
    <div className="rounded-xl border bg-card p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <ListOrdered className="size-3.5" /> Execution Sequence — drag to reorder
      </p>
      <div className="max-h-48 space-y-1.5 overflow-y-auto">
        {ordered.map((r, i) => (
          <div
            key={r.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(r.id)}
            className="flex select-none items-center gap-2 rounded-lg border bg-background px-2.5 py-2 text-xs"
          >
            <span
              draggable
              onDragStart={() => setDraggedId(r.id)}
              onDragEnd={() => setDraggedId(null)}
              className="flex shrink-0 cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="size-4 text-muted-foreground" />
            </span>
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[10px] font-semibold">
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
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rules by name or ID..."
            className="h-8 pl-8 text-xs"
          />
        </div>
        <Select value={categoryFilter || "__all__"} onValueChange={(v) => setCategoryFilter(v === "__all__" ? "" : (v as string))}>
          <SelectTrigger size="sm" className="h-8 w-44"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All categories</SelectItem>
            {ruleCategories.map((c) => (
              <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={toggleSelectAllFiltered}>
          {allFilteredSelected ? <Square className="size-3.5" /> : <CheckSquare className="size-3.5" />}
          {allFilteredSelected ? "Clear filtered" : "Select all filtered"}
        </Button>
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">{activeSelection.size}</span> rule{activeSelection.size === 1 ? "" : "s"} mapped to{" "}
          <span className="font-semibold text-foreground">{product.name}</span>
        </span>
        <span>{filteredRules.length} shown</span>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center gap-3 bg-muted/40 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b select-none">
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
            {filteredRules.map((r) => (
              <label
                key={r.id}
                className="flex cursor-pointer items-center gap-3 px-3 py-2 text-xs hover:bg-muted/40"
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

      <div className="flex justify-end">
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
    <div className="flex h-full min-h-100 gap-4">
      <div className="w-64 shrink-0 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">Products</p>
        <div className="max-h-125 space-y-1 overflow-y-auto">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => selectProduct(p)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg border p-2.5 text-left transition-colors",
                selectedProduct?.id === p.id ? "border-primary bg-primary/5" : "hover:bg-muted"
              )}
            >
              <Package className="size-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{p.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {getMappedRules(p.id, rules, productRuleMappings).length} rule(s) mapped
                </p>
              </div>
            </button>
          ))}
          {products.length === 0 && (
            <p className="rounded-lg border border-dashed p-4 text-center text-[11px] text-muted-foreground">
              No products yet — add one in Product Master first.
            </p>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {!selectedProduct ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground">
            Select a product to map rules to it.
          </div>
        ) : (
          <div className="flex h-full flex-col gap-3">
            <MappedRulesReorder
              product={selectedProduct}
              rules={rules}
              mappings={productRuleMappings}
              onReorder={reorderMapped}
            />
            <MappedRulesChecklist
              product={selectedProduct}
              rules={rules}
              ruleCategories={ruleCategories}
              mappings={productRuleMappings}
            />
          </div>
        )}
      </div>
    </div>
  );
}
