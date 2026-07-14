"use client";

import { useState } from "react";
import { MoreVertical, LayoutGrid, Pencil, RotateCcw, Save, GripVertical, Check, EyeOff, CheckCircle2 } from "lucide-react";
import { WidgetDef, WidgetSize } from "@/lib/types";
import { useDashboardLayout, WIDGET_SIZE_LABEL } from "@/lib/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface DashboardControlsResult {
  editMode: boolean;
}

// Self-contained, reusable dashboard-customization control: give it a
// unique dashboardKey and the page's widget catalog, drop it next to any
// page header's other actions, and it handles everything — the trigger,
// the dropdown, the "Manage Widgets" drawer, drag-reorder, visibility, and
// persistence. Nothing about it is specific to any one page.
export function DashboardControls({
  dashboardKey,
  widgetDefs,
  editMode,
  onEditModeChange,
}: {
  dashboardKey: string;
  widgetDefs: WidgetDef[];
  editMode: boolean;
  onEditModeChange: (v: boolean) => void;
}) {
  const { layout, defsById, totalCount, visibleCount, reorder, toggleVisibility, resetLayout } = useDashboardLayout(
    dashboardKey,
    widgetDefs
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }
    const ids = layout.map((w) => w.id);
    const fromIndex = ids.indexOf(draggedId);
    const toIndex = ids.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, draggedId);
    reorder(ids);
    setDraggedId(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="icon-sm" title="Dashboard controls" aria-label="Dashboard controls" />
          }
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Dashboard Controls</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuItem onClick={() => setDrawerOpen(true)}>
            <LayoutGrid className="size-4" />
            Manage Widgets
            <DropdownMenuShortcut>
              <Badge variant="secondary">{totalCount}</Badge>
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onEditModeChange(!editMode)}
            className={cn(editMode && "bg-primary/10 text-primary")}
          >
            <Pencil className="size-4" />
            {editMode ? "Exit Edit Mode" : "Edit Layout"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={resetLayout}>
            <RotateCcw className="size-4" />
            Reset Layout
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Save className="size-4" />
            Save Layout
            <DropdownMenuShortcut>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Auto
              </Badge>
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Manage Widgets</SheetTitle>
            <SheetDescription>
              {visibleCount} of {totalCount} visible · Drag to reorder
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-2 overflow-y-auto px-4">
            {layout.map((widget) => {
              const def = defsById.get(widget.id);
              if (!def) return null;
              return (
                <div
                  key={widget.id}
                  draggable
                  onDragStart={() => setDraggedId(widget.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(widget.id)}
                  onDragEnd={() => setDraggedId(null)}
                  style={{ opacity: widget.hidden ? 0.5 : 1 }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 shadow-sm transition-opacity",
                    widget.hidden && "border-dashed"
                  )}
                >
                  <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{def.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {WIDGET_SIZE_LABEL[widget.size as WidgetSize]} · {widget.hidden ? "Hidden" : "Visible"}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleVisibility(widget.id)}
                    aria-label={widget.hidden ? "Show widget" : "Hide widget"}
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors",
                      widget.hidden
                        ? "border-border text-muted-foreground hover:text-foreground"
                        : "border-transparent bg-primary text-primary-foreground"
                    )}
                  >
                    {widget.hidden ? <EyeOff className="size-3.5" /> : <Check className="size-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>

          <SheetFooter>
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5 shrink-0" />
              Changes auto-saved on this device
            </div>
            <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={resetLayout}>
              <RotateCcw className="size-3.5" /> Reset to Default Layout
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
