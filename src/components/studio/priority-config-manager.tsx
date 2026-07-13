"use client";

import { toast } from "sonner";
import { ListOrdered } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { ConflictResolution } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STRATEGIES: { value: ConflictResolution; label: string; description: string }[] = [
  {
    value: "execute-all",
    label: "Execute All",
    description: "Evaluate every eligible rule regardless of order; a Reject still halts remaining rules.",
  },
  {
    value: "first-match",
    label: "First Match",
    description: "Stop evaluating as soon as the first rule's IF (or ELSE) actually fires.",
  },
  {
    value: "highest-priority",
    label: "Highest Priority First",
    description: "Evaluate and trace rules from priority 1 (highest) downward. Doesn't stop early.",
  },
  {
    value: "lowest-priority",
    label: "Lowest Priority First",
    description: "Evaluate and trace rules from priority 5 (lowest) upward. Doesn't stop early.",
  },
];

const DEFAULT_SCOPE = "default";

export function PriorityConfigManager() {
  const industries = useAppStore((s) => s.industries);
  const executionSettings = useAppStore((s) => s.executionSettings);
  const setExecutionSettings = useAppStore((s) => s.setExecutionSettings);

  const scopes = [{ id: DEFAULT_SCOPE, name: "Default (all industries)" }, ...industries];

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        When multiple rules qualify for the same case in the Simulator, this decides evaluation order and whether the
        engine stops at the first rule that fires. Falls back to Execute All (today&apos;s behavior) when unset.
      </p>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {scopes.map((scope) => {
          const current = executionSettings[scope.id]?.conflictResolution ?? "execute-all";
          return (
            <div key={scope.id} className="rounded-xl border bg-card p-3.5">
              <div className="mb-2.5 flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ListOrdered className="size-4" />
                </span>
                <p className="text-sm font-semibold">{scope.name}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Conflict Resolution Strategy</Label>
                <Select
                  value={current}
                  onValueChange={(v) => {
                    setExecutionSettings(scope.id, { conflictResolution: (v ?? "execute-all") as ConflictResolution });
                    toast.success(`${scope.name}: strategy set to "${STRATEGIES.find((s) => s.value === v)?.label}".`);
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STRATEGIES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  {STRATEGIES.find((s) => s.value === current)?.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-dashed p-3 text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground">Not yet available:</span> &quot;Highest Score&quot; and &quot;Custom Strategy&quot;
        need a scoring model this platform doesn&apos;t define yet — roadmap.
      </div>
    </div>
  );
}
