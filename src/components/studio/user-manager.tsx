"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Mail, Building2, ShieldCheck } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { AppUser, Capability } from "@/lib/types";
import { ALL_CAPABILITIES, capabilityLabel } from "@/lib/capabilities";
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
import { cn } from "@/lib/utils";

function blankUser(): AppUser {
  const now = new Date().toISOString();
  return {
    id: "",
    name: "",
    email: "",
    role: "",
    department: "",
    status: "Active",
    permissions: ["rule.view"],
    approvalCategories: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function UserManager() {
  const users = useAppStore((s) => s.users);
  const ruleCategories = useAppStore((s) => s.ruleCategories);
  const addUser = useAppStore((s) => s.addUser);
  const updateUser = useAppStore((s) => s.updateUser);
  const deleteUser = useAppStore((s) => s.deleteUser);

  const [editing, setEditing] = useState<AppUser | null>(null);
  const [draft, setDraft] = useState<AppUser>(blankUser());
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AppUser | null>(null);

  const startCreate = () => {
    setEditing(null);
    setDraft(blankUser());
    setOpen(true);
  };
  const startEdit = (user: AppUser) => {
    setEditing(user);
    setDraft(user);
    setOpen(true);
  };

  const togglePermission = (cap: Capability) => {
    setDraft((d) => ({
      ...d,
      permissions: d.permissions.includes(cap) ? d.permissions.filter((c) => c !== cap) : [...d.permissions, cap],
    }));
  };

  const toggleApprovalCategory = (categoryName: string) => {
    setDraft((d) => ({
      ...d,
      approvalCategories: d.approvalCategories.includes(categoryName)
        ? d.approvalCategories.filter((c) => c !== categoryName)
        : [...d.approvalCategories, categoryName],
    }));
  };

  const save = () => {
    if (!draft.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (!draft.email.trim()) {
      toast.error("Email is required.");
      return;
    }
    if (!draft.role) {
      toast.error("Job Title is required.");
      return;
    }
    if (editing) {
      updateUser(editing.id, draft);
      toast.success(`"${draft.name}" updated.`);
    } else {
      const id = `usr-${draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;
      addUser({ ...draft, id });
      toast.success(`"${draft.name}" added.`);
    }
    setOpen(false);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteUser(pendingDelete.id);
    toast.info(`"${pendingDelete.name}" removed.`);
    setPendingDelete(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Every named user on the roster — their Role, System Permissions, and which Rule Categories they&apos;re authorized to approve.
        </p>
        <Button size="sm" className="shrink-0 gap-1.5" onClick={startCreate}>
          <Plus className="size-3.5" /> Add User
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <div key={user.id} className="flex flex-col gap-2.5 rounded-xl border bg-card p-3.5">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <Badge
                    variant={user.status === "Active" ? "outline" : "secondary"}
                    className={cn("shrink-0 text-[9px]", user.status === "Active" && "border-emerald-500/30 text-emerald-600 dark:text-emerald-400")}
                  >
                    {user.status}
                  </Badge>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">{user.role}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => startEdit(user)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={() => setPendingDelete(user)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-0.5 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Mail className="size-3 shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 className="size-3 shrink-0" />
                <span className="truncate">{user.department || "—"}</span>
              </div>
            </div>

            <div>
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Permissions</p>
              <div className="flex flex-wrap gap-1">
                {user.permissions.length === 0 ? (
                  <span className="text-[10px] text-muted-foreground/60">None</span>
                ) : (
                  user.permissions.map((c) => (
                    <Badge key={c} variant="outline" className="text-[9px]">{capabilityLabel(c)}</Badge>
                  ))
                )}
              </div>
            </div>

            <div>
              <p className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                <ShieldCheck className="size-2.5" /> Approvals
              </p>
              <div className="flex flex-wrap gap-1">
                {user.approvalCategories.length === 0 ? (
                  <span className="text-[10px] text-muted-foreground/60">None assigned</span>
                ) : (
                  user.approvalCategories.map((cat) => (
                    <Badge key={cat} variant="outline" className="border-amber-500/30 bg-amber-500/10 text-[9px] text-amber-700 dark:text-amber-400">
                      {cat}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
            No users configured yet. Add one to get started.
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. Kavita Rao"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                  placeholder="e.g. kavita.rao@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Job Title *</Label>
                <Input
                  value={draft.role}
                  onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
                  placeholder="e.g. Credit Risk Manager"
                />
                <p className="text-[10.5px] text-muted-foreground">
                  Free-text title, shown on the roster — access is granted separately below via System Permissions, not this field.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Input
                  value={draft.department}
                  onChange={(e) => setDraft((d) => ({ ...d, department: e.target.value }))}
                  placeholder="e.g. Credit Risk"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Status</Label>
                <Select value={draft.status} onValueChange={(v) => setDraft((d) => ({ ...d, status: (v as AppUser["status"]) ?? "Active" }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>System Permissions</Label>
              <div className="grid grid-cols-2 gap-2 rounded-lg border p-2.5">
                {ALL_CAPABILITIES.map((cap) => (
                  <label key={cap} className="flex items-center gap-2 text-xs">
                    <Checkbox checked={draft.permissions.includes(cap)} onCheckedChange={() => togglePermission(cap)} />
                    {capabilityLabel(cap)}
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 p-3">
              <Label className="text-sm">Rule Approval Responsibilities</Label>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Select the business rule categories this user is authorized to approve. A single user may approve multiple rule categories.
              </p>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {ruleCategories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={draft.approvalCategories.includes(cat.name)}
                      onCheckedChange={() => toggleApprovalCategory(cat.name)}
                    />
                    {cat.name}
                  </label>
                ))}
                {ruleCategories.length === 0 && (
                  <p className="col-span-2 text-[11px] text-muted-foreground">
                    No rule categories configured yet — add one in Rule Categories first.
                  </p>
                )}
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
              They will no longer appear on the User Management roster, and any rule-approval categories assigned to them will be removed.
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
