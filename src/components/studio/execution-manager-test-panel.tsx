"use client";

import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { resolveMapping } from "@/lib/execution-manager";
import { runRuleSetExecution } from "@/lib/engine";
import { fromRuleSetExecution, resolveDecisionResponseConfig, buildApiResponsePayload } from "@/lib/decision-response";
import { DecisionResult, ResponseMode } from "@/lib/types";
import { DynamicForm, SimValues } from "@/components/simulator/dynamic-form";
import { DecisionResultView } from "@/components/simulator/decision-result-view";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { VisualFlow } from "./rule-set-mapping-manager";

export function ExecutionManagerTestPanel() {
  const industries = useAppStore((s) => s.industries);
  const requestParameterDefs = useAppStore((s) => s.requestParameterDefs);
  const ruleExecutionMappings = useAppStore((s) => s.ruleExecutionMappings);
  const ruleGroups = useAppStore((s) => s.ruleGroups);
  const rules = useAppStore((s) => s.rules);
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const decisionResponseSettings = useAppStore((s) => s.decisionResponseSettings);
  const logAudit = useAppStore((s) => s.logAudit);
  const currentUser = useAppStore((s) => s.currentUser);

  const [params, setParams] = useState<Record<string, string>>({});
  const [resolved, setResolved] = useState<{ tried: boolean; mappingId: string | null }>({ tried: false, mappingId: null });
  const [caseValues, setCaseValues] = useState<SimValues>({});
  const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null);
  const [responseMode, setResponseMode] = useState<ResponseMode>("decision-explanation");

  const matched = resolved.mappingId ? ruleExecutionMappings.find((m) => m.id === resolved.mappingId) ?? null : null;

  const resolve = () => {
    const match = resolveMapping(ruleExecutionMappings, params);
    setResolved({ tried: true, mappingId: match?.id ?? null });
    setDecisionResult(null);
    setCaseValues({});
  };

  const run = () => {
    if (!matched) return;
    const result = runRuleSetExecution(matched, rules, ruleGroups, caseValues, fieldCatalog, "Prod");
    const domain = params.industry || matched.conditions.industry || "";
    const dr = fromRuleSetExecution(result, rules, domain, "Prod", caseValues);
    const responseConfig = resolveDecisionResponseConfig(decisionResponseSettings, { mappingId: matched.id, industry: domain });
    setDecisionResult(dr);
    setResponseMode(responseConfig.defaultMode);
    logAudit({
      user: currentUser.name,
      action: "Ran Execution Manager Test",
      entity: "RuleExecutionMapping",
      entityId: matched.id,
      details: `Test run for mapping "${matched.name}", outcome ${dr.outcome}.`,
      decisionContext: responseConfig.enableAuditLogging
        ? {
            correlationId: dr.correlationId,
            environment: "Prod",
            triggeredRules: dr.triggeredRules,
            ruleVersions: dr.ruleVersions,
            executionTimeMs: dr.totalDurationMs,
            requestPayload: dr.input,
            responsePayload: buildApiResponsePayload(dr, "full-audit", responseConfig),
          }
        : undefined,
    });
  };

  const activeConfig = decisionResult
    ? resolveDecisionResponseConfig(decisionResponseSettings, { mappingId: decisionResult.mappingId, industry: decisionResult.domain })
    : null;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Enter sample request parameters to see which mapping resolves, its execution sequence, and — with a live test
        case — a real trace through the actual tagged rules.
      </p>

      <div className="space-y-2 rounded-xl border bg-card p-3.5">
        <Label>Sample Request Parameters</Label>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground">Industry</span>
            <Select value={params.industry ?? ""} onValueChange={(v) => setParams((p) => ({ ...p, industry: (v as string) ?? "" }))}>
              <SelectTrigger size="sm" className="h-8 w-full"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any</SelectItem>
                {industries.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {requestParameterDefs.map((def) => (
            <div key={def.id} className="space-y-1">
              <span className="text-[10px] font-medium text-muted-foreground">{def.label}</span>
              <Input
                value={params[def.id] ?? ""}
                onChange={(e) => setParams((p) => ({ ...p, [def.id]: e.target.value }))}
                placeholder="Any"
                className="h-8 text-xs"
              />
            </div>
          ))}
        </div>
        <Button size="sm" className="gap-1.5" onClick={resolve}>
          <PlayCircle className="size-3.5" /> Resolve Mapping
        </Button>
      </div>

      {resolved.tried && (
        <div className="space-y-3 rounded-xl border bg-card p-3.5">
          {!matched ? (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">No mapping matched.</span> This request would fall back to
              the plain, single-industry Priority Configuration default.
            </p>
          ) : (
            <>
              <p className="text-xs">
                <span className="font-semibold text-foreground">Matched:</span> {matched.name}
              </p>
              <VisualFlow steps={matched.steps} ruleGroupsById={new Map(ruleGroups.map((g) => [g.id, g.name]))} />

              {params.industry && (
                <div className="space-y-2 border-t pt-3">
                  <Label className="text-[11px] text-muted-foreground">
                    Optional: fill in a test case to run a real execution trace
                  </Label>
                  <DynamicForm
                    domain={params.industry}
                    values={caseValues}
                    onChange={(key, value) => setCaseValues((v) => ({ ...v, [key]: value }))}
                  />
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={run}>
                    <PlayCircle className="size-3.5" /> Run Execution
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {decisionResult && activeConfig && (
        <DecisionResultView
          result={decisionResult}
          config={activeConfig}
          mode={responseMode}
          onModeChange={setResponseMode}
          rules={rules}
        />
      )}
    </div>
  );
}
