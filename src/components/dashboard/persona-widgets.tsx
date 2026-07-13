"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Search, AlertTriangle, ShieldQuestion } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { detectRuleConflicts } from "@/lib/conflict-detection";
import { StatusBadge } from "@/components/status-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { PanelHeader, ACTION_DOT, initials } from "./recent-panels";
import { cn } from "@/lib/utils";

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="px-3.5 py-4 text-center text-xs text-muted-foreground">{children}</p>;
}

// `owner` on a rule is a team ("Credit Risk Division"), not an individual —
// this platform has no per-user rule assignment, so this is scoped org-wide
// rather than faked as "my" rules.
export function DraftRulesPanel() {
  const rules = useAppStore((s) => s.rules);
  const router = useRouter();
  const drafts = useMemo(
    () => rules.filter((r) => r.status === "Draft").sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [rules]
  );

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Draft Rules (org-wide)" action="View all" onAction={() => router.push("/repository?status=Draft")} />
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {drafts.slice(0, 8).map((r) => (
            <button
              key={r.id}
              onClick={() => router.push(`/rule-builder?id=${r.id}`)}
              className="flex w-full items-center justify-between gap-3 px-3.5 py-1.5 text-left hover:bg-accent/50 transition-colors"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{r.name}</p>
                <p className="text-[11px] text-muted-foreground">{r.id} · {r.category}</p>
              </div>
              <span className="shrink-0 text-[10.5px] text-muted-foreground">P{r.priority}</span>
            </button>
          ))}
          {drafts.length === 0 && <EmptyRow>No rules currently in Draft.</EmptyRow>}
        </div>
      </ScrollArea>
    </div>
  );
}

export function RulesAwaitingReviewPanel() {
  const rules = useAppStore((s) => s.rules);
  const router = useRouter();
  const testing = useMemo(() => rules.filter((r) => r.status === "Testing"), [rules]);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Rules Awaiting Review" action="View all" onAction={() => router.push("/repository?status=Testing")} />
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {testing.slice(0, 8).map((r) => (
            <button
              key={r.id}
              onClick={() => router.push(`/repository?search=${r.id}`)}
              className="flex w-full items-center justify-between gap-3 px-3.5 py-1.5 text-left hover:bg-accent/50 transition-colors"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{r.name}</p>
                <p className="text-[11px] text-muted-foreground">{r.id} · {r.domain}</p>
              </div>
              <StatusBadge status={r.status} className="shrink-0" />
            </button>
          ))}
          {testing.length === 0 && <EmptyRow>Nothing waiting on review right now.</EmptyRow>}
        </div>
      </ScrollArea>
    </div>
  );
}

export function ApprovalQueuePanel() {
  const rules = useAppStore((s) => s.rules);
  const approvalRequests = useAppStore((s) => s.approvalRequests);
  const router = useRouter();
  const pending = useMemo(
    () =>
      approvalRequests
        .filter((a) => a.stage === "Pending Review")
        .sort((a, b) => +new Date(b.requestedAt) - +new Date(a.requestedAt)),
    [approvalRequests]
  );

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Approval Queue" action="View all" onAction={() => router.push("/repository?status=Testing")} />
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {pending.slice(0, 8).map((a) => {
            const rule = rules.find((r) => r.id === a.ruleId);
            return (
              <button
                key={a.id}
                onClick={() => router.push(`/repository?search=${a.ruleId}`)}
                className="flex w-full items-center justify-between gap-3 px-3.5 py-1.5 text-left hover:bg-accent/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{rule?.name ?? a.ruleId}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Requested by {a.requestedBy} · {formatDistanceToNow(new Date(a.requestedAt), { addSuffix: true })}
                  </p>
                </div>
              </button>
            );
          })}
          {pending.length === 0 && <EmptyRow>No approvals pending.</EmptyRow>}
        </div>
      </ScrollArea>
    </div>
  );
}

export function RuleConflictsPanel() {
  const rules = useAppStore((s) => s.rules);
  const router = useRouter();
  const conflicts = useMemo(() => detectRuleConflicts(rules), [rules]);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Rule Conflicts" />
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {conflicts.slice(0, 8).map((c, i) => (
            <button
              key={`${c.ruleAId}-${c.ruleBId}-${i}`}
              onClick={() => router.push(`/repository?search=${c.ruleAId}`)}
              className="flex w-full items-start gap-2.5 px-3.5 py-1.5 text-left hover:bg-accent/50 transition-colors"
            >
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
              <div className="min-w-0">
                <p className="text-[13px] font-medium">{c.ruleAId} vs {c.ruleBId}</p>
                <p className="text-[11px] text-muted-foreground">{c.reason} (on {c.field})</p>
              </div>
            </button>
          ))}
          {conflicts.length === 0 && <EmptyRow>No conflicts detected among Active rules.</EmptyRow>}
        </div>
      </ScrollArea>
    </div>
  );
}

const OPERATIONAL_ACTIONS = new Set(["Ran Simulation", "Published Rule", "Disabled Rule", "Export Delivered"]);

export function ExecutionLogsPanel() {
  const auditLog = useAppStore((s) => s.auditLog);
  const router = useRouter();
  const logs = useMemo(() => auditLog.filter((a) => OPERATIONAL_ACTIONS.has(a.action)).slice(0, 10), [auditLog]);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Execution Logs" action="View audit log" onAction={() => router.push("/audit-log")} />
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {logs.map((a) => (
            <button
              key={a.id}
              onClick={() => router.push("/audit-log")}
              className="flex w-full items-center gap-2 px-3.5 py-1.5 text-left hover:bg-accent/50 transition-colors"
            >
              <span className={cn("size-1.5 shrink-0 rounded-full", ACTION_DOT[a.action] ?? "bg-muted-foreground")} />
              <span className="min-w-0 flex-1 truncate text-[12px]">
                <span className="font-medium">{a.action}</span>{" "}
                <span className="font-mono text-[11px] text-muted-foreground">{a.entityId}</span>
              </span>
              <span
                className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground"
                title={a.user}
              >
                {initials(a.user)}
              </span>
              <span className="w-14 shrink-0 text-right text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(a.timestamp))}
              </span>
            </button>
          ))}
          {logs.length === 0 && <EmptyRow>No execution activity logged yet.</EmptyRow>}
        </div>
      </ScrollArea>
    </div>
  );
}

export function EnvironmentStatusPanel() {
  const rules = useAppStore((s) => s.rules);
  const router = useRouter();
  const grid = useMemo(() => {
    const envs = ["Dev", "UAT", "Prod"] as const;
    return envs.map((env) => ({
      env,
      total: rules.filter((r) => r.environment === env).length,
      active: rules.filter((r) => r.environment === env && r.status === "Active").length,
    }));
  }, [rules]);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Environment Status" />
      <div className="flex-1 divide-y">
        {grid.map((g) => {
          const pct = g.total > 0 ? Math.round((g.active / g.total) * 100) : 0;
          return (
            <button
              key={g.env}
              onClick={() => router.push(`/repository?environment=${g.env}`)}
              className="flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left hover:bg-accent/50 transition-colors"
            >
              <span className="w-9 shrink-0 text-[11px] font-medium">{g.env}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
              </span>
              <span className="w-14 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                <span className="font-semibold text-foreground">{g.active}</span>/{g.total}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DecisionLookupPanel() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const go = () => {
    if (!query.trim()) return;
    router.push(`/repository?search=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Decision Lookup" />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
        <ShieldQuestion className="size-6 text-muted-foreground/50" />
        <p className="text-[11px] text-muted-foreground">Look up a rule ID or name to see its decision history in the Repository.</p>
        <div className="flex w-full max-w-72 gap-1.5">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && go()}
            placeholder="e.g. RL-101"
            className="h-8 text-xs"
          />
          <button
            onClick={go}
            className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-card hover:bg-accent"
            aria-label="Search"
          >
            <Search className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
