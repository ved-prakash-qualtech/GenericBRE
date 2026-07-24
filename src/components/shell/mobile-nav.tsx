"use client";

import { Palette } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LogoLockup } from "./logo";
import { SidebarNav } from "./sidebar-nav";
import { useAppStore } from "@/lib/store";

export function MobileNav({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const setAppearanceOpen = useAppStore((s) => s.setAppearanceOpen);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex w-full max-w-72 flex-col bg-sidebar p-0 text-sidebar-foreground [&_svg]:text-inherit">
        <SheetHeader className="h-14 flex-row items-center border-b border-sidebar-border space-y-0">
          <LogoLockup />
          <SheetTitle className="sr-only">Navigation</SheetTitle>
        </SheetHeader>
        <SidebarNav collapsed={false} onNavigate={() => onOpenChange(false)} />
        <div className="border-t border-sidebar-border p-2.5">
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              setAppearanceOpen(true);
            }}
            className="flex h-9.5 w-full items-center gap-3 rounded-lg px-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <Palette className="size-4 shrink-0" strokeWidth={2.2} />
            Appearance
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
