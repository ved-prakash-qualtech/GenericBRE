"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, FileEdit, PlayCircle, Copy, Ban, Plus } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { StatusBadge } from "@/components/status-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function PanelHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
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
              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-accent/50 transition-colors"
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

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  "Published Rule": PlayCircle,
  "Edited Matrix": FileEdit,
  "Ran Simulation": PlayCircle,
  "Cloned Rule": Copy,
  "Save Failed": Ban,
  "Created Rule": Plus,
  "Disabled Rule": Ban,
  "Export Delivered": ArrowUpRight,
};

export function RecentActivityPanel() {
  const auditLog = useAppStore((s) => s.auditLog);
  const router = useRouter();

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Recent Activity" action="View audit log" onAction={() => router.push("/audit-log")} />
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 p-3">
          {auditLog.slice(0, 7).map((a) => {
            const Icon = ACTIVITY_ICONS[a.action] ?? FileEdit;
            return (
              <div key={a.id} className="flex gap-3 rounded-lg px-1.5 py-2">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] leading-snug">
                    <span className="font-medium">{a.user}</span>{" "}
                    <span className="text-muted-foreground">{a.action.toLowerCase()}</span>{" "}
                    <span className="font-mono text-[11px] text-foreground/80">{a.entityId}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}</p>
                </div>
              </div>
            );
          })}
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
      <div className="flex-1 space-y-1 p-3">
        {recent.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-lg px-1.5 py-1.5">
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
