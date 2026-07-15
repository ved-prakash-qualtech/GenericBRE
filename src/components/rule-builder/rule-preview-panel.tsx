"use client";

import { ReactNode } from "react";
import { ListChecks, Variable } from "lucide-react";
import { BusinessField, BusinessRule } from "@/lib/types";
import { collectFieldKeys } from "@/lib/condition-tree";
import { getField } from "@/lib/fields";
import { groupToText, actionsToText } from "./rule-summary";
import { Badge } from "@/components/ui/badge";

// A structured breakdown (Input Fields → Conditions → Actions → Generated
// Variables) so a Business Analyst can read exactly what a standalone rule
// consumes and produces before publishing — complementary to RuleSummary's
// one-line prose banner, not a replacement for it.
export function RulePreviewPanel({
  rule,
  fieldCatalog,
}: {
  rule: Pick<BusinessRule, "rootGroup" | "actions" | "elseActions">;
  fieldCatalog: BusinessField[];
}) {
  const inputKeys = Array.from(collectFieldKeys(rule.rootGroup));
  const generatedVars = Array.from(
    new Set(
      [...rule.actions, ...(rule.elseActions ?? [])]
        .filter((a) => (a.type === "Assign Value" || a.type === "Calculate") && a.outputField)
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
          <p className="text-xs leading-relaxed text-foreground/80">IF {groupToText(rule.rootGroup, fieldCatalog)}</p>
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
      </div>
    </div>
  );
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
