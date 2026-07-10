"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, AlertCircle, CheckCircle2, Info, CheckCheck } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { NotificationType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const ICONS: Record<NotificationType, React.ElementType> = {
  Error: AlertCircle,
  Warning: AlertTriangle,
  Success: CheckCircle2,
  Info: Info,
};
const COLORS: Record<NotificationType, string> = {
  Error: "text-red-500 bg-red-500/10",
  Warning: "text-amber-500 bg-amber-500/10",
  Success: "text-emerald-500 bg-emerald-500/10",
  Info: "text-blue-500 bg-blue-500/10",
};

const PREF_ITEMS = [
  { key: "lease", label: "Rule publish confirmations", desc: "In-app + email when a rule goes live" },
  { key: "matrix", label: "Matrix validation warnings", desc: "Overlap, duplicate & gap alerts" },
  { key: "simulation", label: "Simulation summaries", desc: "In-app only, on every run" },
  { key: "digest", label: "Weekly digest email", desc: "Rollup of repository activity" },
];

export default function NotificationsPage() {
  const notifications = useAppStore((s) => s.notifications);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const markAllRead = useAppStore((s) => s.markAllNotificationsRead);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({ lease: true, matrix: true, simulation: false, digest: true });

  const filtered = notifications.filter((n) => (typeFilter.length ? typeFilter.includes(n.type) : true));

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b bg-card/40 px-5 py-3.5 sm:px-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Notification Centre</h1>
          <p className="text-xs text-muted-foreground">System alerts, reminders, and NotifyX preferences</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={markAllRead}>
          <CheckCheck className="size-3.5" /> Mark all read
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col border-r">
          <div className="flex items-center gap-2 border-b px-5 py-2.5 sm:px-6">
            <MultiSelect
              label="Type"
              options={[
                { value: "Error", label: "Error" },
                { value: "Warning", label: "Warning" },
                { value: "Success", label: "Success" },
                { value: "Info", label: "Info" },
              ]}
              selected={typeFilter}
              onChange={setTypeFilter}
            />
            <span className="text-xs text-muted-foreground">{filtered.length} notifications</span>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col divide-y px-5 sm:px-6">
              {filtered.map((n) => {
                const Icon = ICONS[n.type];
                return (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={cn(
                      "flex items-start gap-3 py-3.5 text-left transition-colors hover:bg-accent/40",
                      !n.read && "bg-primary/[0.03]"
                    )}
                  >
                    <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", COLORS[n.type])}>
                      <Icon className="size-4" />
                    </span>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className={cn("text-sm", !n.read ? "font-semibold" : "font-medium text-foreground/80")}>{n.title}</p>
                        {!n.read && <span className="size-1.5 rounded-full bg-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{n.message}</p>
                      <div className="flex items-center gap-2 pt-0.5">
                        {n.module && <span className="text-[10px] font-medium text-muted-foreground/70">{n.module}</span>}
                        <span className="text-[10px] text-muted-foreground/50">{formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="w-full shrink-0 p-5 sm:p-6 lg:w-84">
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-1 text-sm font-semibold">NotifyX Preferences</p>
            <p className="mb-3 text-xs text-muted-foreground">Choose what triggers an alert for your account.</p>
            <div className="space-y-3.5">
              {PREF_ITEMS.map((p) => (
                <div key={p.key} className="flex items-start justify-between gap-3">
                  <div>
                    <Label className="text-xs font-medium">{p.label}</Label>
                    <p className="text-[11px] text-muted-foreground">{p.desc}</p>
                  </div>
                  <Switch checked={prefs[p.key]} onCheckedChange={(v) => setPrefs((s) => ({ ...s, [p.key]: v }))} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
