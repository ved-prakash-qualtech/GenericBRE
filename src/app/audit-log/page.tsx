"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Download, Search, ScrollText, ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { verifyAuditChain, AuditIntegrityResult } from "@/lib/audit-chain";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

export default function AuditLogPage() {
  const auditLog = useAppStore((s) => s.auditLog);
  const [search, setSearch] = useState("");
  const [actions, setActions] = useState<string[]>([]);
  const [integrity, setIntegrity] = useState<AuditIntegrityResult | null>(null);

  const runVerify = () => setIntegrity(verifyAuditChain(auditLog));

  const actionOptions = useMemo(
    () => Array.from(new Set(auditLog.map((a) => a.action))).map((a) => ({ value: a, label: a })),
    [auditLog]
  );

  const filtered = auditLog.filter((a) => {
    if (search && !`${a.user} ${a.entityId} ${a.details}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (actions.length && !actions.includes(a.action)) return false;
    return true;
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b bg-card/40 px-5 py-3.5 sm:px-6">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <ScrollText className="size-4.5 text-muted-foreground" /> Audit Log
          </h1>
          <p className="text-xs text-muted-foreground">Tamper-evident, append-only trail of every significant platform action</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={runVerify}>
            <ShieldCheck className="size-3.5" /> Verify Integrity
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              downloadCsv(
                "audit_log",
                filtered.map((a) => ({ Timestamp: a.timestamp, User: a.user, Action: a.action, Entity: a.entity, EntityID: a.entityId, Details: a.details }))
              )
            }
          >
            <Download className="size-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {integrity && (
        <div
          className={cn(
            "flex shrink-0 items-start gap-2.5 border-b px-5 py-2.5 text-xs sm:px-6",
            integrity.intact ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
          )}
        >
          {integrity.intact ? <ShieldCheck className="mt-0.5 size-3.5 shrink-0" /> : <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />}
          <div>
            {integrity.intact ? (
              <p>
                <span className="font-semibold">Chain intact</span> — all {integrity.checkedCount} entries verified against
                their recorded hash.
              </p>
            ) : (
              <p>
                <span className="font-semibold">Tampering detected</span> at entry {integrity.brokenAtId} — its content (or
                something before it) no longer matches the recorded hash chain.
              </p>
            )}
            <p className="mt-0.5 flex items-center gap-1 text-[11px] opacity-80">
              <ShieldQuestion className="size-3 shrink-0" /> This detects casual edits to this browser&apos;s stored log,
              not a determined attacker — there&apos;s no backend, so anyone with devtools access could recompute a
              consistent chain. Real immutability needs server-side signing.
            </p>
          </div>
        </div>
      )}

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-5 py-2.5 sm:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by user, entity, or details..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-72 pl-8" />
        </div>
        <MultiSelect label="Action Type" options={actionOptions} selected={actions} onChange={setActions} />
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} entries</span>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-5 py-4 sm:px-6">
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Timestamp</th>
                  <th className="px-3 py-2 text-left font-medium">User</th>
                  <th className="px-3 py-2 text-left font-medium">Action</th>
                  <th className="px-3 py-2 text-left font-medium">Entity</th>
                  <th className="px-3 py-2 text-left font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    className={cn("hover:bg-accent/30", integrity && !integrity.intact && a.id === integrity.brokenAtId && "bg-destructive/10")}
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{format(new Date(a.timestamp), "dd MMM yyyy, HH:mm")}</td>
                    <td className="px-3 py-2 text-xs font-medium">{a.user}</td>
                    <td className="px-3 py-2 text-xs">
                      <span className="rounded-full border px-2 py-0.5">{a.action}</span>
                    </td>
                    <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{a.entityId}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{a.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
