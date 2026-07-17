"use client";

import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useAppStore, useHasCapability } from "@/lib/store";
import { Capability } from "@/lib/types";
import { Button } from "@/components/ui/button";

// Capability checks elsewhere only decide whether a nav link is *shown*
// (visibleNavItems in nav.ts) — anyone who knows or guesses the URL could
// still open a capability-gated page directly, since nothing actually
// blocked the route itself (audit finding A15). This wraps a page's content
// and renders the same "Access restricted" UI Configuration Studio already
// used, for any route that needs it — a real deployment must still enforce
// this server-side too (client-side guards are UX-only, see CLAUDE.md /
// UI_FRAMEWORK.md Section D-09).
export function RouteGuard({
  requiredCapability,
  moduleLabel,
  children,
}: {
  requiredCapability: Capability;
  moduleLabel: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const allowed = useHasCapability(requiredCapability);

  if (!allowed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <ShieldAlert className="size-10 text-muted-foreground/40" />
        <h1 className="text-base font-semibold">Access restricted</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {currentUser.name}&apos;s role doesn&apos;t include permission to access {moduleLabel}.
        </p>
        <Button variant="outline" size="sm" onClick={() => router.push("/")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
