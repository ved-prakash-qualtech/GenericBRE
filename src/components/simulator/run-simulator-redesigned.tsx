"use client";

import { useState } from "react";
import { Download, RotateCcw, PlayCircle, Copy, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Product, TraceStep } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { UseRunSimulatorResult } from "./run-simulator-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RunSimulatorRedesignedProps {
  product: Product;
  sim: UseRunSimulatorResult;
  products?: Product[];
  onProductChange?: (product: Product) => void;
}

// One-line summaries of a single rule's trace step, derived entirely from the
// engine's real conditionSummaries/actions — no hardcoded rule content.
function inputSummary(step: TraceStep): string {
  if (step.conditionSummaries.length === 0) return "—";
  return step.conditionSummaries.map((c) => `${c.field} = ${c.actual}`).join(", ");
}
function conditionSummary(step: TraceStep): string {
  if (step.conditionSummaries.length === 0) return "matches every case";
  return step.conditionSummaries.map((c) => `${c.field} ${c.operator} ${c.expected}`).join(", ");
}
function outputSummary(step: TraceStep): string {
  if (step.producedValues && Object.keys(step.producedValues).length > 0) {
    return Object.entries(step.producedValues).map(([k, v]) => `${k} = ${v}`).join(", ");
  }
  if (step.actionsApplied.length > 0) {
    return step.actionsApplied.map((a) => a.type).join(", ");
  }
  return step.status === "Passed" ? "matched" : "—";
}

const STATUS_STYLES: Record<TraceStep["status"], string> = {
  Passed: "bg-emerald-100 text-emerald-700",
  Failed: "bg-red-100 text-red-700",
  Skipped: "bg-gray-100 text-gray-600",
  "Not Applicable": "bg-gray-100 text-gray-600",
};

export function RunSimulatorRedesigned({ product, sim, products = [], onProductChange }: RunSimulatorRedesignedProps) {
  const [copiedRequest, setCopiedRequest] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

  const result = sim.decisionResult;

  // Real per-product execution plan (Rule Sequencer order), never hardcoded.
  const executionPlan = sim.mappedRules;

  // Step completion driven by actual state, not literals.
  const jsonReady = (sim.jsonText ?? "").trim().length > 0;
  const steps = [
    { num: 1, label: "Select Product", completed: true },
    { num: 2, label: "Product Summary", completed: true },
    { num: 3, label: "Template JSON", completed: jsonReady },
    { num: 4, label: "Execution Plan", completed: executionPlan.length > 0 },
    { num: 5, label: "Run Simulation", completed: sim.running || !!result, active: sim.running },
    { num: 6, label: "Results", completed: !!result },
  ];

  const handleProductChange = (productId: string | null) => {
    if (!productId) return;
    const selected = products.find((p) => p.id === productId);
    if (selected && onProductChange) onProductChange(selected);
  };

  const handleCopyJson = (text: string, isResponse: boolean) => {
    navigator.clipboard.writeText(text);
    if (isResponse) {
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    } else {
      setCopiedRequest(true);
      setTimeout(() => setCopiedRequest(false), 2000);
    }
    toast.success("Copied to clipboard");
  };

  const handleFormatJson = () => {
    try {
      sim.setJsonText(JSON.stringify(JSON.parse(sim.jsonText || "{}"), null, 2));
    } catch {
      toast.error("Invalid JSON", { description: "Fix the syntax before formatting." });
    }
  };

  // Panels 2 & 3 are always derived, product/rule-driven, never hardcoded —
  // Panel 3 shows the full contract shape (empty) before a run, and the real
  // result (populated in place) after one, via sim.responseShape.
  const apiRequestJson = JSON.stringify(sim.apiRequestEnvelope, null, 2);
  const apiResponseJson = JSON.stringify(sim.responseShape, null, 2);

  const availableProducts = products.length > 0 ? products : [product];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      {/* Step Indicator */}
      <div className="flex items-center gap-3 border-b bg-card px-6 py-3.5 overflow-x-auto">
        {steps.map((step, idx) => (
          <div key={step.num} className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white",
                  step.completed ? "bg-emerald-500" : step.active ? "bg-primary animate-pulse" : "bg-muted-foreground/40"
                )}
              >
                {step.completed ? "✓" : step.num}
              </div>
              <span className="text-xs whitespace-nowrap text-muted-foreground font-medium">{step.label}</span>
            </div>
            {idx < steps.length - 1 && <div className="h-0.5 w-8 bg-border" />}
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-5 space-y-4 min-h-full">
          <div className="grid grid-cols-12 gap-4 items-start">
            {/* Left Column - 6 cols */}
            <div className="col-span-12 lg:col-span-6 space-y-4">
              {/* Select Product */}
              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold">Select Product</h3>
                <div className="space-y-2">
                  <Select
                    items={Object.fromEntries(availableProducts.map((p) => [p.id, p.name]))}
                    value={product.id}
                    onValueChange={handleProductChange}
                  >
                    <SelectTrigger className="w-full h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProducts.map((prod) => (
                        <SelectItem key={prod.id} value={prod.id}>
                          {prod.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge
                    className={cn(
                      "border-0 w-fit",
                      product.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {product.status}
                  </Badge>
                </div>
              </div>

              {/* Product Summary Table */}
              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold">Product Summary</h3>
                <div className="border rounded-lg overflow-hidden bg-card">
                  <table className="w-full text-xs">
                    <tbody className="divide-y">
                      <tr>
                        <td className="px-3 py-2.5 text-muted-foreground">Product Name</td>
                        <td className="px-3 py-2.5 font-medium text-right">{product.name}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2.5 text-muted-foreground">Domain</td>
                        <td className="px-3 py-2.5 font-medium text-right">{product.domain}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2.5 text-muted-foreground">Mapped Rules</td>
                        <td className="px-3 py-2.5 font-medium text-right">{executionPlan.length}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2.5 text-muted-foreground">Last Updated</td>
                        <td className="px-3 py-2.5 font-medium text-right">
                          {new Date(product.updatedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Template JSON Section - Editable */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Template JSON (Input)</h3>
                  <div className="flex gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      title="Copy"
                      onClick={() => handleCopyJson(sim.jsonText || "{}", false)}
                    >
                      {copiedRequest ? (
                        <Check className="size-4 text-emerald-600" />
                      ) : (
                        <Copy className="size-4 text-gray-600" />
                      )}
                    </Button>
                    <Button size="icon-sm" variant="ghost" className="hover:bg-gray-100" title="Format" onClick={handleFormatJson}>
                      <Sparkles className="size-4 text-gray-600" />
                    </Button>
                    <Button size="icon-sm" variant="ghost" className="hover:bg-gray-100" title="Reset to Default" onClick={sim.resetToSampleJson}>
                      <RotateCcw className="size-4 text-gray-600" />
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={sim.jsonText || "{}"}
                  onChange={(e) => sim.setJsonText(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="font-mono text-xs max-h-40 overflow-y-auto bg-gray-900 text-gray-100 border-gray-700"
                />
              </div>

              {/* Run Simulation Button */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={sim.resetToSampleJson}>
                  <RotateCcw className="size-3.5" /> Reset
                </Button>
                <Button
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={sim.runScenario}
                  disabled={sim.running}
                >
                  <PlayCircle className="size-3.5" /> {sim.running ? "Running..." : "Run Simulation"}
                </Button>
              </div>
            </div>

            {/* Right Column - 6 cols */}
            <div className="col-span-12 lg:col-span-6 space-y-2">
              {/* Simulation Summary */}
              <div className="rounded-lg border bg-card p-3 space-y-2">
                <h3 className="font-semibold text-xs">Simulation Summary</h3>
                <div className="space-y-0.5 text-[11px] border-b pb-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Product</span>
                    <span className="font-medium">{product.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mapped Rules</span>
                    <span className="font-medium">{executionPlan.length}</span>
                  </div>
                </div>
                <div className="space-y-0.5 text-[11px] border-b pb-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Passed</span>
                    <span className="font-medium text-emerald-600">{result ? result.flatTrace.filter((t) => t.status === "Passed").length : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Failed</span>
                    <span className="font-medium text-red-600">{result ? result.flatTrace.filter((t) => t.status === "Failed").length : "—"}</span>
                  </div>
                </div>
                {result ? (
                  <div className="flex flex-wrap gap-1">
                    <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0 px-2 py-1">COMPLETED</Badge>
                    <Badge
                      className={cn(
                        "text-[10px] border-0 px-2 py-1",
                        result.outcome === "Approved"
                          ? "bg-emerald-100 text-emerald-700"
                          : result.outcome === "Rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                      )}
                    >
                      {result.outcome.toUpperCase()}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-[10.5px] text-muted-foreground">Run the simulation to see the decision.</p>
                )}
              </div>

              {/* API Request */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold">API Request</h3>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => handleCopyJson(apiRequestJson, false)}
                    title="Copy"
                  >
                    {copiedRequest ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                  </Button>
                </div>
                <div className="rounded-lg border bg-gray-900 p-2 font-mono text-[10px] text-gray-100 max-h-24 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{apiRequestJson}</pre>
                </div>
              </div>

              {/* Final Output (Response JSON) — always populated: the full
                  contract shape (empty values) before a run, real values
                  after, via sim.responseShape. Never gated on a run. */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold">Final Output (Response JSON)</h3>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => handleCopyJson(apiResponseJson, true)}
                    title="Copy"
                  >
                    {copiedResponse ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                  </Button>
                </div>
                <div className="rounded-lg border bg-gray-900 p-2 font-mono text-[10px] text-gray-100 max-h-24 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{apiResponseJson}</pre>
                </div>
              </div>
            </div>
          </div>

          {/* Full Width Execution Plan Section */}
          <div className="space-y-2.5">
            <h3 className="text-sm font-semibold">Execution Plan (Rule Sequence)</h3>
            {executionPlan.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
                No rules are mapped to {product.name}. Map rules to this product to build an execution plan.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {executionPlan.map((rule, idx) => (
                  <div key={rule.id} className="flex flex-col items-center gap-1 p-2 border rounded-lg bg-card hover:bg-accent/50">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                      {idx + 1}
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-medium">{rule.id}</div>
                      <div className="text-[9px] text-muted-foreground leading-tight">{rule.name}</div>
                      {rule.ruleType && <Badge className="mt-0.5 text-[8px] bg-blue-50 text-blue-700 border-0 px-1 py-0">{rule.ruleType}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Full Width Simulation Timeline - Below Execution Plan */}
          {result && result.flatTrace.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-sm font-semibold">Simulation Timeline</h3>
              <div className="border rounded-lg overflow-hidden bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-semibold">Rule</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Input</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Condition</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Output</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Status</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {result.flatTrace.map((step) => (
                        <tr key={step.ruleId} className="hover:bg-accent/40">
                          <td className="px-3 py-2.5 font-medium">
                            <div>{step.ruleId}</div>
                            <div className="text-[10px] text-muted-foreground">{step.ruleName}</div>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">{inputSummary(step)}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{conditionSummary(step)}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{outputSummary(step)}</td>
                          <td className="px-3 py-2.5">
                            <Badge className={cn("border-0", STATUS_STYLES[step.status])}>{step.status}</Badge>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">{step.durationMs.toFixed(1)} ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Success Message & Footer */}
      <div className="border-t bg-card p-4 space-y-3">
        {result && (
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg border px-4 py-3",
              result.outcome === "Approved"
                ? "bg-emerald-50 border-emerald-200"
                : result.outcome === "Rejected"
                  ? "bg-red-50 border-red-200"
                  : "bg-amber-50 border-amber-200"
            )}
          >
            <Check
              className={cn(
                "size-5 shrink-0",
                result.outcome === "Approved"
                  ? "text-emerald-600"
                  : result.outcome === "Rejected"
                    ? "text-red-600"
                    : "text-amber-600"
              )}
            />
            <div>
              <p className="text-sm font-semibold">Simulation Completed — {result.outcome}</p>
              <p className="text-xs text-muted-foreground">{result.summary}</p>
            </div>
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <Button size="sm" className="gap-1.5" disabled={!result}>
            <Download className="size-3.5" /> Download Full Report
          </Button>
        </div>
      </div>
    </div>
  );
}
