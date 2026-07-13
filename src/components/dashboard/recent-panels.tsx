"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { StatusBadge } from "@/components/status-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function PanelHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b px-3.5 py-2.5">
      <h3 className="text-[13px] font-semibold">{title}</h3>
      {action && (
        <button onClick={onAction} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          {action} <ArrowUpRight className="size-3" />
        </button>
      )}
    </div>
  );
}

export function RecentRulesPanel() {
  const rules = useAppStore((s) => s.rules);
  const router = useRouter();
  const recent = [...rules].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 6);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Recently Modified Rules" action="View all" onAction={() => router.push("/repository")} />
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {recent.map((r) => (
            <button
              key={r.id}
              onClick={() => router.push(`/rule-builder?id=${r.id}`)}
              className="flex w-full items-center justify-between gap-3 px-3.5 py-1.5 text-left hover:bg-accent/50 transition-colors"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{r.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {r.id} · {r.domain} · updated {formatDistanceToNow(new Date(r.updatedAt), { addSuffix: true })}
                </p>
              </div>
              <StatusBadge status={r.status} className="shrink-0" />
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// Shared across every audit-log-driven widget (Execution Logs, Recent
// Activity) so status coloring and user-initials chips stay consistent.
export const ACTION_DOT: Record<string, string> = {
  "Ran Simulation": "bg-blue-500",
  "Published Rule": "bg-emerald-500",
  "Disabled Rule": "bg-amber-500",
  "Save Failed": "bg-red-500",
  "Export Delivered": "bg-violet-500",
  "Created Rule": "bg-emerald-500",
  "Cloned Rule": "bg-blue-500",
  "Edited Matrix": "bg-blue-500",
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function RecentActivityPanel() {
  const auditLog = useAppStore((s) => s.auditLog);
  const router = useRouter();

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Recent Activity" action="View audit log" onAction={() => router.push("/audit-log")} />
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {auditLog.slice(0, 10).map((a) => (
            <button
              key={a.id}
              onClick={() => router.push("/audit-log")}
              className="flex w-full items-center gap-2 px-3.5 py-1.5 text-left hover:bg-accent/50 transition-colors"
            >
              <span className={cn("size-1.5 shrink-0 rounded-full", ACTION_DOT[a.action] ?? "bg-muted-foreground")} />
              <span className="min-w-0 flex-1 truncate text-[12px]">
                <span className="font-medium">{a.action}</span>{" "}
                <span className="font-mono text-[11px] text-foreground/70">{a.entityId}</span>
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
        </div>
      </ScrollArea>
    </div>
  );
}

export function RecentDeploymentsPanel() {
  const rules = useAppStore((s) => s.rules);
  const recent = [...rules]
    .filter((r) => r.status === "Active")
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 5);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Recent Deployments" />
      <div className="flex-1 space-y-0.5 p-2">
        {recent.map((r) => (
          <div key={r.id} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1">
            <span className={cn("size-1.5 shrink-0 rounded-full", "bg-emerald-500")} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium">{r.name}</p>
              <p className="text-[10.5px] text-muted-foreground">{r.domain}</p>
            </div>
            <span className="shrink-0 text-[10.5px] text-muted-foreground">
              {formatDistanceToNow(new Date(r.updatedAt), { addSuffix: true })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
