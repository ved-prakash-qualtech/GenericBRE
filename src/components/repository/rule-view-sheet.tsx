"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import { BusinessField, BusinessRule, ConditionGroup } from "@/lib/types";
import { getField } from "@/lib/fields";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function GroupView({ group, depth = 0, catalog }: { group: ConditionGroup; depth?: number; catalog: BusinessField[] }) {
  if (group.children.length === 0) {
    return <p className="text-xs italic text-muted-foreground">Always applies (no conditions)</p>;
  }
  return (
    <div className={cn("space-y-1.5", depth > 0 && "border-l-2 pl-3")}>
      {group.children.map((child, i) => (
        <div key={child.id}>
          {i > 0 && (
            <p className="my-1 text-[10px] font-bold uppercase tracking-wide text-primary/70">{group.logic}</p>
          )}
          {child.type === "condition" ? (
            <div className="rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs">
              <span className="font-medium">{getField(catalog, child.field)?.label ?? child.field}</span>{" "}
              <span className="text-muted-foreground">{child.operator}</span>{" "}
              <span className="font-mono">{child.value}{child.value2 ? ` – ${child.value2}` : ""}</span>
            </div>
          ) : (
            <GroupView group={child} depth={depth + 1} catalog={catalog} />
          )}
        </div>
      ))}
    </div>
  );
}

export function RuleViewSheet({ rule, open, onOpenChange }: { rule: BusinessRule | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        {rule && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">{rule.id}</span>
                {rule.name}
              </SheetTitle>
              <SheetDescription>{rule.description || "No description provided."}</SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1 px-4">
              <div className="flex flex-wrap gap-2 pb-4">
                <StatusBadge status={rule.status} />
                <PriorityBadge priority={rule.priority} />
                <span className="rounded-full border px-2 py-0.5 text-[11px]">{rule.domain}</span>
                <span className="rounded-full border px-2 py-0.5 text-[11px]">{rule.category}</span>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 py-4 text-xs">
                <div>
                  <p className="text-muted-foreground">Owner</p>
                  <p className="font-medium">{rule.owner}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Version</p>
                  <p className="font-medium">v{rule.version}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{new Date(rule.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Updated</p>
                  <p className="font-medium">{new Date(rule.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
              <Separator />
              <div className="py-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">IF Conditions</p>
                <GroupView group={rule.rootGroup} catalog={fieldCatalog} />
              </div>
              <Separator />
              <div className="py-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">THEN Actions</p>
                <div className="space-y-1.5">
                  {rule.actions.map((a) => (
                    <div key={a.id} className="rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs">
                      <span className="font-medium">{a.type}</span>
                      {a.message && <span className="text-muted-foreground"> — {a.message}</span>}
                      {a.outputField && (
                        <span className="text-muted-foreground">
                          {" "}
                          — set <span className="font-mono">{a.outputField}</span> = <span className="font-mono">{a.outputValue}</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
