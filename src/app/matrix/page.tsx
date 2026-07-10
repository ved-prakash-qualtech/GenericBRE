"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { MatrixGrid } from "@/components/matrix/matrix-grid";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Domain } from "@/lib/types";

export default function MatrixPage() {
  const matrices = useAppStore((s) => s.matrices);
  const industries = useAppStore((s) => s.industries);

  // Only industries that actually have a configured matrix get a tab — this
  // stays correct automatically as industries/matrices are added or removed.
  const domainsWithMatrices = useMemo(
    () => industries.filter((i) => matrices.some((m) => m.domain === i.id)),
    [industries, matrices]
  );

  const [domain, setDomain] = useState<Domain>(() => domainsWithMatrices[0]?.id ?? "");

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
            {domainsWithMatrices.map((i) => (
              <TabsTrigger key={i.id} value={i.id}>{i.name}</TabsTrigger>
            ))}
          </TabsList>
          {domainsWithMatrices.map((i) => {
            const matrix = matrices.find((m) => m.domain === i.id);
            return (
              <TabsContent key={i.id} value={i.id} className="min-h-0 flex-1">
                {matrix && <MatrixGrid matrix={matrix} />}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}
