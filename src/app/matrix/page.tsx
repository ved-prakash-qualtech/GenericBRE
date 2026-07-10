"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { MatrixGrid } from "@/components/matrix/matrix-grid";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Domain } from "@/lib/types";

const DOMAIN_LABELS: Record<Domain, string> = {
  Lending: "Lending · Interest Rates",
  NBFC: "NBFC · Gold Loan Haircut",
  Insurance: "Insurance · Premium Slabs",
};

export default function MatrixPage() {
  const matrices = useAppStore((s) => s.matrices);
  const [domain, setDomain] = useState<Domain>("Lending");

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b bg-card/40 px-5 py-3.5 sm:px-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Decision Matrix</h1>
          <p className="text-xs text-muted-foreground">Excel-like truth tables for pricing, haircut & premium slabs</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 p-5 sm:p-6">
        <Tabs value={domain} onValueChange={(v) => setDomain(v as Domain)} className="flex h-full flex-col gap-3">
          <TabsList>
            {(Object.keys(DOMAIN_LABELS) as Domain[]).map((d) => (
              <TabsTrigger key={d} value={d}>{DOMAIN_LABELS[d]}</TabsTrigger>
            ))}
          </TabsList>
          {(Object.keys(DOMAIN_LABELS) as Domain[]).map((d) => {
            const matrix = matrices.find((m) => m.domain === d);
            return (
              <TabsContent key={d} value={d} className="min-h-0 flex-1">
                {matrix && <MatrixGrid matrix={matrix} />}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}
