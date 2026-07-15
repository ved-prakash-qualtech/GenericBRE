"use client";

import { Plus, FolderPlus, Trash2, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Condition, ConditionGroup, Domain } from "@/lib/types";
import { emptyCondition, emptyGroup } from "@/lib/condition-tree";
import { ConditionEditor } from "./condition-editor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TreeNode = Condition | ConditionGroup;

interface GroupEditorProps {
  group: ConditionGroup;
  domain: Domain;
  onUpdate: (id: string, patch: Partial<TreeNode>) => void;
  onDelete: (id: string) => void;
  onAddChild: (groupId: string, child: TreeNode) => void;
  isRoot?: boolean;
  /** The rule being edited — threaded down so ConditionEditor can exclude
   *  its own outputs from its "Generated Variables" list (rule chaining is
   *  global, see src/lib/rule-chaining.ts). Absent for Rule Templates. */
  currentRuleId?: string;
}

function collectGroupIds(group: ConditionGroup, out: string[] = []): string[] {
  out.push(group.id);
  for (const child of group.children) {
    if (child.type === "group") collectGroupIds(child, out);
  }
  return out;
}

export function ConditionGroupEditor({ group, domain, onUpdate, onDelete, onAddChild, isRoot, currentRuleId }: GroupEditorProps) {
  // Collapse state lives on the group itself (ConditionGroup.collapsed) so it
  // persists with the rule and a root "Collapse All/Expand All" can drive
  // every nested group at once, instead of being local-only UI state.
  const collapsed = !isRoot && !!group.collapsed;

  return (
    <div className={cn("rounded-xl border", isRoot ? "border-border bg-muted/20" : "border-dashed bg-background/60 ml-1")}>
      <div className="flex items-center gap-2 border-b px-3 py-2">
        {!isRoot && (
          <button onClick={() => onUpdate(group.id, { collapsed: !collapsed })} className="text-muted-foreground hover:text-foreground">
            {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
        )}
        <span className="text-xs font-medium text-muted-foreground">{isRoot ? "IF" : "Group"}</span>
        <div className="flex overflow-hidden rounded-md border">
          <button
            onClick={() => onUpdate(group.id, { logic: "AND" })}
            className={cn("px-2.5 py-1 text-[11px] font-semibold transition-colors", group.logic === "AND" ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
          >
            AND
          </button>
          <button
            onClick={() => onUpdate(group.id, { logic: "OR" })}
            className={cn("px-2.5 py-1 text-[11px] font-semibold transition-colors", group.logic === "OR" ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
          >
            OR
          </button>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {group.children.length === 0 ? "matches every case" : `of ${group.children.length} condition${group.children.length > 1 ? "s" : ""}`}
        </span>

        <div className="ml-auto flex items-center gap-1">
          {isRoot && group.children.some((c) => c.type === "group") && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-muted-foreground"
                onClick={() => collectGroupIds(group).forEach((id) => id !== group.id && onUpdate(id, { collapsed: true }))}
              >
                <ChevronsDownUp className="size-3" /> Collapse All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-muted-foreground"
                onClick={() => collectGroupIds(group).forEach((id) => id !== group.id && onUpdate(id, { collapsed: false }))}
              >
                <ChevronsUpDown className="size-3" /> Expand All
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => onAddChild(group.id, emptyCondition())}>
            <Plus className="size-3" /> Condition
          </Button>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => onAddChild(group.id, emptyGroup())}>
            <FolderPlus className="size-3" /> Group
          </Button>
          {!isRoot && (
            <Button variant="ghost" size="icon-sm" onClick={() => onDelete(group.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 p-3">
              {group.children.length === 0 && (
                <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                  No conditions yet — this {isRoot ? "rule applies to every case" : "group always passes"}. Add a condition to narrow it down.
                </p>
              )}
              {group.children.map((child, i) => (
                <div key={child.id}>
                  {i > 0 && (
                    <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-primary/60">{group.logic}</p>
                  )}
                  {child.type === "condition" ? (
                    <ConditionEditor
                      condition={child}
                      domain={domain}
                      currentRuleId={currentRuleId}
                      onChange={(patch) => onUpdate(child.id, patch)}
                      onDelete={() => onDelete(child.id)}
                    />
                  ) : (
                    <ConditionGroupEditor
                      group={child}
                      domain={domain}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                      onAddChild={onAddChild}
                      currentRuleId={currentRuleId}
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
