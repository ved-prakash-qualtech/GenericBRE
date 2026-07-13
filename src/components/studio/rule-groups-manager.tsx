"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Layers } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { RuleGroup } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const BLANK: RuleGroup = { id: "", name: "", description: "" };

export function RuleGroupsManager() {
  const ruleGroups = useAppStore((s) => s.ruleGroups);
  const rules = useAppStore((s) => s.rules);
  const addRuleGroup = useAppStore((s) => s.addRuleGroup);
  const updateRuleGroup = useAppStore((s) => s.updateRuleGroup);
  const deleteRuleGroup = useAppStore((s) => s.deleteRuleGroup);

  const [editing, setEditing] = useState<RuleGroup | null>(null);
  const [draft, setDraft] = useState<RuleGroup>(BLANK);
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<RuleGroup | null>(null);

  const startCreate = () => {
    setEditing(null);
    setDraft(BLANK);
    setOpen(true);
  };
  const startEdit = (group: RuleGroup) => {
    setEditing(group);
    setDraft(group);
    setOpen(true);
  };

  const save = () => {
    if (!draft.name.trim()) {
      toast.error("Rule group name is required.");
      return;
    }
    if (editing) {
      updateRuleGroup(editing.id, draft);
      toast.success(`"${draft.name}" updated.`);
    } else {
      const id = draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (ruleGroups.some((g) => g.id === id)) {
        toast.error(`A rule group with id "${id}" already exists.`);
        return;
      }
      addRuleGroup({ ...draft, id });
      toast.success(`"${draft.name}" added — available immediately in Rule Builder & Repository filters.`);
    }
    setOpen(false);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteRuleGroup(pendingDelete.id);
    toast.info(`"${pendingDelete.name}" removed.`);
    setPendingDelete(null);
  };

  const ruleCount = (id: string) => rules.filter((r) => r.groupId === id).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Named, reusable rule collections — purely organizational, independent of Category (e.g. group rules by a
          specific product launch or regulatory change).
        </p>
        <Button size="sm" className="shrink-0 gap-1.5" onClick={startCreate}>
          <Plus className="size-3.5" /> Add Rule Group
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {ruleGroups.map((g) => (
          <div key={g.id} className="flex items-start gap-3 rounded-xl border bg-card p-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{g.name}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{g.description || "No description"}</p>
              <p className="mt-1 text-[10px] font-medium text-muted-foreground/70">
                {ruleCount(g.id)} rule{ruleCount(g.id) === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => startEdit(g)}>
                <Pencil className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={() => setPendingDelete(g)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {ruleGroups.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
            No rule groups configured yet. Add one to get started.
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Rule Group" : "Add Rule Group"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Q3 Pricing Refresh"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={draft.description ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="What ties these rules together"
                className="min-h-16"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={save}>{editing ? "Save Changes" : "Add Rule Group"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove &quot;{pendingDelete?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing rules already tagged with this group keep their reference, but it will no longer appear as a
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
