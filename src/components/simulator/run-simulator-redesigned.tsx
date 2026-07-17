"use client";

import { useState } from "react";
import { Download, RotateCcw, PlayCircle, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    const selected = products.find(p => p.id === productId);
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

  const apiRequestJson = JSON.stringify({
    monthly_income: 50000,
    credit_score: 720,
    applicant_age: 35,
    smoker: false,
  }, null, 2);

  const apiResponseJson = JSON.stringify({
    decision: "APPROVED",
    ltv_ratio: "75%",
    eligible_loan_amount: 4500000,
    currency: "INR"
  }, null, 2);

  const availableProducts = products.length > 0 ? products : [product];

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
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 w-fit">Active</Badge>
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
                        <td className="px-3 py-2.5 text-gray-600">Rule Group</td>
                        <td className="px-3 py-2.5 font-medium text-gray-900 text-right">NBFC Loan Approval</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2.5 text-gray-600">Total Rules</td>
                        <td className="px-3 py-2.5 font-medium text-gray-900 text-right">3</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2.5 text-gray-600">Last Updated</td>
                        <td className="px-3 py-2.5 font-medium text-gray-900 text-right">16 Jul 2026 03:45 PM</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Template JSON Section */}
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
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="hover:bg-gray-100"
                      title="Download"
                    >
                      <Download className="size-4 text-gray-600" />
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-900 p-3 font-mono text-xs text-gray-100 max-h-40 overflow-y-auto">
                  <pre className="whitespace-pre-wrap break-words">{sim.jsonText || "{}"}</pre>
                </div>
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
                  <span className="font-medium">3</span>
                </div>
              </div>
              <div className="space-y-0.5 text-[11px] border-b pb-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Passed</span>
                  <span className="font-medium text-emerald-600">3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Failed</span>
                  <span className="font-medium text-red-600">0</span>
                </div>
              </div>
              <div className="flex gap-1">
                <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0 px-2 py-1">COMPLETED</Badge>
                <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0 px-2 py-1">APPROVED</Badge>
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

            {/* Final Output (Response JSON) - Compact */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-gray-900">Final Output (Response JSON)</h3>
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
            <div className="grid grid-cols-6 gap-2">
              {[
                { num: 1, id: "RL-NB-1", name: "Income Validation" },
                { num: 2, id: "RL-NB-2", name: "CIBIL Assessment" },
                { num: 3, id: "RL-NB-3", name: "Property Valuation" },
              ].map((rule) => (
                <div key={rule.id} className="flex flex-col items-center gap-1 p-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-bold">
                    {rule.num}
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-medium text-gray-900">{rule.id}</div>
                    <div className="text-[9px] text-gray-600 leading-tight">{rule.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Full Width Simulation Timeline - Below Execution Plan */}
          {sim.decisionResult && (
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-10 space-y-2.5">
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
                        {[
                          { id: "RL-NB-1", input: "monthly_income = 50000", condition: "monthly_income >= 30085", output: "income_eligible = true", time: "00:00.421" },
                          { id: "RL-NB-2", input: "credit_score = 720", condition: "credit_score >= 700", output: "credit_approved = true", time: "00:00.398" },
                          { id: "RL-NB-3", input: "property_value = 6500000", condition: "property_value >= 6000000", output: "ltv_ratio = 75%", time: "00:00.424" },
                        ].map((row) => (
                          <tr key={row.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2.5 font-medium text-gray-900">{row.id}</td>
                            <td className="px-3 py-2.5 text-gray-600">{row.input}</td>
                            <td className="px-3 py-2.5 text-gray-600">{row.condition}</td>
                            <td className="px-3 py-2.5 text-gray-600">{row.output}</td>
                            <td className="px-3 py-2.5"><Badge className="bg-emerald-100 text-emerald-700 border-0">PASSED</Badge></td>
                            <td className="px-3 py-2.5 text-gray-600">{row.time}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="col-span-2"></div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Success Message & Footer */}
      <div className="border-t border-gray-200 bg-white p-4 space-y-3">
        {sim.decisionResult && (
          <div className="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
            <Check className="size-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">Simulation Completed Successfully</p>
              <p className="text-xs text-emerald-700">All rules executed successfully. Final decision: APPROVED</p>
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
