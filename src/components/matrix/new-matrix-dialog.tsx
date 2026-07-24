"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { DecisionMatrix, MatrixColumn, Domain } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";

type MatrixColumnType = MatrixColumn["type"];

const COLUMN_TYPES: { value: MatrixColumnType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "percent", label: "Percent" },
  { value: "currency", label: "Currency" },
  { value: "select", label: "Select (fixed options)" },
];

const slugify = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

interface DraftColumn {
  label: string;
  type: MatrixColumnType;
  options: string;
}

const blankColumn = (): DraftColumn => ({ label: "", type: "number", options: "" });

// Every existing DecisionMatrix was pre-seeded — there was no way to stand
// up matrix-driven pricing for a new industry without a code change (audit
// finding B29). Builds an empty matrix (name/description/domain + a column
// shape); rows are added afterward via the existing MatrixGrid "Add Row" flow.
export function NewMatrixDialog({ defaultDomain }: { defaultDomain: string }) {
  const industries = useAppStore((s) => s.industries);
  const addMatrix = useAppStore((s) => s.addMatrix);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState<Domain>(defaultDomain);
  const [columns, setColumns] = useState<DraftColumn[]>([blankColumn(), blankColumn()]);

  const reset = () => {
    setName("");
    setDescription("");
    setDomain(defaultDomain);
    setColumns([blankColumn(), blankColumn()]);
  };

  const updateColumn = (i: number, patch: Partial<DraftColumn>) => {
    setColumns((cols) => cols.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  };

  const save = () => {
    if (!name.trim()) {
      toast.error("Matrix name is required.");
      return;
    }
    const validColumns = columns.filter((c) => c.label.trim());
    if (validColumns.length === 0) {
      toast.error("Add at least one column.");
      return;
    }
    const matrixColumns: MatrixColumn[] = validColumns.map((c) => ({
      key: slugify(c.label),
      label: c.label.trim(),
      type: c.type,
      options: c.type === "select" ? c.options.split(",").map((o) => o.trim()).filter(Boolean) : undefined,
    }));
    const matrix: DecisionMatrix = {
      id: `MTX-${slugify(domain)}-${Date.now()}`,
      domain,
      name: name.trim(),
      description: description.trim(),
      columns: matrixColumns,
      rows: [],
      updatedAt: new Date().toISOString(),
    };
    addMatrix(matrix);
    toast.success(`"${matrix.name}" created — add rows to start populating it.`);
    setOpen(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="size-3.5" /> New Matrix
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Decision Matrix</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Credit Card APR Slabs" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <Label>Domain *</Label>
              <Select value={domain} onValueChange={(v) => setDomain((v as string) ?? domain)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select domain" /></SelectTrigger>
                <SelectContent>
                  {industries.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this matrix prices" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Columns *</Label>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-sm" onClick={() => setColumns((c) => [...c, blankColumn()])}>
                <Plus className="size-3.5" /> Add Column
              </Button>
            </div>
            <div className="space-y-2">
              {columns.map((col, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Input
                    value={col.label}
                    onChange={(e) => updateColumn(i, { label: e.target.value })}
                    placeholder="Column label"
                    className="h-8 flex-1 text-sm"
                  />
                  <Select value={col.type} onValueChange={(v) => updateColumn(i, { type: (v as MatrixColumnType) ?? col.type })}>
                    <SelectTrigger size="sm" className="h-8 w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COLUMN_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {col.type === "select" && (
                    <Input
                      value={col.options}
                      onChange={(e) => updateColumn(i, { options: e.target.value })}
                      placeholder="opt1, opt2, ..."
                      className="h-8 w-32 text-sm"
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setColumns((c) => c.filter((_, idx) => idx !== i))}
                    disabled={columns.length <= 1}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={save}>Create Matrix</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
