"use client";

import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { LogoLockup } from "./logo";
import { SidebarNav } from "./sidebar-nav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const setCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const [hovering, setHovering] = useState(false);

  const visuallyExpanded = !collapsed || hovering;

  return (
    <motion.aside
      onMouseEnter={() => collapsed && setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      animate={{ width: visuallyExpanded ? 220 : 56 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={cn(
        "z-30 hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex",
        hovering && collapsed ? "absolute inset-y-0 left-0 shadow-2xl" : "relative"
      )}
      style={{ height: "100%" }}
    >
      <div className="flex h-14 items-center border-b border-sidebar-border px-3">
        <LogoLockup collapsed={!visuallyExpanded} />
      </div>

      <SidebarNav collapsed={!visuallyExpanded} />

      <div className="border-t border-sidebar-border p-2.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground"
        >
          {visuallyExpanded ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
        </Button>
      </div>
    </motion.aside>
  );
}
