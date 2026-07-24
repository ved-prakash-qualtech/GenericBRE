"use client";

import { Globe } from "lucide-react";
import { Product } from "@/lib/types";
import { SampleJsonPanel } from "@/components/rule-builder/sample-json-panel";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const VALID_MODES = ["decision-only", "decision-explanation", "decision-trace", "full-audit"];

// Per-product API contract, modeled directly on the live GET handler at
// src/app/api/decision/route.ts (which already hand-documents this shape) —
// personalized with this product's code so it reads as ready-to-call rather
// than generic API reference text.
export function ApiInformationTab({
  product,
  sampleInput,
  mappedRuleCount,
}: {
  product: Product;
  sampleInput: Record<string, unknown>;
  mappedRuleCount: number;
}) {
  const requestExample = {
    productId: product.code,
    input: sampleInput,
    responseMode: "decision-explanation",
  };

  const canCall = product.publishStatus === "Published";

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start gap-3 rounded-xl border bg-card p-3.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Globe className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-mono text-sm font-semibold">POST /api/decision</p>
              <Badge variant={canCall ? "default" : "secondary"} className="text-sm">
                {canCall ? "Live — product is Published" : "Not yet callable — publish this product first"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Stateless decision endpoint. Executes only the {mappedRuleCount} rule{mappedRuleCount === 1 ? "" : "s"}{" "}
              currently mapped to <span className="font-medium text-foreground">{product.name}</span>, in their configured
              execution sequence.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border bg-card p-3.5">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Required Fields</p>
            <ul className="space-y-1.5 text-sm">
              <li>
                <span className="font-mono font-medium">productId</span>
                <span className="text-muted-foreground"> — this product&apos;s id or code, i.e. </span>
                <span className="font-mono">&quot;{product.code}&quot;</span>
              </li>
              <li>
                <span className="font-mono font-medium">input</span>
                <span className="text-muted-foreground"> — object of Field Catalog values (see Sample JSON tab)</span>
              </li>
            </ul>
          </div>
          <div className="rounded-xl border bg-card p-3.5">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Optional Fields</p>
            <ul className="space-y-1.5 text-sm">
              <li>
                <span className="font-mono font-medium">responseMode</span>
                <span className="text-muted-foreground"> — one of: {VALID_MODES.join(", ")}</span>
              </li>
              <li>
                <span className="font-mono font-medium">config</span>
                <span className="text-muted-foreground"> — partial Decision Response Configuration overrides</span>
              </li>
            </ul>
          </div>
        </div>

        <div>
          <p className="mb-1.5 px-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Request JSON — ready to send
          </p>
          <SampleJsonPanel data={requestExample} />
        </div>

        <p className="rounded-lg border border-dashed px-3 py-2.5 text-sm text-muted-foreground">
          Response shape is the standard Decision Result payload (outcome, reasonCode, summary, and — depending on{" "}
          <span className="font-mono">responseMode</span> — explanation, trace, and full audit detail). Use the Run
          Simulator tab to see a live response for this product.
        </p>
      </div>
    </ScrollArea>
  );
}
