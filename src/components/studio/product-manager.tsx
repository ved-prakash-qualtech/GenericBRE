"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Package } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

function blank(defaultDomain: string): Product {
  const now = new Date().toISOString();
  return { id: "", name: "", code: "", domain: defaultDomain, description: "", status: "Active", createdAt: now, updatedAt: now };
}

// Product Master — a configurable named scheme a client offers (Home Loan,
// Auto Loan, ...). Which rules apply to it lives entirely in Product-Rule
// Mapping (see product-rule-mapping-manager.tsx); a Product never embeds
// rule logic itself.
export function ProductManager() {
  const products = useAppStore((s) => s.products);
  const industries = useAppStore((s) => s.industries);
  const productRuleMappings = useAppStore((s) => s.productRuleMappings);
  const addProduct = useAppStore((s) => s.addProduct);
  const updateProduct = useAppStore((s) => s.updateProduct);

  const [editing, setEditing] = useState<Product | null>(null);
  const [draft, setDraft] = useState<Product>(blank(industries[0]?.id ?? ""));
  const [open, setOpen] = useState(false);

  const startCreate = () => {
    setEditing(null);
    setDraft(blank(industries[0]?.id ?? ""));
    setOpen(true);
  };
  const startEdit = (product: Product) => {
    setEditing(product);
    setDraft(product);
    setOpen(true);
  };

  const mappedCount = (productId: string) => productRuleMappings.filter((m) => m.productId === productId && m.active).length;

  const save = () => {
    if (!draft.name.trim()) {
      toast.error("Product name is required.");
      return;
    }
    if (!draft.code.trim()) {
      toast.error("Product code is required.");
      return;
    }
    const code = draft.code.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
    const dupCode = products.find((p) => p.code === code && p.id !== editing?.id);
    if (dupCode) {
      toast.error(`Product code "${code}" is already used by "${dupCode.name}".`);
      return;
    }
    if (editing) {
      updateProduct(editing.id, { ...draft, code });
      toast.success(`"${draft.name}" updated.`);
    } else {
      const id = `prod-${draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
      if (products.some((p) => p.id === id)) {
        toast.error(`A product with id "${id}" already exists.`);
        return;
      }
      addProduct({ ...draft, id, code });
      toast.success(`"${draft.name}" added — available immediately in Product-Rule Mapping & the Simulator.`);
    }
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Configurable product/scheme master — a client can offer many. Which rules apply to each is configured in
          Product-Rule Mapping, not here.
        </p>
        <Button size="sm" className="shrink-0 gap-1.5" onClick={startCreate}>
          <Plus className="size-3.5" /> Add Product
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <div key={p.id} className="flex items-start gap-3 rounded-xl border bg-card p-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <Badge variant={p.status === "Active" ? "default" : "secondary"} className="shrink-0 text-[9px]">{p.status}</Badge>
              </div>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{p.code} · {industries.find((i) => i.id === p.domain)?.name ?? p.domain}</p>
              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{p.description || "No description"}</p>
              <p className="mt-1 text-[10px] font-medium text-muted-foreground/70">
                {mappedCount(p.id)} rule{mappedCount(p.id) === 1 ? "" : "s"} mapped
              </p>
            </div>
            <Button variant="ghost" size="icon-sm" className="shrink-0" onClick={() => startEdit(p)}>
              <Pencil className="size-3.5" />
            </Button>
          </div>
        ))}
        {products.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
            No products configured yet. Add one to get started.
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Home Loan"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label>Code *</Label>
                <Input
                  value={draft.code}
                  onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
                  placeholder="e.g. HOME_LOAN"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Domain *</Label>
                <Select value={draft.domain} onValueChange={(v) => setDraft((d) => ({ ...d, domain: (v as string) ?? d.domain }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select domain" /></SelectTrigger>
                  <SelectContent>
                    {industries.map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={draft.status} onValueChange={(v) => setDraft((d) => ({ ...d, status: (v as Product["status"]) ?? d.status }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={draft.description ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="What this product/scheme is"
                className="min-h-16"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={save}>{editing ? "Save Changes" : "Add Product"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
