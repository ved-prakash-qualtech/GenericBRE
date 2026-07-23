"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Package, Search, Download, Power, PowerOff, Trash2, AlertTriangle } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Product } from "@/lib/types";
import { downloadCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

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
  const simulations = useAppStore((s) => s.simulations);
  const addProduct = useAppStore((s) => s.addProduct);
  const updateProduct = useAppStore((s) => s.updateProduct);
  const deleteProduct = useAppStore((s) => s.deleteProduct);

  const [editing, setEditing] = useState<Product | null>(null);
  const [draft, setDraft] = useState<Product>(blank(industries[0]?.id ?? ""));
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (domainFilter.length > 0 && !domainFilter.includes(p.domain)) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(p.status)) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, search, domainFilter, statusFilter]);

  const exportCsv = () => {
    downloadCsv(
      "products",
      filteredProducts.map((p) => ({
        Name: p.name,
        Code: p.code,
        Domain: industries.find((i) => i.id === p.domain)?.name ?? p.domain,
        Status: p.status,
        "Publish Status": p.publishStatus ?? "Draft",
        "Mapped Rules": mappedCount(p.id),
        Description: p.description ?? "",
      }))
    );
  };

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
  // Delete is only ever safe (and only ever offered) for a product nobody has
  // configured yet — any mapping (active or not) or simulation history means
  // real referential data would be orphaned by a hard delete; Deactivate is
  // the retirement path once a product has been used for anything.
  const hasHistory = (productId: string) =>
    productRuleMappings.some((m) => m.productId === productId) || simulations.some((sim) => sim.productId === productId);

  // Products previously had no retirement path at all — deprecating one just
  // left it as permanent, invisible clutter (audit finding B19). Reuses the
  // existing Active/Inactive status field rather than a hard delete, keeping
  // history/mappings intact and reversible.
  const toggleStatus = (p: Product) => {
    const next = p.status === "Active" ? "Inactive" : "Active";
    updateProduct(p.id, { status: next });
    toast.success(`"${p.name}" ${next === "Active" ? "reactivated" : "deactivated"}.`);
  };

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
        <p className="text-sm text-muted-foreground">
          Configurable product/scheme master — a client can offer many. Which rules apply to each is configured in
          Product-Rule Mapping, not here.
        </p>
        <Button size="sm" className="shrink-0 gap-1.5" onClick={startCreate}>
          <Plus className="size-3.5" /> Add Product
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or code..."
            className="h-8 pl-8 text-sm"
          />
        </div>
        <MultiSelect
          label="Domain"
          options={industries.map((i) => ({ value: i.id, label: i.name }))}
          selected={domainFilter}
          onChange={setDomainFilter}
          className="h-8 text-sm"
        />
        <MultiSelect
          label="Status"
          options={[
            { value: "Active", label: "Active" },
            { value: "Inactive", label: "Inactive" },
          ]}
          selected={statusFilter}
          onChange={setStatusFilter}
          className="h-8 text-sm"
        />
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-sm" onClick={exportCsv} disabled={filteredProducts.length === 0}>
          <Download className="size-3.5" /> Export CSV
        </Button>
        <span className="text-sm text-muted-foreground">{filteredProducts.length} of {products.length}</span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((p) => (
          <div key={p.id} className="flex items-start gap-3 rounded-xl border bg-card p-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <Badge variant={p.status === "Active" ? "default" : "secondary"} className="h-6 shrink-0 text-sm">{p.status}</Badge>
              </div>
              <p className="mt-0.5 font-mono text-sm text-muted-foreground">{p.code} · {industries.find((i) => i.id === p.domain)?.name ?? p.domain}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description || "No description"}</p>
              <p className="mt-1 text-sm font-medium text-muted-foreground/70">
                {mappedCount(p.id)} rule{mappedCount(p.id) === 1 ? "" : "s"} mapped
              </p>
            </div>
            <div className="flex shrink-0 gap-0.5">
              <Button
                variant="ghost"
                size="icon-sm"
                title={p.status === "Active" ? "Deactivate" : "Reactivate"}
                onClick={() => toggleStatus(p)}
              >
                {p.status === "Active" ? <PowerOff className="size-3.5" /> : <Power className="size-3.5" />}
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => startEdit(p)}>
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive disabled:pointer-events-auto"
                disabled={hasHistory(p.id)}
                title={hasHistory(p.id) ? "Has rule mappings or simulation history — deactivate instead" : "Delete permanently"}
                onClick={() => setDeleteConfirm(p)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {filteredProducts.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {products.length === 0 ? "No products configured yet. Add one to get started." : "No products match this filter."}
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
                  disabled={editing?.publishStatus === "Published"}
                />
                {editing?.publishStatus === "Published" && (
                  <p className="text-sm text-muted-foreground">
                    Stable API identifier — not editable once published, to avoid breaking existing integrations.
                  </p>
                )}
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

      <AlertDialog open={!!deleteConfirm} onOpenChange={(v) => !v && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" /> Delete &quot;{deleteConfirm?.name}&quot; permanently?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This product has no rule mappings or simulation history, so nothing is orphaned — but the deletion itself
              can&apos;t be undone. If it&apos;s ever used later, Deactivate is the reversible option instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteConfirm) return;
                const result = deleteProduct(deleteConfirm.id);
                if (result.ok) {
                  toast.success(`"${deleteConfirm.name}" deleted permanently.`);
                } else {
                  toast.error("Delete blocked", { description: result.reason });
                }
                setDeleteConfirm(null);
              }}
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
