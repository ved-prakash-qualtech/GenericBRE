"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Industry } from "@/lib/types";
import { INDUSTRY_ICON_OPTIONS, iconForIndustry } from "@/lib/industries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const BLANK: Industry = { id: "", name: "", icon: "Building2", description: "" };

export function IndustriesManager() {
  const industries = useAppStore((s) => s.industries);
  const rules = useAppStore((s) => s.rules);
  const addIndustry = useAppStore((s) => s.addIndustry);
  const updateIndustry = useAppStore((s) => s.updateIndustry);
  const deleteIndustry = useAppStore((s) => s.deleteIndustry);

  const [editing, setEditing] = useState<Industry | null>(null);
  const [draft, setDraft] = useState<Industry>(BLANK);
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Industry | null>(null);

  const startCreate = () => {
    setEditing(null);
    setDraft(BLANK);
    setOpen(true);
  };
  const startEdit = (industry: Industry) => {
    setEditing(industry);
    setDraft(industry);
    setOpen(true);
  };

  const save = () => {
    if (!draft.name.trim()) {
      toast.error("Domain name is required.");
      return;
    }
    if (editing) {
      updateIndustry(editing.id, draft);
      toast.success(`"${draft.name}" updated.`);
    } else {
      const id = draft.name.trim().replace(/\s+/g, "-");
      if (industries.some((i) => i.id === id)) {
        toast.error(`A domain with id "${id}" already exists.`);
        return;
      }
      addIndustry({ ...draft, id });
      toast.success(`"${draft.name}" added — available immediately across Rule Builder, Repository, Matrix & Simulator.`);
    }
    setOpen(false);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteIndustry(pendingDelete.id);
    toast.info(`"${pendingDelete.name}" removed.`);
    setPendingDelete(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Button size="sm" className="shrink-0 gap-1.5" onClick={startCreate}>
          <Plus className="size-3.5" /> Add Domain
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {industries.map((ind) => {
          const Icon = iconForIndustry(ind.icon);
          const ruleCount = rules.filter((r) => r.domain === ind.id).length;
          return (
            <div key={ind.id} className="flex items-start gap-3 rounded-xl border bg-card p-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{ind.name}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{ind.description || "No description"}</p>
                <p className="mt-1 text-[10px] font-medium text-muted-foreground/70">{ruleCount} rule{ruleCount === 1 ? "" : "s"}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => startEdit(ind)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={() => setPendingDelete(ind)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
        {industries.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
            No domains configured yet. Add one to get started.
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Domain" : "Add Domain"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Healthcare, Retail, Manufacturing..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <Select value={draft.icon} onValueChange={(v) => setDraft((d) => ({ ...d, icon: v ?? "Building2" }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INDUSTRY_ICON_OPTIONS.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={draft.description ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="Shown on the Dashboard's demo scenario launcher"
                className="min-h-16"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={save}>{editing ? "Save Changes" : "Add Domain"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove &quot;{pendingDelete?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing rules, matrices and simulations already tagged with this domain keep their reference, but it will
              no longer appear as a selectable option anywhere in the app.
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
