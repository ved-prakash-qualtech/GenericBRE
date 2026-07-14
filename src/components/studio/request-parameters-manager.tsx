"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, SlidersHorizontal, Lock } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { RequestParameterDef } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const BLANK: RequestParameterDef = { id: "", label: "", sourceKey: "", builtIn: false };

export function RequestParametersManager() {
  const defs = useAppStore((s) => s.requestParameterDefs);
  const addRequestParameterDef = useAppStore((s) => s.addRequestParameterDef);
  const updateRequestParameterDef = useAppStore((s) => s.updateRequestParameterDef);
  const deleteRequestParameterDef = useAppStore((s) => s.deleteRequestParameterDef);

  const [editing, setEditing] = useState<RequestParameterDef | null>(null);
  const [draft, setDraft] = useState<RequestParameterDef>(BLANK);
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<RequestParameterDef | null>(null);

  const startCreate = () => {
    setEditing(null);
    setDraft(BLANK);
    setOpen(true);
  };
  const startEdit = (def: RequestParameterDef) => {
    setEditing(def);
    setDraft(def);
    setOpen(true);
  };

  const save = () => {
    if (!draft.label.trim() || !draft.sourceKey.trim()) {
      toast.error("Label and source key are both required.");
      return;
    }
    if (editing) {
      updateRequestParameterDef(editing.id, draft);
      toast.success(`"${draft.label}" updated.`);
    } else {
      const id = draft.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (defs.some((d) => d.id === id)) {
        toast.error(`A request parameter with id "${id}" already exists.`);
        return;
      }
      addRequestParameterDef({ ...draft, id, builtIn: false });
      toast.success(`"${draft.label}" added — available as a mapping condition in Rule Set Mappings.`);
    }
    setOpen(false);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteRequestParameterDef(pendingDelete.id);
    toast.info(`"${pendingDelete.label}" removed.`);
    setPendingDelete(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Request dimensions a mapping can key off, beyond Industry (which already has its own catalog). Each maps to a
          key expected on the incoming request payload.
        </p>
        <Button size="sm" className="shrink-0 gap-1.5" onClick={startCreate}>
          <Plus className="size-3.5" /> Add Parameter
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {defs.map((def) => (
          <div key={def.id} className="flex items-start gap-3 rounded-xl border bg-card p-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <SlidersHorizontal className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-semibold">{def.label}</p>
                {def.builtIn && <Lock className="size-3 shrink-0 text-muted-foreground" />}
              </div>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{def.sourceKey}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => startEdit(def)}>
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setPendingDelete(def)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {defs.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
            No custom request parameters configured yet.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-dashed p-3 text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground">Industry</span> is always available as a mapping condition —
        it&apos;s configured separately under Access → Industries.
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Request Parameter" : "Add Request Parameter"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Label *</Label>
              <Input
                value={draft.label}
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                placeholder="e.g. Product, Channel, Loyalty Tier..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Request Source Key *</Label>
              <Input
                value={draft.sourceKey}
                onChange={(e) => setDraft((d) => ({ ...d, sourceKey: e.target.value }))}
                placeholder="e.g. product"
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">The JSON key expected on the incoming request payload.</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={save}>{editing ? "Save Changes" : "Add Parameter"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove &quot;{pendingDelete?.label}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Any Rule Set Mapping condition already using this parameter keeps its saved value, but it will no longer
              appear as a selectable dimension.
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
