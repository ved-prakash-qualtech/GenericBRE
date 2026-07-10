"use client";

import { BusinessRule, ConditionGroup } from "@/lib/types";
import { getField } from "@/lib/fields";
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

function groupToText(group: ConditionGroup): string {
  if (group.children.length === 0) return "always";
  return group.children
    .map((c) => {
      if (c.type === "condition") {
        const field = getField(c.field)?.label ?? c.field ?? "…";
        const val = c.operator === "between" ? `${c.value} and ${c.value2}` : c.value || "…";
        return `${field} ${operatorText(c.operator)} ${val}`;
      }
      return `(${groupToText(c)})`;
    })
    .join(` ${group.logic} `);
}

export function RuleSummary({ rule }: { rule: Pick<BusinessRule, "name" | "rootGroup" | "actions" | "priority" | "status"> }) {
  const conditionText = groupToText(rule.rootGroup);
  return (
    <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-4">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
        <Sparkles className="size-3.5" /> Live Rule Summary
      </div>
      <p className="text-[13px] leading-relaxed">
        <span className="font-semibold">{rule.name || "This rule"}</span> (Priority {rule.priority}, {rule.status}) —{" "}
        <span className="font-medium text-primary">IF</span> {conditionText}{" "}
        {rule.actions.length > 0 && (
          <>
            <span className="font-medium text-primary">THEN</span>{" "}
            {rule.actions
              .map((a) => {
                if (a.type === "Approve" || a.type === "Reject") return `${a.type.toLowerCase()} the application${a.reasonCode ? ` (${a.reasonCode})` : ""}`;
                if (a.type === "Calculate" || a.type === "Assign Value") return `set ${a.outputField || "…"} = ${a.outputValue || "…"}`;
                return `show message "${a.message || "…"}"`;
              })
              .join("; ")}
          </>
        )}
        {rule.actions.length === 0 && <span className="text-muted-foreground">no actions configured yet</span>}
        .
      </p>
    </div>
  );
}
