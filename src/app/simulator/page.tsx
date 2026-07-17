"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Product } from "@/lib/types";
import { ProductSelector } from "@/components/simulator/product-selector";
import { useRunSimulator, RunSimulatorInputs, RunSimulatorActions, RunSimulatorResult } from "@/components/simulator/run-simulator-panel";
import { ScrollArea } from "@/components/ui/scroll-area";

function SimulatorContent() {
  const searchParams = useSearchParams();
  const rules = useAppStore((s) => s.rules);
  const products = useAppStore((s) => s.products);
  const industries = useAppStore((s) => s.industries);
  const productRuleMappings = useAppStore((s) => s.productRuleMappings);

  const initialProductId = searchParams.get("productId") || (searchParams.get("domain") && products.find((p) => p.domain === searchParams.get("domain"))?.id);
  const initialSandboxRule = searchParams.get("sandboxRule");
  // Unlike the old KPI-card grid, no product is auto-selected by default —
  // Product Selection is the deliberate first step; only a deep link
  // (?productId= / ?domain=) pre-fills a selection.
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(
    () => products.find((p) => p.id === initialProductId) ?? null
  );

  const sim = useRunSimulator(selectedProduct, initialSandboxRule);

  const sampleJsonRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (selectedProduct) {
      sampleJsonRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct?.id]);

  const switchProduct = (p: Product) => {
    setSelectedProduct(p);
  };

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
              <ProductSelector
                products={products}
                industries={industries}
                rules={rules}
                mappings={productRuleMappings}
                selectedProductId={selectedProduct?.id}
                onSelect={switchProduct}
              />

              {selectedProduct ? (
                <div ref={sampleJsonRef}>
                  <RunSimulatorInputs sim={sim} />
                </div>
              ) : (
                <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                  Select a Product to generate Sample JSON and run simulation.
                </p>
              )}
            </div>
          </ScrollArea>
          <div className="border-t p-3">
            <RunSimulatorActions product={selectedProduct} sim={sim} />
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 p-5 sm:p-6">
            <RunSimulatorResult product={selectedProduct} sim={sim} />
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
