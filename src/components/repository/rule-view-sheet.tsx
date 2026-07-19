"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { ChevronDown, History, RotateCcw } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import { BusinessField, BusinessRule, Condition, ConditionGroup, RuleAction, RuleVersion } from "@/lib/types";
import { getField } from "@/lib/fields";
import { flattenConditions } from "@/lib/conflict-detection";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function describeCondition(c: Condition, catalog: BusinessField[]): string {
  const label = getField(catalog, c.field)?.label ?? c.field;
  return `${label} ${c.operator} ${c.value}${c.value2 ? ` – ${c.value2}` : ""}`;
}

function describeAction(a: RuleVersion["actions"][number]): string {
  let s = a.type;
  if (a.message) s += ` — ${a.message}`;
  if (a.outputField) s += ` — set ${a.outputField} = ${a.outputValue}`;
  return s;
}

const META_FIELDS: { key: keyof RuleVersion; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "subCategory", label: "Sub-category" },
  { key: "priority", label: "Priority" },
  // { key: "owner", label: "Owner" }, // FUTURE: restore when Owner is reintroduced
  { key: "description", label: "Description" },
];

function diffVersions(prev: RuleVersion | undefined, curr: RuleVersion, catalog: BusinessField[]) {
  const metaChanges = META_FIELDS.map(({ key, label }) => ({ label, before: prev?.[key], after: curr[key] })).filter(
    (m) => prev !== undefined && m.before !== m.after
  );

  const prevConds = prev ? flattenConditions(prev.rootGroup).map((c) => describeCondition(c, catalog)) : [];
  const currConds = flattenConditions(curr.rootGroup).map((c) => describeCondition(c, catalog));
  const conditionsAdded = currConds.filter((c) => !prevConds.includes(c));
  const conditionsRemoved = prevConds.filter((c) => !currConds.includes(c));

  const prevActions = (prev?.actions ?? []).map((a) => `THEN: ${describeAction(a)}`);
  const currActions = curr.actions.map((a) => `THEN: ${describeAction(a)}`);
  const prevElse = (prev?.elseActions ?? []).map((a) => `ELSE: ${describeAction(a)}`);
  const currElse = (curr.elseActions ?? []).map((a) => `ELSE: ${describeAction(a)}`);
  const actionsAdded = [...currActions, ...currElse].filter((a) => ![...prevActions, ...prevElse].includes(a));
  const actionsRemoved = [...prevActions, ...prevElse].filter((a) => ![...currActions, ...currElse].includes(a));

  return { metaChanges, conditionsAdded, conditionsRemoved, actionsAdded, actionsRemoved };
}

function GroupView({ group, depth = 0, catalog }: { group: ConditionGroup; depth?: number; catalog: BusinessField[] }) {
  if (group.children.length === 0) {
    return <p className="text-xs italic text-muted-foreground">Always applies (no conditions)</p>;
  }
  return (
    <div className={cn("space-y-1.5", depth > 0 && "border-l-2 pl-3")}>
      {group.children.map((child, i) => (
        <div key={child.id}>
          {i > 0 && (
            <p className="my-1 text-[10px] font-bold uppercase tracking-wide text-primary/70">{child.connector ?? group.logic}</p>
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

function ActionRowList({ actions }: { actions: RuleAction[] }) {
  return (
    <div className="space-y-1.5">
      {actions.map((a) => (
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
  );
}

function VersionHistorySection({ rule, catalog }: { rule: BusinessRule; catalog: BusinessField[] }) {
  const allVersions = useAppStore((s) => s.ruleVersions);
  const restoreRuleVersion = useAppStore((s) => s.restoreRuleVersion);
  const versions = useMemo(
    () => allVersions.filter((v) => v.ruleId === rule.id).sort((a, b) => b.version - a.version),
    [allVersions, rule.id]
  );
  const [expanded, setExpanded] = useState<number | null>(versions[0]?.version ?? null);
  const [restoreTarget, setRestoreTarget] = useState<RuleVersion | null>(null);

  if (versions.length === 0) return null;

  const handleRestore = () => {
    if (!restoreTarget) return;
    const result = restoreRuleVersion(rule.id, restoreTarget.version);
    if (result.ok) {
      toast.success(`Restored v${restoreTarget.version}'s content`, { description: `${rule.name} is now a new version.` });
    } else {
      toast.error("Restore failed", { description: result.reason });
    }
    setRestoreTarget(null);
  };

  return (
    <>
      <Separator />
      <div className="py-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <History className="size-3.5" /> Version History
        </p>
        <div className="space-y-2">
          {versions.map((v, i) => {
            const prev = versions[i + 1];
            const diff = diffVersions(prev, v, catalog);
            const isOpen = expanded === v.version;
            const isCurrent = i === 0;
            const hasChanges =
              diff.metaChanges.length +
                diff.conditionsAdded.length +
                diff.conditionsRemoved.length +
                diff.actionsAdded.length +
                diff.actionsRemoved.length >
              0;
            return (
              <div key={v.version} className="rounded-lg border">
                <button
                  onClick={() => setExpanded(isOpen ? null : v.version)}
                  className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs"
                >
                  <span className="font-mono font-semibold">v{v.version}</span>
                  <span className="text-muted-foreground">
                    {v.changeType === "created"
                      ? "created"
                      : v.changeType === "restored"
                        ? `restored from v${v.restoredFromVersion}`
                        : "edited"}
                  </span>
                  <span className="text-muted-foreground">· {v.snapshotBy}</span>
                  <span className="ml-auto shrink-0 text-muted-foreground">
                    {formatDistanceToNow(new Date(v.snapshotAt), { addSuffix: true })}
                  </span>
                  <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="space-y-1.5 border-t px-2.5 py-2.5 text-[11px]">
                    {!prev && <p className="text-muted-foreground">Initial version — nothing to compare against.</p>}
                    {prev && !hasChanges && <p className="text-muted-foreground">No content changes from v{prev.version}.</p>}
                    {diff.metaChanges.map((m) => (
                      <p key={m.label}>
                        <span className="font-medium">{m.label}:</span>{" "}
                        <span className="text-red-500 line-through">{String(m.before ?? "—")}</span> →{" "}
                        <span className="text-emerald-600 dark:text-emerald-400">{String(m.after ?? "—")}</span>
                      </p>
                    ))}
                    {diff.conditionsRemoved.map((c) => (
                      <p key={`c-${c}`} className="text-red-500">− {c}</p>
                    ))}
                    {diff.conditionsAdded.map((c) => (
                      <p key={`c+${c}`} className="text-emerald-600 dark:text-emerald-400">+ {c}</p>
                    ))}
                    {diff.actionsRemoved.map((a) => (
                      <p key={`a-${a}`} className="text-red-500">− {a}</p>
                    ))}
                    {diff.actionsAdded.map((a) => (
                      <p key={`a+${a}`} className="text-emerald-600 dark:text-emerald-400">+ {a}</p>
                    ))}
                    {!isCurrent && (
                      <Button variant="outline" size="sm" className="mt-1.5 gap-1.5" onClick={() => setRestoreTarget(v)}>
                        <RotateCcw className="size-3.5" /> Restore this version
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <AlertDialog open={!!restoreTarget} onOpenChange={(v) => !v && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore v{restoreTarget?.version}?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces the rule&apos;s current conditions, actions, and metadata with v{restoreTarget?.version}&apos;s
              content, saved as a new version (v{rule.version + 1}). Nothing is deleted — the current content stays in
              history too.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
                {/* FUTURE: Owner metadata removed for demo. Restore when reintroduced:
                <div>
                  <p className="text-muted-foreground">Owner</p>
                  <p className="font-medium">{rule.owner}</p>
                </div>
                */}
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
                <ActionRowList actions={rule.actions} />
              </div>
              {rule.elseActions && rule.elseActions.length > 0 && (
                <>
                  <Separator />
                  <div className="py-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">ELSE Actions</p>
                    <ActionRowList actions={rule.elseActions} />
                  </div>
                </>
              )}
              <VersionHistorySection key={rule.id} rule={rule} catalog={fieldCatalog} />
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
