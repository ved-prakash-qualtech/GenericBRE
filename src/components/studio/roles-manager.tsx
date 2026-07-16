"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Capability, Role } from "@/lib/types";
import { ALL_CAPABILITIES, capabilityLabel } from "@/lib/capabilities";
import { ROLE_ICON_OPTIONS, iconForRole } from "@/lib/role-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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

const ALL_CAPABILITIES: Capability[] = [
  "rule.view",
  "rule.create",
  "rule.edit",
  "rule.delete",
  "rule.simulate",
  "rule.publish",
  "system.manage",
  "notifyx.view",
  "notifyx.create",
  "notifyx.edit",
  "notifyx.toggle",
];

// Display text only — the underlying Capability id ("rule.publish") and every
// hasCapability(...) check elsewhere stay unchanged.
const CAPABILITY_LABELS: Partial<Record<Capability, string>> = {
  "rule.publish": "rule.approve",
};
const capabilityLabel = (cap: Capability) => CAPABILITY_LABELS[cap] ?? cap;

const BLANK: Role = { id: "", name: "", personaName: "", icon: "Briefcase", capabilities: ["rule.view"] };

export function RolesManager() {
  const roles = useAppStore((s) => s.roles);
  const addRole = useAppStore((s) => s.addRole);
  const updateRole = useAppStore((s) => s.updateRole);
  const deleteRole = useAppStore((s) => s.deleteRole);

  const [editing, setEditing] = useState<Role | null>(null);
  const [draft, setDraft] = useState<Role>(BLANK);
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Role | null>(null);

  const startCreate = () => {
    setEditing(null);
    setDraft(BLANK);
    setOpen(true);
  };
  const startEdit = (role: Role) => {
    setEditing(role);
    setDraft(role);
    setOpen(true);
  };

  const toggleCapability = (cap: Capability) => {
    setDraft((d) => ({
      ...d,
      capabilities: d.capabilities.includes(cap) ? d.capabilities.filter((c) => c !== cap) : [...d.capabilities, cap],
    }));
  };

  const save = () => {
    if (!draft.name.trim()) {
      toast.error("Role name is required.");
      return;
    }
    if (!draft.personaName.trim()) {
      toast.error("Persona name is required — shown on the Demo Mode role picker.");
      return;
    }
    if (editing) {
      updateRole(editing.id, draft);
      toast.success(`"${draft.name}" updated.`);
    } else {
      const id = draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (roles.some((r) => r.id === id)) {
        toast.error(`A role with id "${id}" already exists.`);
        return;
      }
      addRole({ ...draft, id });
      toast.success(`"${draft.name}" added — available immediately in Demo Mode and every capability check.`);
    }
    setOpen(false);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteRole(pendingDelete.id);
    toast.info(`"${pendingDelete.name}" removed.`);
    setPendingDelete(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Every role and its demo persona shown on the &quot;Switch Role&quot; picker — add one here and it appears immediately, no code changes.
        </p>
        <Button size="sm" className="shrink-0 gap-1.5" onClick={startCreate}>
          <Plus className="size-3.5" /> Add User
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => {
          const Icon = iconForRole(role.icon);
          return (
            <div key={role.id} className="flex items-start gap-3 rounded-xl border bg-card p-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{role.personaName}</p>
                <p className="truncate text-[11px] text-muted-foreground">{role.name}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {role.capabilities.map((c) => (
                    <Badge key={c} variant="outline" className="text-[9px]">{capabilityLabel(c)}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => startEdit(role)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={() => setPendingDelete(role)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
        {roles.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
            No roles configured yet. Add one to get started.
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role Name *</Label>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. Compliance Officer"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Persona Name *</Label>
                <Input
                  value={draft.personaName}
                  onChange={(e) => setDraft((d) => ({ ...d, personaName: e.target.value }))}
                  placeholder="e.g. Neha Kapoor"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <Select value={draft.icon} onValueChange={(v) => setDraft((d) => ({ ...d, icon: v ?? "Briefcase" }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_ICON_OPTIONS.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Capabilities</Label>
              <div className="grid grid-cols-2 gap-2 rounded-lg border p-2.5">
                {ALL_CAPABILITIES.map((cap) => (
                  <label key={cap} className="flex items-center gap-2 text-xs">
                    <Checkbox checked={draft.capabilities.includes(cap)} onCheckedChange={() => toggleCapability(cap)} />
                    {capabilityLabel(cap)}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={save}>{editing ? "Save Changes" : "Add User"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove &quot;{pendingDelete?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              It will no longer appear on the Demo Mode role picker or as a selectable role anywhere in the app.
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
