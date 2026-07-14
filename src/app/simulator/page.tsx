"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FlaskConical, PlayCircle, RotateCcw } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Domain, RuleEnvironment, DecisionResult, ResponseMode } from "@/lib/types";
import { runSimulation } from "@/lib/engine";
import { fromSimulation, resolveDecisionResponseConfig, buildApiResponsePayload } from "@/lib/decision-response";
import { getField } from "@/lib/fields";
import { lookupInterestRate, lookupHaircut, lookupPremium } from "@/lib/matrix-lookup";
import { SCENARIO_PRESETS, PresetKey } from "@/lib/scenario-presets";
import { iconForIndustry } from "@/lib/industries";
import { DynamicForm, SimValues } from "@/components/simulator/dynamic-form";
import { DecisionResultView } from "@/components/simulator/decision-result-view";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

function SimulatorContent() {
  const searchParams = useSearchParams();
  const rules = useAppStore((s) => s.rules);
  const matrices = useAppStore((s) => s.matrices);
  const industries = useAppStore((s) => s.industries);
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const executionSettings = useAppStore((s) => s.executionSettings);
  const decisionResponseSettings = useAppStore((s) => s.decisionResponseSettings);
  const addSimulation = useAppStore((s) => s.addSimulation);
  const logAudit = useAppStore((s) => s.logAudit);
  const currentUser = useAppStore((s) => s.currentUser);

  const initialDomain = (searchParams.get("domain") as Domain) || industries[0]?.id || "";
  const initialPreset = (searchParams.get("preset") as PresetKey) || "happy";
  const initialSandboxRule = searchParams.get("sandboxRule");
  const initialEnvironment = (searchParams.get("environment") as RuleEnvironment) || "Prod";
  const [domain, setDomain] = useState<Domain>(initialDomain);
  const [values, setValues] = useState<SimValues>(() => SCENARIO_PRESETS[initialDomain]?.[initialPreset] ?? {});
  const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null);
  const [responseMode, setResponseMode] = useState<ResponseMode>(
    () => resolveDecisionResponseConfig(decisionResponseSettings, { industry: initialDomain }).defaultMode
  );
  const [running, setRunning] = useState(false);
  const [sandboxRuleId, setSandboxRuleId] = useState<string | null>(initialSandboxRule);
  const [environment, setEnvironment] = useState<RuleEnvironment>(initialEnvironment);

  const testingRulesInDomain = rules.filter((r) => r.domain === domain && r.status === "Testing");

  const switchDomain = (d: Domain) => {
    setDomain(d);
    setValues(SCENARIO_PRESETS[d]?.happy ?? {});
    setDecisionResult(null);
    setSandboxRuleId(null);
    setResponseMode(resolveDecisionResponseConfig(decisionResponseSettings, { industry: d }).defaultMode);
  };

  const applyPreset = (preset: PresetKey) => {
    setValues(SCENARIO_PRESETS[domain]?.[preset] ?? {});
    setDecisionResult(null);
  };

  const runScenario = () => {
    setRunning(true);
    const input: Record<string, string | number | boolean | (string | number | boolean)[]> = { ...values };

    // List fields are edited as a comma-separated string (see DynamicForm) —
    // parse into a typed array here, right before evaluation.
    for (const key of Object.keys(input)) {
      const field = getField(fieldCatalog, key);
      if (field?.type === "list" && typeof input[key] === "string") {
        input[key] = String(input[key])
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => {
            if (field.itemType === "number" || field.itemType === "currency") return parseFloat(s) || 0;
            if (field.itemType === "boolean") return s.toLowerCase() === "true" || s === "yes";
            return s;
          });
      }
    }

    if (domain === "Lending") {
      const income = Number(values.monthly_income) || 1;
      const liabilities = Number(values.monthly_liabilities) || 0;
      input.dti_ratio = Math.round((liabilities / income) * 100);
    }

    setTimeout(() => {
      const sim = runSimulation(
        domain,
        rules,
        input,
        fieldCatalog,
        sandboxRuleId ? [sandboxRuleId] : [],
        environment,
        executionSettings[domain] ?? executionSettings.default ?? { conflictResolution: "execute-all" }
      );

      if (sim.outcome !== "Rejected") {
        if (domain === "Lending") {
          const matrix = matrices.find((m) => m.id === "MTX-LEND-01")!;
          const { calculatedValues } = lookupInterestRate(matrix, Number(values.credit_score));
          Object.assign(sim.calculatedValues, calculatedValues);
        } else if (domain === "NBFC") {
          const matrix = matrices.find((m) => m.id === "MTX-NBFC-01")!;
          const { calculatedValues } = lookupHaircut(matrix, String(values.collateral_type), Number(values.appraised_value));
          Object.assign(sim.calculatedValues, calculatedValues);
        } else if (domain === "Insurance") {
          const matrix = matrices.find((m) => m.id === "MTX-INS-01")!;
          const { calculatedValues } = lookupPremium(matrix, Number(values.applicant_age), Boolean(values.smoker));
          Object.assign(sim.calculatedValues, calculatedValues);
        }
      }

      const dr = fromSimulation(sim, rules, environment);
      const responseConfig = resolveDecisionResponseConfig(decisionResponseSettings, { industry: domain });
      setDecisionResult(dr);
      setResponseMode(responseConfig.defaultMode);
      // Sandbox previews (a rule still in Testing) aren't production activity —
      // keep them out of the "Simulations Run" history/KPI, log them distinctly.
      if (!sim.sandbox) {
        addSimulation(sim);
      }
      logAudit({
        user: currentUser.name,
        action: sim.sandbox ? "Ran Sandbox Test" : "Ran Simulation",
        entity: "Simulation",
        entityId: sim.id,
        details: sim.sandbox
          ? `${domain} scenario against pending rule ${sandboxRuleId}, outcome ${sim.outcome} (sandbox — not live).`
          : `${domain} scenario, outcome ${sim.outcome}.`,
        decisionContext: responseConfig.enableAuditLogging
          ? {
              correlationId: dr.correlationId,
              environment,
              triggeredRules: dr.triggeredRules,
              ruleVersions: dr.ruleVersions,
              executionTimeMs: dr.totalDurationMs,
              requestPayload: dr.input,
              responsePayload: buildApiResponsePayload(dr, "full-audit", responseConfig),
            }
          : undefined,
      });
      toast[sim.outcome === "Approved" ? "success" : sim.outcome === "Rejected" ? "error" : "warning"](
        `Simulation complete: ${sim.outcome}`,
        { description: sim.summary }
      );
      setRunning(false);
    }, 350);
  };

  const activeConfig = resolveDecisionResponseConfig(decisionResponseSettings, { industry: domain });

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b bg-card/40 px-5 py-3.5 sm:px-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Rule Simulator</h1>
          <p className="text-xs text-muted-foreground">Test live rules against realistic customer scenarios</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex w-full shrink-0 flex-col border-b lg:h-full lg:w-100 lg:border-b-0 lg:border-r">
          <div className="flex gap-1.5 border-b p-3">
            {industries.map((i) => {
              const Icon = iconForIndustry(i.icon);
              return (
                <button
                  key={i.id}
                  onClick={() => switchDomain(i.id)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-[11px] font-medium transition-colors",
                    domain === i.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"
                  )}
                >
                  <Icon className="size-4" />
                  {i.name}
                </button>
              );
            })}
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 p-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground">Environment Tier</label>
                <div className="flex overflow-hidden rounded-lg border text-xs">
                  {(["Dev", "UAT", "Prod"] as RuleEnvironment[]).map((env) => (
                    <button
                      key={env}
                      onClick={() => {
                        setEnvironment(env);
                        setDecisionResult(null);
                      }}
                      className={cn(
                        "flex-1 py-1.5 font-medium transition-colors",
                        environment === env ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                      )}
                    >
                      {env}
                    </button>
                  ))}
                </div>
                <p className="text-[10.5px] text-muted-foreground">
                  Only rules promoted at least this far are evaluated — a client-side preview of environment promotion,
                  not a separately deployed environment.
                </p>
              </div>

              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => applyPreset("happy")}>Happy Path</Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => applyPreset("reject")}>Rejection Path</Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => applyPreset("review")}>Review Path</Button>
              </div>

              <DynamicForm domain={domain} values={values} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} />

              {testingRulesInDomain.length > 0 && (
                <div className="space-y-1.5 rounded-lg border p-3">
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                    <FlaskConical className="size-3 text-amber-500" /> Sandbox test a pending rule
                  </label>
                  <p className="text-[10.5px] text-muted-foreground">
                    Include one Testing-stage rule in this run to preview its effect before approving. Never affects live results.
                  </p>
                  <Select
                    value={sandboxRuleId ?? "none"}
                    onValueChange={(v) => setSandboxRuleId(v === "none" ? null : (v ?? null))}
                  >
                    <SelectTrigger size="sm" className="h-8 w-full"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (production rules only)</SelectItem>
                      {testingRulesInDomain.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.id} — {r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-2 border-t p-3">
            <Button variant="outline" size="icon" onClick={() => applyPreset("happy")}>
              <RotateCcw className="size-4" />
            </Button>
            <Button className="flex-1 gap-1.5" onClick={runScenario} disabled={running}>
              <PlayCircle className="size-4" /> {running ? "Running..." : "Run Simulation"}
            </Button>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 p-5 sm:p-6">
            {!decisionResult ? (
              <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center">
                <PlayCircle className="size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Configure a scenario and click Run Simulation</p>
                <p className="text-xs text-muted-foreground/70">Or try a preset from the left panel for an instant demo</p>
              </div>
            ) : (
              <>
                {decisionResult.sandbox && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
                    <FlaskConical className="size-4 shrink-0" />
                    <p>
                      <span className="font-semibold">Sandbox Test</span> — this run includes a rule still in Testing
                      status. It previews the effect of approving that rule; it is not a live production decision and
                      isn&apos;t counted in simulation history.
                    </p>
                  </div>
                )}
                <DecisionResultView
                  result={decisionResult}
                  config={activeConfig}
                  mode={responseMode}
                  onModeChange={setResponseMode}
                  rules={rules}
                />
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export default function SimulatorPage() {
  return (
    <Suspense fallback={null}>
      <SimulatorContent />
    </Suspense>
  );
}
