"use client";

import { useAppStore } from "@/lib/store";
import { Workflow } from "lucide-react";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  const logo = useAppStore((s) => s.appearance.logo);
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt="Client logo" className={cn("size-8 rounded-md object-contain", className)} />;
  }
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sidebar-primary to-sidebar-primary/60 text-sidebar-primary-foreground shadow-sm",
        className
      )}
    >
      <Workflow className="size-4.5" strokeWidth={2.5} />
    </div>
  );
}

export function LogoLockup({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 overflow-hidden">
      <LogoMark />
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            Business Rules Engine
          </span>
          <span className="text-[11px] text-sidebar-foreground/55">Decision Platform</span>
        </div>
      )}
    </div>
  );
}
