"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { BusinessField, FieldDataType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

const FIELD_TYPES: FieldDataType[] = ["number", "string", "boolean", "enum", "currency"];

const BLANK: BusinessField = { key: "", label: "", domain: "Common", type: "string" };

export function FieldCatalogManager() {
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const industries = useAppStore((s) => s.industries);
  const addField = useAppStore((s) => s.addField);
  const updateField = useAppStore((s) => s.updateField);
  const deleteField = useAppStore((s) => s.deleteField);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<BusinessField>(BLANK);
  const [optionsText, setOptionsText] = useState("");
  const [open, setOpen] = useState(false);

  const startCreate = () => {
    setEditingKey(null);
    setDraft(BLANK);
    setOptionsText("");
    setOpen(true);
  };
  const startEdit = (field: BusinessField) => {
    setEditingKey(field.key);
    setDraft(field);
    setOptionsText((field.options ?? []).join(", "));
    setOpen(true);
  };

  const save = () => {
    if (!draft.label.trim()) {
      toast.error("Field label is required.");
      return;
    }
    const key = editingKey ?? draft.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (!editingKey && fieldCatalog.some((f) => f.key === key)) {
      toast.error(`A field with key "${key}" already exists.`);
      return;
    }
    const options = draft.type === "enum" ? optionsText.split(",").map((o) => o.trim()).filter(Boolean) : undefined;
    const field: BusinessField = { ...draft, key, options };

    if (editingKey) {
      updateField(editingKey, field);
      toast.success(`"${field.label}" updated.`);
    } else {
      addField(field);
      toast.success(`"${field.label}" added to the catalog — now selectable in Rule Builder & Simulator.`);
    }
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          The business field vocabulary that drives every condition dropdown in Rule Builder and every dynamic input in the Simulator.
        </p>
        <Button size="sm" className="shrink-0 gap-1.5" onClick={startCreate}>
          <Plus className="size-3.5" /> Add Field
        </Button>
      </div>

      <div className="max-h-100 overflow-auto rounded-xl border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow className="hover:bg-transparent">
              <TableHead>Label</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fieldCatalog.map((f) => (
              <TableRow key={f.key}>
                <TableCell className="font-medium">
                  {f.label}
                  {f.computed && <Badge variant="secondary" className="ml-2 text-[10px]">computed</Badge>}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{f.key}</TableCell>
                <TableCell className="text-xs">{f.domain === "Common" ? "Common (all)" : industries.find((i) => i.id === f.domain)?.name ?? f.domain}</TableCell>
                <TableCell className="text-xs capitalize">{f.type}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{f.unit ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="icon-sm" onClick={() => startEdit(f)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={() => { deleteField(f.key); toast.info(`"${f.label}" removed.`); }}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingKey ? "Edit Field" : "Add Business Field"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Label *</Label>
              <Input
                value={draft.label}
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                placeholder="e.g. Policy Term (Months)"
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
            </div>
            {draft.type === "enum" && (
              <div className="space-y-1.5">
                <Label>Options (comma-separated)</Label>
                <Input value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder="Low Risk, Medium Risk, High Risk" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Unit (optional)</Label>
              <Input value={draft.unit ?? ""} onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value || undefined }))} placeholder="₹, %, years..." />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={save}>{editingKey ? "Save Changes" : "Add Field"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
