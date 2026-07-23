"use client";

import { BusinessField, BusinessRule, ConditionGroup, RuleAction } from "@/lib/types";
import { getField } from "@/lib/fields";
import { effectiveConnector } from "@/lib/condition-tree";
import { useAppStore } from "@/lib/store";
import { Sparkles } from "lucide-react";

function operatorText(op: string) {
  const map: Record<string, string> = {
    "=": "is",
    "!=": "is not",
    ">": "is greater than",
    "<": "is less than",
    ">=": "is at least",
    "<=": "is at most",
    contains: "contains",
    starts_with: "starts with",
    in: "is one of",
    between: "is between",
  };
  return map[op] ?? op;
}

export function groupToText(group: ConditionGroup, catalog: BusinessField[]): string {
  if (group.children.length === 0) return "always";
  return group.children
    .map((c, i) => {
      const text =
        c.type === "condition"
          ? (() => {
              const field = getField(catalog, c.field)?.label ?? c.field ?? "…";
              const val = c.operator === "between" ? `${c.value} and ${c.value2}` : c.value || "…";
              return `${field} ${operatorText(c.operator)} ${val}`;
            })()
          : `(${groupToText(c, catalog)})`;
      if (i === 0) return text;
      // Per-child connector — falls back to the legacy uniform `group.logic`
      // for any child saved before this existed, so old rules read unchanged.
      const connector = effectiveConnector(group, i);
      return connector === "N.A." ? `[excluded] ${text}` : `${connector} ${text}`;
    })
    .join(" ");
}

export function actionsToText(actions: RuleAction[]): string {
  return actions
    .map((a) => {
      if (a.type === "Approve" || a.type === "Reject") return `${a.type.toLowerCase()} the application${a.reasonCode ? ` (${a.reasonCode})` : ""}`;
      if (a.type === "Calculate" || a.type === "Assign Value") return `set ${a.outputField || "…"} = ${a.outputValue || "…"}`;
      if (a.type === "Bracket Lookup") return `set ${a.outputField || "…"} via bracket lookup on ${a.bracketField || "…"}`;
      return `show message "${a.message || "…"}"`;
    })
    .join("; ");
}

export function getRulePrefix(group: ConditionGroup): "IF" | "WHERE" | "CASE" {
  if (group.children.length > 0) {
    const first = group.children[0];
    if (first.type === "condition" && first.prefix) {
      return first.prefix;
    } else if (first.type === "group") {
      return getRulePrefix(first);
    }
  }
  return "IF";
}

export function RuleSummary({
  rule,
}: {
  rule: Pick<BusinessRule, "name" | "rootGroup" | "actions" | "elseActions" | "priority" | "status">;
}) {
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const conditionText = groupToText(rule.rootGroup, fieldCatalog);
  const prefix = getRulePrefix(rule.rootGroup);
  return (
    <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-4">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-primary">
        <Sparkles className="size-3.5" /> Live Rule Summary
      </div>
      <p className="text-sm leading-relaxed">
        <span className="font-semibold">{rule.name || "This rule"}</span> (Priority {rule.priority}, {rule.status}) —{" "}
        <span className="font-medium text-primary">{prefix}</span> {conditionText}{" "}
        {rule.actions.length > 0 && (
          <>
            <span className="font-medium text-primary">THEN</span> {actionsToText(rule.actions)}
          </>
        )}
        {rule.actions.length === 0 && <span className="text-muted-foreground">no actions configured yet</span>}
        {rule.elseActions && rule.elseActions.length > 0 && (
          <>
            {" "}
            <span className="font-medium text-primary">ELSE</span> {actionsToText(rule.elseActions)}
          </>
        )}
        .
      </p>
    </div>
  );
}
