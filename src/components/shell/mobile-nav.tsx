"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LogoLockup } from "./logo";
import { SidebarNav } from "./sidebar-nav";

export function MobileNav({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex w-full max-w-72 flex-col bg-sidebar p-0 text-sidebar-foreground [&_svg]:text-inherit">
        <SheetHeader className="h-14 flex-row items-center border-b border-sidebar-border space-y-0">
          <LogoLockup />
          <SheetTitle className="sr-only">Navigation</SheetTitle>
        </SheetHeader>
        <SidebarNav collapsed={false} onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
