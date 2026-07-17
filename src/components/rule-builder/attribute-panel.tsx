"use client";

import { useMemo, useState } from "react";
import { Search, Star, Clock, ChevronDown, ChevronRight, GripVertical, Boxes, Plus } from "lucide-react";
import { BusinessField, Entity } from "@/lib/types";
import {
  setDragPayload,
  clearDragPayload,
  toggleFavoriteField,
  useFavoriteFields,
  useRecentFields,
  recordRecentField,
} from "./builder-shared";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Left "Available Attributes" panel — SSMS/Power-BI-style field catalog rail.
// Click a field to append a pre-filled condition to the root group; drag it
// into the tree to insert at an exact spot (ConditionGroupEditor's drop
// targets accept the "new-field" payload).
export function AttributePanel({
  fields,
  entities,
  onAddField,
}: {
  fields: BusinessField[];
  entities: Entity[];
  onAddField: (fieldKey: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const favorites = useFavoriteFields();
  const recent = useRecentFields();

  const q = search.trim().toLowerCase();
  const visibleFields = useMemo(
    () => (q ? fields.filter((f) => f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q)) : fields),
    [fields, q]
  );
  const byKey = useMemo(() => new Map(fields.map((f) => [f.key, f])), [fields]);

  const entitySections = useMemo(() => {
    const groups = new Map<string, BusinessField[]>();
    for (const f of visibleFields) {
      const entityName = (f.entity && entities.find((e) => e.id === f.entity)?.name) || "Other";
      const list = groups.get(entityName) ?? [];
      list.push(f);
      groups.set(entityName, list);
    }
    // Stable, alphabetical sections with "Other" pinned last.
    return [...groups.entries()].sort(([a], [b]) => (a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)));
  }, [visibleFields, entities]);

  const favoriteFields = favorites.map((k) => byKey.get(k)).filter((f): f is BusinessField => !!f && visibleFields.includes(f));
  const recentFields = recent.map((k) => byKey.get(k)).filter((f): f is BusinessField => !!f && visibleFields.includes(f));

  const toggleSection = (name: string) =>
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const pick = (f: BusinessField) => {
    recordRecentField(f.key);
    onAddField(f.key);
  };

  const renderRow = (f: BusinessField) => {
    const isFav = favorites.includes(f.key);
    return (
      <div
        key={f.key}
        draggable
        onDragStart={(e) => {
          setDragPayload({ kind: "new-field", fieldKey: f.key });
          if (e.dataTransfer) e.dataTransfer.effectAllowed = "copy";
        }}
        onDragEnd={clearDragPayload}
        className="group flex cursor-grab select-none items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 text-xs transition-colors hover:border-primary/30 hover:bg-primary/5 active:cursor-grabbing"
      >
        <GripVertical className="size-3 shrink-0 text-muted-foreground/40" />
        <button
          type="button"
          onClick={() => pick(f)}
          title={`Add "${f.label}" as a condition`}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <span className="truncate font-medium">{f.label}</span>
          <Badge variant="secondary" className="ml-auto shrink-0 px-1 text-[9px] capitalize">{f.type}</Badge>
        </button>
        <button
          type="button"
          onClick={() => pick(f)}
          title="Add condition"
          className="shrink-0 rounded p-0.5 text-muted-foreground/50 opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
        >
          <Plus className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => toggleFavoriteField(f.key)}
          title={isFav ? "Remove from favorites" : "Add to favorites"}
          className={cn(
            "shrink-0 rounded p-0.5 transition-opacity",
            isFav ? "text-amber-500" : "text-muted-foreground/50 opacity-0 hover:text-amber-500 group-hover:opacity-100"
          )}
        >
          <Star className={cn("size-3", isFav && "fill-current")} />
        </button>
      </div>
    );
  };

  const renderSection = (name: string, icon: React.ReactNode, sectionFields: BusinessField[], collapsible = true) => {
    const collapsed = collapsedSections.has(name);
    return (
      <div key={name}>
        <button
          type="button"
          onClick={() => collapsible && toggleSection(name)}
          className="flex w-full items-center gap-1.5 px-1 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
        >
          {collapsible && (collapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />)}
          {icon}
          {name}
          <span className="ml-auto font-normal">{sectionFields.length}</span>
        </button>
        {!collapsed && <div className="space-y-0.5">{sectionFields.map(renderRow)}</div>}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card">
      <div className="border-b p-2.5">
        <p className="mb-2 px-0.5 text-xs font-semibold">Available Attributes</p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fields..."
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-2.5">
        {favoriteFields.length > 0 &&
          renderSection("Favorites", <Star className="size-3 text-amber-500" />, favoriteFields, false)}
        {recentFields.length > 0 &&
          renderSection("Recently Used", <Clock className="size-3" />, recentFields, false)}
        {entitySections.map(([name, sectionFields]) =>
          renderSection(name, <Boxes className="size-3" />, sectionFields)
        )}
        {visibleFields.length === 0 && (
          <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">No fields match this search.</p>
        )}
      </div>
      <p className="border-t px-3 py-2 text-[10px] text-muted-foreground">
        Click to add a condition · drag into the builder to place it exactly
      </p>
    </div>
  );
}
