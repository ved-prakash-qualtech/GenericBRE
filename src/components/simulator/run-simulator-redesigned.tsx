"use client";

import { useState } from "react";
import { Download, RotateCcw, PlayCircle, Copy, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Product } from "@/lib/types";
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

export function RunSimulatorRedesigned({ product, sim, products = [], onProductChange }: RunSimulatorRedesignedProps) {
  const [copiedRequest, setCopiedRequest] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>(product.id);

  const handleProductChange = (productId: string | null) => {
    if (!productId) return;
    setSelectedProduct(productId);
    const selected = products.find((p) => p.id === productId);
    if (selected && onProductChange) {
      onProductChange(selected);
    }
  };

  const steps = [
    { num: 1, label: "Select Product", completed: true },
    { num: 2, label: "Product Summary", completed: true },
    { num: 3, label: "Template JSON", completed: true },
    { num: 4, label: "Execution Plan", completed: true },
    { num: 5, label: "Run Simulation", completed: sim.running || !!sim.decisionResult },
    { num: 6, label: "Results", completed: !!sim.decisionResult },
  ];

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

  const passedCount = sim.decisionResult?.flatTrace.filter((t) => t.status === "Passed").length ?? 0;
  const failedCount = sim.decisionResult?.flatTrace.filter((t) => t.status === "Failed").length ?? 0;
  const decisionLabel = sim.responseShape?.decision || "PENDING";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      {/* Step Indicator */}
      <div className="flex items-center gap-3 border-b bg-white px-6 py-3.5 overflow-x-auto">
        {steps.map((step, idx) => (
          <div key={step.num} className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white",
                  step.completed ? "bg-emerald-500" : "bg-gray-400"
                )}
              >
                {step.completed ? "✓" : step.num}
              </div>
              <span className="text-xs whitespace-nowrap text-gray-700 font-medium">{step.label}</span>
            </div>
            {idx < steps.length - 1 && <div className="h-0.5 w-8 bg-gray-300" />}
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-5 space-y-4 bg-white min-h-full">
          {/* Layout: Left (Select Product + Product Info + Template JSON) | Right (Summary + API) */}
          <div className="grid grid-cols-12 gap-4 items-start">
            {/* Left Column - 6 cols */}
            <div className="col-span-6 space-y-4">
              {/* Select Product with Product Info Beside */}
              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold text-gray-900">Select Product</h3>
                <div className="space-y-2">
                  <Select value={selectedProduct} onValueChange={handleProductChange}>
                    <SelectTrigger className="w-full border border-gray-300 h-9">
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
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 w-fit">{product.status}</Badge>
                </div>
              </div>

              {/* Product Summary Table */}
              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold text-gray-900">Product Summary</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="px-3 py-2.5 text-gray-600">Product Name</td>
                        <td className="px-3 py-2.5 font-medium text-gray-900 text-right">{product.name}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2.5 text-gray-600">Domain</td>
                        <td className="px-3 py-2.5 font-medium text-gray-900 text-right">{product.domain}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2.5 text-gray-600">Total Rules</td>
                        <td className="px-3 py-2.5 font-medium text-gray-900 text-right">{sim.mappedRules.length}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2.5 text-gray-600">Last Updated</td>
                        <td className="px-3 py-2.5 font-medium text-gray-900 text-right">
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
                  <h3 className="text-sm font-semibold text-gray-900">Template JSON (Input)</h3>
                  <div className="flex gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="hover:bg-gray-100"
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
                  className="font-mono text-xs max-h-40 overflow-y-auto bg-gray-900 text-gray-100 border-gray-200"
                />
              </div>

              {/* Run Simulation Button */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-gray-700"
                  onClick={sim.resetToSampleJson}
                >
                  <RotateCcw className="size-3.5" /> Reset
                </Button>
                <Button
                  size="sm"
                  className="flex-1 gap-1.5 bg-blue-600 hover:bg-blue-700"
                  onClick={sim.runScenario}
                  disabled={sim.running}
                >
                  <PlayCircle className="size-3.5" /> {sim.running ? "Running..." : "Run Simulation"}
                </Button>
              </div>
            </div>

            {/* Right Column - 6 cols */}
            <div className="col-span-6 space-y-2">
            {/* Simulation Summary - Compact */}
            <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
              <h3 className="font-semibold text-xs text-gray-900">Simulation Summary</h3>
              <div className="space-y-0.5 text-[11px] border-b pb-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Product</span>
                  <span className="font-medium">{product.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Rules</span>
                  <span className="font-medium">{sim.mappedRules.length}</span>
                </div>
              </div>
              <div className="space-y-0.5 text-[11px] border-b pb-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Passed</span>
                  <span className="font-medium text-emerald-600">{passedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Failed</span>
                  <span className="font-medium text-red-600">{failedCount}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <Badge className={cn("text-[10px] border-0 px-2 py-1", sim.decisionResult ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600")}>
                  {sim.decisionResult ? "COMPLETED" : "PENDING"}
                </Badge>
                <Badge
                  className={cn(
                    "text-[10px] border-0 px-2 py-1",
                    decisionLabel === "APPROVED" ? "bg-emerald-100 text-emerald-700" : decisionLabel === "REJECTED" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                  )}
                >
                  {decisionLabel}
                </Badge>
              </div>
            </div>

            {/* API Request - Compact */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-gray-900">API Request</h3>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="hover:bg-gray-100 h-6 w-6"
                  onClick={() => handleCopyJson(apiRequestJson, false)}
                  title="Copy"
                >
                  {copiedRequest ? (
                    <Check className="size-3 text-emerald-600" />
                  ) : (
                    <Copy className="size-3 text-gray-600" />
                  )}
                </Button>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-900 p-2 font-mono text-[10px] text-gray-100 max-h-24 overflow-y-auto">
                <pre className="whitespace-pre-wrap">{apiRequestJson}</pre>
              </div>
            </div>

            {/* API Response - Compact */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-gray-900">API Response</h3>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="hover:bg-gray-100 h-6 w-6"
                  onClick={() => handleCopyJson(apiResponseJson, true)}
                  title="Copy"
                >
                  {copiedResponse ? (
                    <Check className="size-3 text-emerald-600" />
                  ) : (
                    <Copy className="size-3 text-gray-600" />
                  )}
                </Button>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-900 p-2 font-mono text-[10px] text-gray-100 max-h-24 overflow-y-auto">
                <pre className="whitespace-pre-wrap">{apiResponseJson}</pre>
              </div>
            </div>
            </div>
          </div>

          {/* Full Width Execution Plan Section */}
          <div className="space-y-2.5">
            <h3 className="text-sm font-semibold text-gray-900">Execution Plan (Rule Sequence)</h3>
            {sim.mappedRules.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-500">
                No rules mapped to this product yet — configure Product-Rule Mapping first.
              </p>
            ) : (
              <div className="grid grid-cols-6 gap-2">
                {sim.mappedRules.map((rule, i) => (
                  <div key={rule.id} className="flex flex-col items-center gap-1 p-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-bold">
                      {i + 1}
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-medium text-gray-900">{rule.id}</div>
                      <div className="text-[9px] text-gray-600 leading-tight">{rule.name}</div>
                      {rule.ruleType && <Badge className="mt-0.5 text-[8px] bg-blue-50 text-blue-700 border-0 px-1 py-0">{rule.ruleType}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Full Width Simulation Timeline - Below Execution Plan */}
          {sim.decisionResult && (
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 space-y-2.5">
                <h3 className="text-sm font-semibold text-gray-900">Simulation Timeline</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2.5 text-left text-gray-700 font-semibold">Rule</th>
                          <th className="px-3 py-2.5 text-left text-gray-700 font-semibold">Input</th>
                          <th className="px-3 py-2.5 text-left text-gray-700 font-semibold">Condition</th>
                          <th className="px-3 py-2.5 text-left text-gray-700 font-semibold">Output</th>
                          <th className="px-3 py-2.5 text-left text-gray-700 font-semibold">Status</th>
                          <th className="px-3 py-2.5 text-left text-gray-700 font-semibold">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sim.decisionResult.flatTrace.map((step) => (
                          <tr key={step.ruleId} className="hover:bg-gray-50">
                            <td className="px-3 py-2.5 font-medium text-gray-900">{step.ruleId} — {step.ruleName}</td>
                            <td className="px-3 py-2.5 text-gray-600">
                              {step.conditionSummaries.map((c) => `${c.field}=${c.actual}`).join(", ") || "—"}
                            </td>
                            <td className="px-3 py-2.5 text-gray-600">
                              {step.conditionSummaries.map((c) => `${c.field} ${c.operator} ${c.expected}`).join("; ") || "—"}
                            </td>
                            <td className="px-3 py-2.5 text-gray-600">
                              {step.producedValues && Object.keys(step.producedValues).length > 0
                                ? Object.entries(step.producedValues).map(([k, v]) => `${k}=${v}`).join(", ")
                                : "—"}
                            </td>
                            <td className="px-3 py-2.5">
                              <Badge
                                className={cn(
                                  "border-0",
                                  step.status === "Passed" ? "bg-emerald-100 text-emerald-700" : step.status === "Failed" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                                )}
                              >
                                {step.status.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5 text-gray-600">{step.durationMs.toFixed(2)}ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Success Message & Footer */}
      <div className="border-t border-gray-200 bg-white p-4 space-y-3">
        {sim.decisionResult && (
          <div className={cn("flex items-center gap-3 rounded-lg border px-4 py-3", decisionLabel === "APPROVED" ? "bg-emerald-50 border-emerald-200" : decisionLabel === "REJECTED" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200")}>
            <Check className={cn("size-5 shrink-0", decisionLabel === "APPROVED" ? "text-emerald-600" : decisionLabel === "REJECTED" ? "text-red-600" : "text-amber-600")} />
            <div>
              <p className={cn("text-sm font-semibold", decisionLabel === "APPROVED" ? "text-emerald-900" : decisionLabel === "REJECTED" ? "text-red-900" : "text-amber-900")}>
                Simulation Completed Successfully
              </p>
              <p className={cn("text-xs", decisionLabel === "APPROVED" ? "text-emerald-700" : decisionLabel === "REJECTED" ? "text-red-700" : "text-amber-700")}>
                All rules executed. Final decision: {decisionLabel}
              </p>
            </div>
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700">
            <Download className="size-3.5" /> Download Full Report
          </Button>
        </div>
      </div>
    </div>
  );
}
