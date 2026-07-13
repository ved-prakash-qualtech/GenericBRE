"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { iconForRole } from "@/lib/role-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function RoleSwitcherDialog({
  open,
  onOpenChange,
  redirectTo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Navigate here after a role is picked — used when this dialog doubles as the sign-in shortcut on /login. */
  redirectTo?: string;
}) {
  const router = useRouter();
  const roles = useAppStore((s) => s.roles);
  const currentUser = useAppStore((s) => s.currentUser);
  const login = useAppStore((s) => s.login);
  const dashboardConfigs = useAppStore((s) => s.dashboardConfigs);

  const selectRole = (roleId: string, personaName: string) => {
    login(roleId);
    onOpenChange(false);
    toast.success(`Signed in as ${personaName}`);
    // Every switch — not just the initial /login pick — lands on that
    // persona's configured primary module (BRD §5.3), not a fixed page.
    router.push(dashboardConfigs[roleId]?.landingRoute ?? redirectTo ?? "/dashboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Your Role</DialogTitle>
          <DialogDescription>Choose a role to sign in as and explore the platform.</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-100 grid-cols-1 gap-2.5 overflow-y-auto sm:grid-cols-2">
          {roles.map((role) => {
            const Icon = iconForRole(role.icon);
            const active = role.id === currentUser.role;
            return (
              <button
                key={role.id}
                onClick={() => selectRole(role.id, role.personaName)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border bg-card p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/40",
                  active && "border-primary bg-primary/5"
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{role.personaName}</p>
                  <p className="truncate text-xs text-muted-foreground">{role.name}</p>
                </div>
                {active && <Check className="size-4 shrink-0 text-primary" />}
              </button>
            );
          })}
          {roles.length === 0 && (
            <p className="col-span-full rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
              No roles configured yet.
            </p>
          )}
        </div>
        <p className="text-center text-[11px] text-muted-foreground">
          Role-based access is enforced client-side in this preview environment.
        </p>
      </DialogContent>
    </Dialog>
  );
}
