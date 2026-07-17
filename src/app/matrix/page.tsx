"use client";

import { useState } from "react";
import { useAppStore, useHasCapability } from "@/lib/store";
import { MatrixGrid } from "@/components/matrix/matrix-grid";
import { NewMatrixDialog } from "@/components/matrix/new-matrix-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function MatrixPage() {
  const matrices = useAppStore((s) => s.matrices);
  const industries = useAppStore((s) => s.industries);
  const canEdit = useHasCapability("rule.edit");

  // Tabs are keyed per-matrix, not per-domain — a domain can have more than
  // one matrix (e.g. after using New Matrix a second time), and each stays
  // individually reachable instead of only the first being visible.
  const [matrixId, setMatrixId] = useState<string>(() => matrices[0]?.id ?? "");
  // Falls back to the first remaining matrix if the active tab's own was
  // just deleted, without needing an effect to "fix" state after the fact.
  const activeMatrixId = matrices.some((m) => m.id === matrixId) ? matrixId : (matrices[0]?.id ?? "");

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b bg-card/40 px-5 py-3.5 sm:px-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Decision Matrix</h1>
          <p className="text-xs text-muted-foreground">Excel-like truth tables for pricing, haircut & premium slabs</p>
        </div>
        {canEdit && <NewMatrixDialog defaultDomain={industries[0]?.id ?? ""} />}
      </div>

      <div className="min-h-0 flex-1 p-5 sm:p-6">
        {matrices.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
            No matrices configured yet. {canEdit && "Create one to get started."}
          </p>
        ) : (
          <Tabs value={activeMatrixId} onValueChange={setMatrixId} className="flex h-full flex-col gap-3">
            <TabsList>
              {matrices.map((m) => {
                const industry = industries.find((i) => i.id === m.domain);
                return (
                  <TabsTrigger key={m.id} value={m.id}>{industry?.name ?? m.domain} — {m.name}</TabsTrigger>
                );
              })}
            </TabsList>
            {matrices.map((m) => (
              <TabsContent key={m.id} value={m.id} className="min-h-0 flex-1">
                {activeMatrixId === m.id && <MatrixGrid matrix={m} />}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
}
