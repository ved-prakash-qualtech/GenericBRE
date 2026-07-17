"use client";

import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Product } from "@/lib/types";
import { ProductHubGrid } from "@/components/products/product-hub-grid";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ProductsPage() {
  const router = useRouter();
  const products = useAppStore((s) => s.products);
  const industries = useAppStore((s) => s.industries);
  const rules = useAppStore((s) => s.rules);
  const productRuleMappings = useAppStore((s) => s.productRuleMappings);
  const simulations = useAppStore((s) => s.simulations);

  const openWorkspace = (product: Product) => router.push(`/products/${product.id}`);
  const runSimulation = (product: Product) => router.push(`/products/${product.id}?tab=simulate`);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b bg-card/40 px-5 py-3.5 sm:px-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Products</h1>
          <p className="text-xs text-muted-foreground">
            Every product&apos;s rules, sequencing, sample data, simulation and API contract in one workspace.
          </p>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-5 sm:p-6">
          <ProductHubGrid
            products={products}
            industries={industries}
            rules={rules}
            mappings={productRuleMappings}
            simulations={simulations}
            onConfigure={openWorkspace}
            onRunSimulation={runSimulation}
            showControls
          />
        </div>
      </ScrollArea>
    </div>
  );
}
