"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PlayCircle, RotateCcw } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Domain, SimulationResult } from "@/lib/types";
import { runSimulation } from "@/lib/engine";
import { lookupInterestRate, lookupHaircut, lookupPremium } from "@/lib/matrix-lookup";
import { SCENARIO_PRESETS, PresetKey } from "@/lib/scenario-presets";
import { iconForIndustry } from "@/lib/industries";
import { DynamicForm, SimValues } from "@/components/simulator/dynamic-form";
import { DecisionBanner } from "@/components/simulator/decision-banner";
import { DecisionCallout } from "@/components/simulator/decision-callout";
import { ExecutionTimeline } from "@/components/simulator/execution-timeline";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

function SimulatorContent() {
  const searchParams = useSearchParams();
  const rules = useAppStore((s) => s.rules);
  const matrices = useAppStore((s) => s.matrices);
  const industries = useAppStore((s) => s.industries);
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const addSimulation = useAppStore((s) => s.addSimulation);
  const logAudit = useAppStore((s) => s.logAudit);
  const currentUser = useAppStore((s) => s.currentUser);

  const initialDomain = (searchParams.get("domain") as Domain) || industries[0]?.id || "";
  const initialPreset = (searchParams.get("preset") as PresetKey) || "happy";
  const [domain, setDomain] = useState<Domain>(initialDomain);
  const [values, setValues] = useState<SimValues>(() => SCENARIO_PRESETS[initialDomain]?.[initialPreset] ?? {});
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);

  const switchDomain = (d: Domain) => {
    setDomain(d);
    setValues(SCENARIO_PRESETS[d]?.happy ?? {});
    setResult(null);
  };

  const applyPreset = (preset: PresetKey) => {
    setValues(SCENARIO_PRESETS[domain]?.[preset] ?? {});
    setResult(null);
  };

  const runScenario = () => {
    setRunning(true);
    const input: Record<string, string | number | boolean> = { ...values };

    if (domain === "Lending") {
      const income = Number(values.monthly_income) || 1;
      const liabilities = Number(values.monthly_liabilities) || 0;
      input.dti_ratio = Math.round((liabilities / income) * 100);
    }

    setTimeout(() => {
      const sim = runSimulation(domain, rules, input, fieldCatalog);

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

      setResult(sim);
      addSimulation(sim);
      logAudit({
        user: currentUser.name,
        action: "Ran Simulation",
        entity: "Simulation",
        entityId: sim.id,
        details: `${domain} scenario, outcome ${sim.outcome}.`,
      });
      toast[sim.outcome === "Approved" ? "success" : sim.outcome === "Rejected" ? "error" : "warning"](
        `Simulation complete: ${sim.outcome}`,
        { description: sim.summary }
      );
      setRunning(false);
    }, 350);
  };

  const triggeredRuleObjs = result ? rules.filter((r) => result.triggeredRules.includes(r.id)) : [];

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
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => applyPreset("happy")}>Happy Path</Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => applyPreset("reject")}>Rejection Path</Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => applyPreset("review")}>Review Path</Button>
              </div>

              <DynamicForm domain={domain} values={values} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} />
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
            {!result ? (
              <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center">
                <PlayCircle className="size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Configure a scenario and click Run Simulation</p>
                <p className="text-xs text-muted-foreground/70">Or try a preset from the left panel for an instant demo</p>
              </div>
            ) : (
              <>
                <DecisionBanner result={result} />
                <DecisionCallout result={result} />

                {triggeredRuleObjs.length > 0 && (
                  <div className="rounded-xl border bg-card p-4">
                    <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Triggered Rules</p>
                    <div className="flex flex-wrap gap-2">
                      {triggeredRuleObjs.map((r) => (
                        <div key={r.id} className="flex items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5 text-xs">
                          <span className="font-mono text-muted-foreground">{r.id}</span>
                          <span className="font-medium">{r.name}</span>
                          <StatusBadge status={r.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <ExecutionTimeline trace={result.trace} />
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
