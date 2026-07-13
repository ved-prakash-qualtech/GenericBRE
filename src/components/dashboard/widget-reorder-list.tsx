"use client";

import { Reorder } from "framer-motion";
import { GripVertical, Eye, EyeOff } from "lucide-react";

export interface ReorderableWidget {
  id: string;
  visible: boolean;
  order: number;
}

// Shared drag-to-reorder + show/hide list — used by both the end-user
// "Manage Widgets" sheet and the admin "Dashboard Management" screen so
// there's exactly one drag-and-drop implementation to maintain.
export function WidgetReorderList({
  items,
  labels,
  onReorder,
  onToggleVisible,
}: {
  items: ReorderableWidget[];
  labels: Record<string, string>;
  onReorder: (items: ReorderableWidget[]) => void;
  onToggleVisible: (id: string) => void;
}) {
  const ordered = [...items].sort((a, b) => a.order - b.order);

  const handleReorder = (newOrder: ReorderableWidget[]) => {
    onReorder(newOrder.map((w, i) => ({ ...w, order: i })));
  };

  return (
    <Reorder.Group axis="y" values={ordered} onReorder={handleReorder} className="space-y-2">
      {ordered.map((w) => (
        <Reorder.Item
          key={w.id}
          value={w}
          className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 shadow-sm"
        >
          <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" />
          <span className={`flex-1 text-sm ${w.visible ? "" : "text-muted-foreground/60 line-through"}`}>
            {labels[w.id] ?? w.id}
          </span>
          <button
            onClick={() => onToggleVisible(w.id)}
            aria-label={w.visible ? "Hide widget" : "Show widget"}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {w.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          </button>
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );
}
