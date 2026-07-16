"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Tag } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { RuleCategory } from "@/lib/types";
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

const BLANK: RuleCategory = { id: "", name: "", description: "", industry: undefined };

export function RuleCategoryManager() {
  const ruleCategories = useAppStore((s) => s.ruleCategories);
  const industries = useAppStore((s) => s.industries);
  const rules = useAppStore((s) => s.rules);
  const addRuleCategory = useAppStore((s) => s.addRuleCategory);
  const updateRuleCategory = useAppStore((s) => s.updateRuleCategory);
  const deleteRuleCategory = useAppStore((s) => s.deleteRuleCategory);

  const [editing, setEditing] = useState<RuleCategory | null>(null);
  const [draft, setDraft] = useState<RuleCategory>(BLANK);
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<RuleCategory | null>(null);

  const startCreate = () => {
    setEditing(null);
    setDraft(BLANK);
    setOpen(true);
  };
  const startEdit = (category: RuleCategory) => {
    setEditing(category);
    setDraft(category);
    setOpen(true);
  };

  const save = () => {
    if (!draft.name.trim()) {
      toast.error("Category name is required.");
      return;
    }
    if (editing) {
      updateRuleCategory(editing.id, draft);
      toast.success(`"${draft.name}" updated.`);
    } else {
      const id = draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (ruleCategories.some((c) => c.id === id)) {
        toast.error(`A category with id "${id}" already exists.`);
        return;
      }
      addRuleCategory({ ...draft, id });
      toast.success(`"${draft.name}" added — available immediately in Rule Builder & Repository filters.`);
    }
    setOpen(false);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteRuleCategory(pendingDelete.id);
    toast.info(`"${pendingDelete.name}" removed.`);
    setPendingDelete(null);
  };

  const ruleCount = (name: string) => rules.filter((r) => r.category === name).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Rule categories available in the Rule Builder and Repository filters (e.g. Eligibility, Pricing, Compliance).
        </p>
        <Button size="sm" className="shrink-0 gap-1.5" onClick={startCreate}>
          <Plus className="size-3.5" /> Add Category
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {ruleCategories.map((cat) => (
          <div key={cat.id} className="flex items-start gap-3 rounded-xl border bg-card p-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Tag className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{cat.name}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{cat.description || "No description"}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                {cat.industry && <Badge variant="secondary" className="text-[10px]">{cat.industry}</Badge>}
                <span className="text-[10px] font-medium text-muted-foreground/70">
                  {ruleCount(cat.name)} rule{ruleCount(cat.name) === 1 ? "" : "s"}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => startEdit(cat)}>
                <Pencil className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={() => setPendingDelete(cat)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {ruleCategories.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
            No categories configured yet. Add one to get started.
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Eligibility, Pricing, Compliance..."
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
                placeholder="What kind of rules belong in this category"
                className="min-h-16"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={save}>{editing ? "Save Changes" : "Add Category"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove &quot;{pendingDelete?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing rules already tagged with this category keep their reference, but it will no longer appear as a
              selectable option in Rule Builder or Repository filters.
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
