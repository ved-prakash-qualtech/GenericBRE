"use client";

import { toast } from "sonner";
import { Sliders } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { DecisionResponseConfig, ResponseMode } from "@/lib/types";
import { DEFAULT_DECISION_RESPONSE_CONFIG } from "@/lib/decision-response";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MODES: { value: ResponseMode; label: string }[] = [
  { value: "decision-only", label: "Decision Only" },
  { value: "decision-explanation", label: "Decision + Explanation" },
  { value: "decision-trace", label: "Decision + Trace" },
  { value: "full-audit", label: "Full Audit" },
];

const FLAGS: { key: keyof DecisionResponseConfig; label: string }[] = [
  { key: "showDecisionReason", label: "Decision Reason" },
  { key: "showTriggeredRules", label: "Triggered Rules" },
  { key: "showFailedRules", label: "Failed Rules" },
  { key: "showExecutionTime", label: "Execution Time" },
  { key: "showRuleVersion", label: "Rule Version" },
  { key: "showRuleSequence", label: "Rule Sequence" },
  { key: "showApiRequest", label: "API Request" },
  { key: "showApiResponse", label: "API Response" },
  { key: "enableDebugTrace", label: "Debug Trace" },
  { key: "enableAuditLogging", label: "Audit Logging" },
];

const DEFAULT_SCOPE = "default";

export function DecisionResponseConfigManager() {
  const industries = useAppStore((s) => s.industries);
  const decisionResponseSettings = useAppStore((s) => s.decisionResponseSettings);
  const setDecisionResponseConfig = useAppStore((s) => s.setDecisionResponseConfig);

  const scopes = [
    { id: DEFAULT_SCOPE, name: "Default (all)" },
    ...industries.map((i) => ({ id: i.id, name: i.name })),
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Controls how much detail a decision result exposes — from a lightweight Decision Only response for external
        APIs up to a Full Audit response with a structured Audit Log entry. Resolution is most-specific-wins: an
        Industry override beats Default.
      </p>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {scopes.map((scope) => {
          const current = decisionResponseSettings[scope.id] ?? DEFAULT_DECISION_RESPONSE_CONFIG;
          const update = (patch: Partial<DecisionResponseConfig>) => {
            setDecisionResponseConfig(scope.id, { ...current, ...patch });
          };
          return (
            <div key={scope.id} className="space-y-3 rounded-xl border bg-card p-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sliders className="size-4" />
                </span>
                <p className="text-sm font-semibold">{scope.name}</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Default Response Mode</Label>
                <Select
                  value={current.defaultMode}
                  onValueChange={(v) => {
                    update({ defaultMode: (v ?? "decision-explanation") as ResponseMode });
                    toast.success(`${scope.name}: default response mode set to "${MODES.find((m) => m.value === v)?.label}".`);
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {FLAGS.map((flag) => (
                  <label key={flag.key} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">{flag.label}</span>
                    <Switch
                      size="sm"
                      checked={current[flag.key] as boolean}
                      onCheckedChange={(checked) => update({ [flag.key]: !!checked })}
                    />
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
