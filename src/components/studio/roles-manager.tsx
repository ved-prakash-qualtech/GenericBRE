"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Search, ShieldCheck } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Capability, Role } from "@/lib/types";
import { ALL_CAPABILITIES, capabilityLabel } from "@/lib/capabilities";
import { ROLE_ICON_OPTIONS, iconForRole } from "@/lib/role-icons";
import { cn } from "@/lib/utils";
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
  const [search, setSearch] = useState("");

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.personaName.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.capabilities.some((c) => c.toLowerCase().includes(q))
    );
  }, [roles, search]);

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
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search roles or personas..."
              className="h-8 pl-8 text-xs"
            />
          </div>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {filteredRoles.length} Roles Configured
          </span>
        </div>

        <Button size="sm" className="gap-1.5 font-medium shadow-xs" onClick={startCreate}>
          <Plus className="size-3.5" /> Add Role
        </Button>
      </div>

      {/* Roles Cards Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredRoles.map((role) => {
          const Icon = iconForRole(role.icon);
          return (
            <div
              key={role.id}
              className="group relative flex flex-col justify-between rounded-xl border bg-card p-3.5 transition-all duration-150 hover:border-primary/40 hover:shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-2xs">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold tracking-tight text-foreground">{role.personaName}</p>
                      <p className="truncate text-[11px] font-medium text-muted-foreground">{role.name}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5 opacity-80 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="icon-sm" className="size-7" onClick={() => startEdit(role)} title="Edit Role">
                      <Pencil className="size-3 text-muted-foreground hover:text-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-7"
                      onClick={() => setPendingDelete(role)}
                      title="Delete Role"
                    >
                      <Trash2 className="size-3 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 space-y-2 border-t pt-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                    <ShieldCheck className="size-3 text-primary" />
                    {role.capabilities.length} capabilit{role.capabilities.length === 1 ? "y" : "ies"}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/60">{role.id}</span>
                </div>

                <div className="max-h-[76px] overflow-y-auto pr-1 flex flex-wrap items-center gap-1.5 scrollbar-thin">
                  {role.capabilities.map((c) => (
                    <span key={c} className="rounded-md border border-border/80 bg-muted/60 px-2 py-0.5 text-xs font-mono font-medium text-foreground">
                      {capabilityLabel(c)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        {filteredRoles.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
            <ShieldCheck className="size-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium text-foreground">No roles found</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {search ? "No roles match your search filter." : "No roles configured yet."}
            </p>
          </div>
        )}
      </div>

      {/* Edit / Add Role Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Role" : "Add Role"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Role Title *</Label>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. Compliance Officer"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Persona Name *</Label>
                <Input
                  value={draft.personaName}
                  onChange={(e) => setDraft((d) => ({ ...d, personaName: e.target.value }))}
                  placeholder="e.g. Neha Kapoor"
                  className="text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Icon</Label>
              <Select value={draft.icon} onValueChange={(v) => setDraft((d) => ({ ...d, icon: v ?? "Briefcase" }))}>
                <SelectTrigger className="w-full text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_ICON_OPTIONS.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Capabilities</Label>
              <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/20 p-2.5 max-h-48 overflow-y-auto">
                {ALL_CAPABILITIES.map((cap) => (
                  <label key={cap} className="flex items-center gap-2 text-xs font-normal text-foreground cursor-pointer">
                    <Checkbox checked={draft.capabilities.includes(cap)} onCheckedChange={() => toggleCapability(cap)} />
                    {capabilityLabel(cap)}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" />}>Cancel</DialogClose>
            <Button size="sm" onClick={save}>{editing ? "Save Changes" : "Add Role"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove &quot;{pendingDelete?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed">
              It will no longer appear on the Demo Mode role picker or as a selectable role anywhere in the app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
            <AlertDialogAction size="sm" onClick={confirmDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
