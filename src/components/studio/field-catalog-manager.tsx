"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Search, Download, Upload, AlertTriangle, Link2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { BusinessField, FieldDataType, FieldItemType } from "@/lib/types";
import { fieldUsage } from "@/lib/condition-tree";
import { downloadCsv, parseCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

const FIELD_TYPES: FieldDataType[] = ["number", "string", "boolean", "enum", "currency", "list"];
const ITEM_TYPES: FieldItemType[] = ["number", "string", "boolean", "enum", "currency"];
const STATUSES: NonNullable<BusinessField["status"]>[] = ["Active", "Draft", "Deprecated"];

const BLANK: BusinessField = { key: "", label: "", domain: "Common", type: "string", status: "Active" };

const STATUS_TONE: Record<string, string> = {
  Active: "text-emerald-600 dark:text-emerald-400",
  Draft: "text-amber-600 dark:text-amber-400",
  Deprecated: "text-muted-foreground",
};

export function FieldCatalogManager() {
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const industries = useAppStore((s) => s.industries);
  const entities = useAppStore((s) => s.entities);
  const rules = useAppStore((s) => s.rules);
  const addField = useAppStore((s) => s.addField);
  const updateField = useAppStore((s) => s.updateField);
  const deleteField = useAppStore((s) => s.deleteField);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<BusinessField>(BLANK);
  const [optionsText, setOptionsText] = useState("");
  const [itemOptionsText, setItemOptionsText] = useState("");
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<BusinessField | null>(null);

  const [search, setSearch] = useState("");
  const [industryFilters, setIndustryFilters] = useState<string[]>([]);
  const [entityFilters, setEntityFilters] = useState<string[]>([]);
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const importRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fieldCatalog.filter((f) => {
      if (q && !`${f.label} ${f.key} ${f.businessName ?? ""}`.toLowerCase().includes(q)) return false;
      if (industryFilters.length && !industryFilters.includes(f.domain)) return false;
      if (entityFilters.length && !entityFilters.includes(f.entity ?? "")) return false;
      if (typeFilters.length && !typeFilters.includes(f.type)) return false;
      if (statusFilters.length && !statusFilters.includes(f.status ?? "Active")) return false;
      return true;
    });
  }, [fieldCatalog, search, industryFilters, entityFilters, typeFilters, statusFilters]);

  const startCreate = () => {
    setEditingKey(null);
    setDraft(BLANK);
    setOptionsText("");
    setItemOptionsText("");
    setOpen(true);
  };
  const startEdit = (field: BusinessField) => {
    setEditingKey(field.key);
    setDraft(field);
    setOptionsText((field.options ?? []).join(", "));
    setItemOptionsText((field.itemOptions ?? []).join(", "));
    setOpen(true);
  };

  const save = () => {
    if (!draft.label.trim()) {
      toast.error("Field label is required.");
      return;
    }
    if (draft.type === "list" && !draft.itemType) {
      toast.error("Pick the item type for this list field.");
      return;
    }
    const key = editingKey ?? draft.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (!editingKey && fieldCatalog.some((f) => f.key === key)) {
      toast.error(`A field with key "${key}" already exists.`);
      return;
    }
    const options = draft.type === "enum" ? optionsText.split(",").map((o) => o.trim()).filter(Boolean) : undefined;
    const itemOptions =
      draft.type === "list" && draft.itemType === "enum"
        ? itemOptionsText.split(",").map((o) => o.trim()).filter(Boolean)
        : undefined;
    const field: BusinessField = {
      ...draft,
      key,
      options,
      itemType: draft.type === "list" ? draft.itemType : undefined,
      itemOptions: draft.type === "list" ? itemOptions : undefined,
      status: draft.status ?? "Active",
    };

    if (editingKey) {
      updateField(editingKey, field);
      toast.success(`"${field.label}" updated.`);
    } else {
      addField(field);
      toast.success(`"${field.label}" added to the catalog — now selectable in Rule Builder & Simulator.`);
    }
    setOpen(false);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteField(pendingDelete.key);
    toast.info(`"${pendingDelete.label}" removed.`);
    setPendingDelete(null);
  };

  const exportCsv = () => {
    downloadCsv(
      "field_catalog",
      filtered.map((f) => ({
        Key: f.key,
        Label: f.label,
        "Business Name": f.businessName ?? "",
        Industry: f.domain,
        Entity: f.entity ?? "",
        Type: f.type,
        "Item Type": f.itemType ?? "",
        Unit: f.unit ?? "",
        "Source System": f.sourceSystem ?? "",
        Status: f.status ?? "Active",
        "Rule Usage": fieldUsage(f.key, rules).count,
      }))
    );
    toast.success(`Exported ${filtered.length} field${filtered.length === 1 ? "" : "s"}.`);
  };

  const handleImportFile = (file: File) => {
    file.text().then((text) => {
      const rows = parseCsv(text);
      let added = 0;
      let updated = 0;
      const skipped: string[] = [];
      for (const [i, row] of rows.entries()) {
        const key = row.Key?.trim();
        const label = row.Label?.trim();
        const domain = row.Industry?.trim();
        const type = row.Type?.trim() as FieldDataType;
        if (!key || !label || !domain || !FIELD_TYPES.includes(type)) {
          skipped.push(`Row ${i + 2}: missing/invalid Key, Label, Industry or Type`);
          continue;
        }
        const field: BusinessField = {
          key,
          label,
          businessName: row["Business Name"] || undefined,
          domain,
          entity: row.Entity || undefined,
          type,
          itemType: (row["Item Type"] as FieldItemType) || undefined,
          unit: row.Unit || undefined,
          sourceSystem: row["Source System"] || undefined,
          status: (row.Status as BusinessField["status"]) || "Active",
        };
        if (fieldCatalog.some((f) => f.key === key)) {
          updateField(key, field);
          updated++;
        } else {
          addField(field);
          added++;
        }
      }
      toast.success(`Import complete: ${added} added, ${updated} updated${skipped.length ? `, ${skipped.length} skipped` : ""}.`, {
        description: skipped.length ? skipped.slice(0, 5).join(" · ") + (skipped.length > 5 ? " …" : "") : undefined,
      });
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          The business field vocabulary that drives every condition dropdown in Rule Builder and every dynamic input in the Simulator.
        </p>
        <div className="flex shrink-0 gap-1.5">
          <input
            ref={importRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = "";
            }}
          />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => importRef.current?.click()}>
            <Upload className="size-3.5" /> Import
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv}>
            <Download className="size-3.5" /> Export
          </Button>
          <Button size="sm" className="gap-1.5" onClick={startCreate}>
            <Plus className="size-3.5" /> Add Field
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by label, key or business name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-64 pl-8"
          />
        </div>
        <MultiSelect
          label="Industry"
          options={industries.map((i) => ({ value: i.id, label: i.name }))}
          selected={industryFilters}
          onChange={setIndustryFilters}
        />
        <MultiSelect
          label="Entity"
          options={entities.map((e) => ({ value: e.id, label: e.name }))}
          selected={entityFilters}
          onChange={setEntityFilters}
        />
        <MultiSelect
          label="Type"
          options={FIELD_TYPES.map((t) => ({ value: t, label: t }))}
          selected={typeFilters}
          onChange={setTypeFilters}
        />
        <MultiSelect
          label="Status"
          options={STATUSES.map((s) => ({ value: s, label: s }))}
          selected={statusFilters}
          onChange={setStatusFilters}
        />
        {(search !== "" || industryFilters.length > 0 || entityFilters.length > 0 || typeFilters.length > 0 || statusFilters.length > 0) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-muted-foreground"
            onClick={() => {
              setSearch("");
              setIndustryFilters([]);
              setEntityFilters([]);
              setTypeFilters([]);
              setStatusFilters([]);
            }}
          >
            Clear all
          </Button>
        )}
      </div>

      <div className="max-h-125 overflow-auto rounded-xl border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow className="hover:bg-transparent">
              <TableHead>Label</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Used By</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((f) => {
              const usage = fieldUsage(f.key, rules);
              return (
                <TableRow key={f.key}>
                  <TableCell className="font-medium">
                    {f.label}
                    {f.computed && <Badge variant="secondary" className="ml-2 text-[10px]">computed</Badge>}
                    {f.businessName && <p className="text-[10px] font-normal text-muted-foreground">{f.businessName}</p>}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{f.key}</TableCell>
                  <TableCell className="text-xs">{f.domain === "Common" ? "Common (all)" : industries.find((i) => i.id === f.domain)?.name ?? f.domain}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{entities.find((e) => e.id === f.entity)?.name ?? "—"}</TableCell>
                  <TableCell className="text-xs capitalize">{f.type === "list" ? `list of ${f.itemType ?? "…"}` : f.type}</TableCell>
                  <TableCell className={`text-xs font-medium ${STATUS_TONE[f.status ?? "Active"]}`}>{f.status ?? "Active"}</TableCell>
                  <TableCell>
                    {usage.count === 0 ? (
                      <span className="text-xs text-muted-foreground">Unused</span>
                    ) : (
                      <Popover>
                        <PopoverTrigger
                          render={
                            <button className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                              <Link2 className="size-3" /> {usage.count} rule{usage.count === 1 ? "" : "s"}
                            </button>
                          }
                        />
                        <PopoverContent className="w-56 p-2">
                          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Where used</p>
                          <div className="flex flex-col gap-0.5">
                            {usage.ruleIds.slice(0, 8).map((id) => {
                              const rule = rules.find((r) => r.id === id);
                              return (
                                <Link
                                  key={id}
                                  href={`/repository?search=${id}`}
                                  className="truncate rounded-md px-1.5 py-1 text-xs hover:bg-muted"
                                >
                                  <span className="font-mono text-[10px] text-muted-foreground">{id}</span> {rule?.name}
                                </Link>
                              );
                            })}
                            {usage.count > 8 && (
                              <p className="px-1.5 py-1 text-[10px] text-muted-foreground">+{usage.count - 8} more</p>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon-sm" onClick={() => startEdit(f)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={() => setPendingDelete(f)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-xs text-muted-foreground">
                  No fields match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingKey ? "Edit Field" : "Add Business Field"}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>Label *</Label>
              <Input
                value={draft.label}
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                placeholder="e.g. Policy Term (Months)"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Business Name</Label>
              <Input
                value={draft.businessName ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, businessName: e.target.value || undefined }))}
                placeholder="How business users refer to this field"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Industry *</Label>
                <Select value={draft.domain} onValueChange={(v) => setDraft((d) => ({ ...d, domain: v ?? "Common" }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Common">Common (all industries)</SelectItem>
                    {industries.map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Entity</Label>
                <Select
                  items={{ "": "None", ...Object.fromEntries(entities.map((e) => [e.id, e.name])) }}
                  value={draft.entity ?? ""}
                  onValueChange={(v) => setDraft((d) => ({ ...d, entity: v ? (v as string) : undefined }))}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {entities.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data Type *</Label>
                <Select value={draft.type} onValueChange={(v) => setDraft((d) => ({ ...d, type: (v ?? "string") as FieldDataType }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={draft.status ?? "Active"} onValueChange={(v) => setDraft((d) => ({ ...d, status: (v ?? "Active") as BusinessField["status"] }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {draft.type === "enum" && (
              <div className="space-y-1.5">
                <Label>Options (comma-separated)</Label>
                <Input value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder="Low Risk, Medium Risk, High Risk" />
              </div>
            )}
            {draft.type === "list" && (
              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-[11px] text-muted-foreground">
                  A list field holds multiple values (e.g. each dependent&apos;s age, or each collateral item&apos;s
                  value) — the Rule Builder can test it with ANY / ALL / NONE / COUNT conditions instead of a single
                  value.
                </p>
                <div className="space-y-1.5">
                  <Label>Item Type *</Label>
                  <Select
                    value={draft.itemType}
                    onValueChange={(v) => setDraft((d) => ({ ...d, itemType: (v ?? "number") as FieldItemType }))}
                  >
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {ITEM_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {draft.itemType === "enum" && (
                  <div className="space-y-1.5">
                    <Label>Item Options (comma-separated)</Label>
                    <Input value={itemOptionsText} onChange={(e) => setItemOptionsText(e.target.value)} placeholder="Gold, Vehicle, Property" />
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Unit (optional)</Label>
                <Input value={draft.unit ?? ""} onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value || undefined }))} placeholder="₹, %, years..." />
              </div>
              <div className="space-y-1.5">
                <Label>Source System</Label>
                <Input value={draft.sourceSystem ?? ""} onChange={(e) => setDraft((d) => ({ ...d, sourceSystem: e.target.value || undefined }))} placeholder="e.g. Core Banking" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={save}>{editingKey ? "Save Changes" : "Add Field"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" /> Delete &quot;{pendingDelete?.label}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && fieldUsage(pendingDelete.key, rules).count > 0
                ? `${fieldUsage(pendingDelete.key, rules).count} rule(s) currently reference this field. Removing it will leave those conditions pointing at a missing field.`
                : "This field isn't referenced by any rule yet. It will no longer appear in Rule Builder or Simulator."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
