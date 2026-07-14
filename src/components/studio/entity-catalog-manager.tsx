"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Boxes } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Entity } from "@/lib/types";
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

const BLANK: Entity = { id: "", name: "", description: "", industry: undefined };

export function EntityCatalogManager() {
  const entities = useAppStore((s) => s.entities);
  const industries = useAppStore((s) => s.industries);
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const addEntity = useAppStore((s) => s.addEntity);
  const updateEntity = useAppStore((s) => s.updateEntity);
  const deleteEntity = useAppStore((s) => s.deleteEntity);

  const [editing, setEditing] = useState<Entity | null>(null);
  const [draft, setDraft] = useState<Entity>(BLANK);
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Entity | null>(null);

  const startCreate = () => {
    setEditing(null);
    setDraft(BLANK);
    setOpen(true);
  };
  const startEdit = (entity: Entity) => {
    setEditing(entity);
    setDraft(entity);
    setOpen(true);
  };

  const save = () => {
    if (!draft.name.trim()) {
      toast.error("Entity name is required.");
      return;
    }
    if (editing) {
      updateEntity(editing.id, draft);
      toast.success(`"${draft.name}" updated.`);
    } else {
      const id = draft.name.trim().toLowerCase().replace(/\s+/g, "-");
      if (entities.some((e) => e.id === id)) {
        toast.error(`An entity with id "${id}" already exists.`);
        return;
      }
      addEntity({ ...draft, id });
      toast.success(`"${draft.name}" added — available in the Field Catalog's Entity picker.`);
    }
    setOpen(false);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteEntity(pendingDelete.id);
    toast.info(`"${pendingDelete.name}" removed.`);
    setPendingDelete(null);
  };

  const fieldCount = (entityId: string) => fieldCatalog.filter((f) => f.entity === entityId).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Business entities (Applicant, Loan Account, Collateral...) that Field Catalog entries and rules attach to.
        </p>
        <Button size="sm" className="shrink-0 gap-1.5" onClick={startCreate}>
          <Plus className="size-3.5" /> Add Entity
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {entities.map((ent) => (
          <div key={ent.id} className="flex items-start gap-3 rounded-xl border bg-card p-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Boxes className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{ent.name}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{ent.description || "No description"}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                {ent.industry && <Badge variant="secondary" className="text-[10px]">{industries.find((i) => i.id === ent.industry)?.name ?? ent.industry}</Badge>}
                <span className="text-[10px] font-medium text-muted-foreground/70">
                  {fieldCount(ent.id)} field{fieldCount(ent.id) === 1 ? "" : "s"}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => startEdit(ent)}>
                <Pencil className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={() => setPendingDelete(ent)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {entities.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
            No entities configured yet. Add one to get started.
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Entity" : "Add Entity"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Applicant, Loan Account, Collateral..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Domain</Label>
              <Select
                items={{ "": "Shared across all domains", ...Object.fromEntries(industries.map((i) => [i.id, i.name])) }}
                value={draft.industry ?? ""}
                onValueChange={(v) => setDraft((d) => ({ ...d, industry: v ? (v as string) : undefined }))}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Shared across all domains</SelectItem>
                  {industries.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={draft.description ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="What this entity represents"
                className="min-h-16"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={save}>{editing ? "Save Changes" : "Add Entity"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove &quot;{pendingDelete?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Field Catalog entries already tagged with this entity keep their reference, but it will no longer appear as a
              selectable option.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
