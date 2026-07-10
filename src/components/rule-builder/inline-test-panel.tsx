"use client";

import { useMemo, useState } from "react";
import { PlayCircle, CheckCircle2, XCircle, FlaskConical } from "lucide-react";
import { ConditionGroup, RuleAction } from "@/lib/types";
import { collectFieldKeys } from "@/lib/condition-tree";
import { evaluateGroup, ConditionEvalDetail } from "@/lib/engine";
import { getField } from "@/lib/fields";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function InlineTestPanel({ rootGroup, actions }: { rootGroup: ConditionGroup; actions: RuleAction[] }) {
  const fieldKeys = useMemo(() => Array.from(collectFieldKeys(rootGroup)), [rootGroup]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ passed: boolean; details: ConditionEvalDetail[] } | null>(null);

  const runTest = () => {
    const details: ConditionEvalDetail[] = [];
    const input: Record<string, string | number | boolean> = {};
    for (const key of fieldKeys) {
      const field = getField(key);
      let v: string | number | boolean = values[key] ?? "";
      if (field?.type === "number" || field?.type === "currency") v = parseFloat(String(v)) || 0;
      if (field?.type === "boolean") v = v === "true";
      input[key] = v;
    }
    const passed = evaluateGroup(rootGroup, input, details);
    setResult({ passed, details });
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold">
        <FlaskConical className="size-3.5 text-primary" /> Inline Rule Testing
      </div>

      {fieldKeys.length === 0 ? (
        <p className="text-xs text-muted-foreground">Add conditions above to enable inline testing.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            {fieldKeys.map((key) => {
              const field = getField(key);
              return (
                <div key={key} className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">{field?.label ?? key}</label>
                  {field?.type === "boolean" ? (
                    <Select items={{ true: "Yes", false: "No" }} value={values[key]} onValueChange={(v) => setValues((s) => ({ ...s, [key]: v as string }))}>
                      <SelectTrigger size="sm" className="h-8 w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : field?.type === "enum" && field.options ? (
                    <Select value={values[key]} onValueChange={(v) => setValues((s) => ({ ...s, [key]: v ?? "" }))}>
                      <SelectTrigger size="sm" className="h-8 w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {field.options.map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={field?.type === "number" || field?.type === "currency" ? "number" : "text"}
                      value={values[key] ?? ""}
                      onChange={(e) => setValues((s) => ({ ...s, [key]: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <Button size="sm" className="mt-3 w-full gap-1.5" onClick={runTest}>
            <PlayCircle className="size-3.5" /> Run Test
          </Button>

          {result && (
            <div className="mt-3 space-y-2 border-t pt-3">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold",
                  result.passed ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
                )}
              >
                {result.passed ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                {result.passed ? "RULE PASSED" : "RULE FAILED"}
                {result.passed && actions.length > 0 && (
                  <span className="ml-auto font-normal text-foreground/70">
                    Action: {actions.map((a) => a.type).join(", ")}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {result.details.map((d, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1 text-[11px]">
                    <span>
                      {d.field} {d.operator} {d.expected}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-muted-foreground">actual: {d.actual}</span>
                      {d.passed ? <CheckCircle2 className="size-3 text-emerald-500" /> : <XCircle className="size-3 text-red-500" />}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
