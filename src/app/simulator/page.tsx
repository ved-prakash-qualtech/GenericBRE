"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FlaskConical, PlayCircle, RotateCcw } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Product, BusinessField, BusinessRule, DecisionResult, ResponseMode } from "@/lib/types";
import { getMappedRules, executeRulesByProduct } from "@/lib/product-rule-engine";
import { collectFieldKeys } from "@/lib/condition-tree";
import { buildSampleRequestJson } from "@/lib/sample-json";
import { fromSimulation, resolveDecisionResponseConfig, buildApiResponsePayload } from "@/lib/decision-response";
import { lookupInterestRate, lookupHaircut, lookupPremium } from "@/lib/matrix-lookup";
import { ProductKpiCards } from "@/components/simulator/product-kpi-cards";
import { SampleJsonPanel } from "@/components/rule-builder/sample-json-panel";
import { DecisionResultView } from "@/components/simulator/decision-result-view";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function sampleJsonTextFor(mappedRules: BusinessRule[], fieldCatalog: BusinessField[]): string {
  const keys = new Set<string>();
  for (const r of mappedRules) collectFieldKeys(r.rootGroup).forEach((k) => keys.add(k));
  return JSON.stringify(buildSampleRequestJson(fieldCatalog, Array.from(keys)), null, 2);
}

function SimulatorContent() {
  const searchParams = useSearchParams();
  const rules = useAppStore((s) => s.rules);
  const matrices = useAppStore((s) => s.matrices);
  const products = useAppStore((s) => s.products);
  const industries = useAppStore((s) => s.industries);
  const productRuleMappings = useAppStore((s) => s.productRuleMappings);
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const executionSettings = useAppStore((s) => s.executionSettings);
  const decisionResponseSettings = useAppStore((s) => s.decisionResponseSettings);
  const addSimulation = useAppStore((s) => s.addSimulation);
  const logAudit = useAppStore((s) => s.logAudit);
  const currentUser = useAppStore((s) => s.currentUser);

  const initialProductId = searchParams.get("productId") || (searchParams.get("domain") && products.find((p) => p.domain === searchParams.get("domain"))?.id);
  const initialSandboxRule = searchParams.get("sandboxRule");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(
    () => products.find((p) => p.id === initialProductId) ?? products.find((p) => p.status === "Active") ?? null
  );
  const domain = selectedProduct?.domain ?? "";
  const [jsonText, setJsonText] = useState<string>(() =>
    sampleJsonTextFor(selectedProduct ? getMappedRules(selectedProduct.id, rules, productRuleMappings) : [], fieldCatalog)
  );
  const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null);
  const [responseMode, setResponseMode] = useState<ResponseMode>(
    () => resolveDecisionResponseConfig(decisionResponseSettings, { industry: domain }).defaultMode
  );
  const [running, setRunning] = useState(false);
  const [sandboxRuleId, setSandboxRuleId] = useState<string | null>(initialSandboxRule);
  // environment state removed — FUTURE: restore when environment promotion is reintroduced

  const mappedRules = useMemo(
    () => (selectedProduct ? getMappedRules(selectedProduct.id, rules, productRuleMappings) : []),
    [selectedProduct, rules, productRuleMappings]
  );
  const testingMappedRules = mappedRules.filter((r) => r.status === "Testing");
  const mappedRuleIdsKey = mappedRules.map((r) => r.id).join(",");

  // Auto Synchronization (requirement 7) — regenerate the sample JSON
  // whenever the selected product's mapped-rule set changes (mapped/unmapped,
  // or a different product), so the input always matches the live
  // configuration without any manual refresh.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJsonText(sampleJsonTextFor(mappedRules, fieldCatalog));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct?.id, mappedRuleIdsKey]);

  const switchProduct = (p: Product) => {
    setSelectedProduct(p);
    setDecisionResult(null);
    setSandboxRuleId(null);
    setResponseMode(resolveDecisionResponseConfig(decisionResponseSettings, { industry: p.domain }).defaultMode);
  };

  const resetToSampleJson = () => {
    setJsonText(sampleJsonTextFor(mappedRules, fieldCatalog));
    setDecisionResult(null);
  };

  const runScenario = () => {
    if (!selectedProduct) return;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      toast.error("Invalid JSON", { description: "Fix the Sample Request JSON before running the simulation." });
      return;
    }

    setRunning(true);
    const input: Record<string, string | number | boolean> = { ...(parsed as Record<string, string | number | boolean>) };

    if (domain === "Lending") {
      const income = Number(input.monthly_income) || 1;
      const liabilities = Number(input.monthly_liabilities) || 0;
      input.dti_ratio = Math.round((liabilities / income) * 100);
    }

    setTimeout(() => {
      const execution = executeRulesByProduct(
        selectedProduct,
        rules,
        productRuleMappings,
        input,
        fieldCatalog,
        sandboxRuleId ? [sandboxRuleId] : [],
        executionSettings[domain] ?? executionSettings.default ?? { conflictResolution: "execute-all" }
      );

      if (!execution.ok || !execution.result) {
        toast.error("Couldn't run simulation", { description: execution.reason });
        setRunning(false);
        return;
      }
      const sim = execution.result;

      if (sim.outcome !== "Rejected") {
        if (domain === "Lending") {
          const matrix = matrices.find((m) => m.id === "MTX-LEND-01")!;
          const { calculatedValues } = lookupInterestRate(matrix, Number(input.credit_score));
          Object.assign(sim.calculatedValues, calculatedValues);
        } else if (domain === "NBFC") {
          const matrix = matrices.find((m) => m.id === "MTX-NBFC-01")!;
          const { calculatedValues } = lookupHaircut(matrix, String(input.collateral_type), Number(input.appraised_value));
          Object.assign(sim.calculatedValues, calculatedValues);
        } else if (domain === "Insurance") {
          const matrix = matrices.find((m) => m.id === "MTX-INS-01")!;
          const { calculatedValues } = lookupPremium(matrix, Number(input.applicant_age), Boolean(input.smoker));
          Object.assign(sim.calculatedValues, calculatedValues);
        }
      }

      const dr = fromSimulation(sim, rules);
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
          ? `${selectedProduct.name} scenario against pending rule ${sandboxRuleId}, outcome ${sim.outcome} (sandbox — not live).`
          : `${selectedProduct.name} scenario, outcome ${sim.outcome}.`,
        decisionContext: responseConfig.enableAuditLogging
          ? {
              correlationId: dr.correlationId,
              // environment removed — FUTURE: restore when environment promotion is reintroduced
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
          <p className="text-xs text-muted-foreground">
            Select a product to load its configured rules — validates the actual Product-Rule Mapping, not a static demo.
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex w-full shrink-0 flex-col border-b lg:h-full lg:w-125 lg:border-b-0 lg:border-r">
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 p-4">
              <ProductKpiCards
                products={products}
                industries={industries}
                rules={rules}
                mappings={productRuleMappings}
                selectedProductId={selectedProduct?.id}
                onSelect={switchProduct}
              />

              {selectedProduct && (
                <>
                  <SampleJsonPanel editable value={jsonText} onChange={setJsonText} />

                  {testingMappedRules.length > 0 && (
                    <div className="space-y-1.5 rounded-lg border p-3">
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                        <FlaskConical className="size-3 text-amber-500" /> Sandbox test a pending rule
                      </label>
                      <p className="text-[10.5px] text-muted-foreground">
                        Include one Testing-stage rule mapped to this product in this run to preview its effect before
                        approving. Never affects live results.
                      </p>
                      <Select
                        value={sandboxRuleId ?? "none"}
                        onValueChange={(v) => setSandboxRuleId(v === "none" ? null : (v ?? null))}
                      >
                        <SelectTrigger size="sm" className="h-8 w-full"><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (production rules only)</SelectItem>
                          {testingMappedRules.map((r) => (
                            <SelectItem key={r.id} value={r.id}>{r.id} — {r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-2 border-t p-3">
            <Button variant="outline" size="icon" onClick={resetToSampleJson} disabled={!selectedProduct} title="Reset to Sample JSON">
              <RotateCcw className="size-4" />
            </Button>
            <Button className="flex-1 gap-1.5" onClick={runScenario} disabled={running || !selectedProduct}>
              <PlayCircle className="size-4" /> {running ? "Running..." : "Run Simulation"}
            </Button>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 p-5 sm:p-6">
            {!decisionResult ? (
              <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center">
                <PlayCircle className="size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {selectedProduct ? "Edit the Sample JSON and click Run Simulation" : "Select a product to get started"}
                </p>
                <p className="text-xs text-muted-foreground/70">Only rules mapped to the selected product will execute</p>
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
