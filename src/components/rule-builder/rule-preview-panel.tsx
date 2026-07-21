"use client";

import { ReactNode } from "react";
import { ListChecks, Variable } from "lucide-react";
import { BusinessField, BusinessRule, CaseWhenClause, RuleAction } from "@/lib/types";
import { collectFieldKeys } from "@/lib/condition-tree";
import { getField } from "@/lib/fields";
import { groupToText, actionsToText, getRulePrefix } from "./rule-summary";
import { Badge } from "@/components/ui/badge";

// A structured breakdown (Input Fields → Conditions → Actions → Generated
// Variables) so a Business Analyst can read exactly what a standalone rule
// consumes and produces before publishing — complementary to RuleSummary's
// one-line prose banner, not a replacement for it.
export function RulePreviewPanel({
  rule,
  fieldCatalog,
  caseWhens,
  caseElseActions,
}: {
  rule: Pick<BusinessRule, "rootGroup" | "actions" | "elseActions">;
  fieldCatalog: BusinessField[];
  /** Additive — CASE Builder data. Omitted by every existing caller, so the
   *  4 sections below (Input Fields/Conditions/Actions/Generated Variables)
   *  render exactly as before unless a caller opts in. */
  caseWhens?: CaseWhenClause[];
  caseElseActions?: RuleAction[];
}) {
  const inputKeys = Array.from(collectFieldKeys(rule.rootGroup));
  const generatedVars = Array.from(
    new Set(
      [...rule.actions, ...(rule.elseActions ?? [])]
        .filter((a) => (a.type === "Assign Value" || a.type === "Calculate" || a.type === "Bracket Lookup") && a.outputField)
        .map((a) => a.outputField!)
    )
  );

  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <ListChecks className="size-3.5" /> Rule Preview
      </p>
      <div className="space-y-3">
        <PreviewSection label="Input Fields">
          {inputKeys.length === 0 ? (
            <EmptyNote text="No input fields yet." />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {inputKeys.map((k) => {
                const f = getField(fieldCatalog, k);
                return <Badge key={k} variant="outline" className="text-[10px]">{f?.label ?? k}</Badge>;
              })}
            </div>
          )}
        </PreviewSection>

        <PreviewSection label="Conditions">
          <p className="text-xs leading-relaxed text-foreground/80">{getRulePrefix(rule.rootGroup)} {groupToText(rule.rootGroup, fieldCatalog)}</p>
        </PreviewSection>

        <PreviewSection label="Actions">
          <p className="text-xs leading-relaxed text-foreground/80">
            {rule.actions.length > 0 ? `THEN ${actionsToText(rule.actions)}` : "No THEN actions configured yet."}
            {rule.elseActions && rule.elseActions.length > 0 && <> · ELSE {actionsToText(rule.elseActions)}</>}
          </p>
        </PreviewSection>

        <PreviewSection label="Generated Variables">
          {generatedVars.length === 0 ? (
            <EmptyNote text="This rule doesn't generate any variables." />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {generatedVars.map((v) => (
                <Badge key={v} variant="secondary" className="gap-1 text-[10px]">
                  <Variable className="size-3" /> {v}
                </Badge>
              ))}
            </div>
          )}
        </PreviewSection>

        {caseWhens && caseWhens.length > 0 && (
          <PreviewSection label="CASE">
            <p className="text-xs leading-relaxed text-foreground/80">
              CASE
              {caseWhens.map((w) => ` / ${caseWhenToText(w, fieldCatalog)}`).join("")}
              {caseElseActions && caseElseActions.length > 0 && ` / ELSE ${actionsToText(caseElseActions)}`}
            </p>
          </PreviewSection>
        )}
      </div>
    </div>
  );
}

function caseWhenToText(w: CaseWhenClause, fieldCatalog: BusinessField[]): string {
  const field = getField(fieldCatalog, w.field)?.label ?? (w.field || "…");
  const outputField = getField(fieldCatalog, w.outputField)?.label ?? (w.outputField || "…");
  const valueText = w.operator === "between" ? `${w.value || "…"} and ${w.value2 || "…"}` : w.value || "…";
  return `WHEN ${field} ${w.operator} ${valueText} THEN ${outputField} = ${w.outputValue || "…"}`;
}

function PreviewSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">{label}</p>
      {children}
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p className="text-[11px] text-muted-foreground/60">{text}</p>;
}
