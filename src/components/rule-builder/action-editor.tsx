"use client";

import { Plus, Trash2, CheckCircle2, XCircle, Calculator, Tag, MessageSquare } from "lucide-react";
import { ActionType, RuleAction } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACTION_TYPES: { value: ActionType; label: string; icon: React.ElementType; accent: string }[] = [
  { value: "Approve", label: "Approve", icon: CheckCircle2, accent: "text-emerald-600 dark:text-emerald-400" },
  { value: "Reject", label: "Reject", icon: XCircle, accent: "text-red-600 dark:text-red-400" },
  { value: "Calculate", label: "Calculate", icon: Calculator, accent: "text-blue-600 dark:text-blue-400" },
  { value: "Assign Value", label: "Assign Value", icon: Tag, accent: "text-violet-600 dark:text-violet-400" },
  { value: "Show Message", label: "Show Message", icon: MessageSquare, accent: "text-amber-600 dark:text-amber-400" },
];

function ActionRow({ action, onChange, onDelete }: { action: RuleAction; onChange: (patch: Partial<RuleAction>) => void; onDelete: () => void }) {
  const meta = ACTION_TYPES.find((t) => t.value === action.type)!;
  const needsOutput = action.type === "Calculate" || action.type === "Assign Value";
  const needsMessage = action.type === "Show Message" || action.type === "Approve" || action.type === "Reject";

  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="flex items-center gap-2">
        <meta.icon className={cn("size-4", meta.accent)} />
        <Select value={action.type} onValueChange={(v) => onChange({ type: v as ActionType })}>
          <SelectTrigger size="sm" className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon-sm" onClick={onDelete} className="ml-auto text-muted-foreground hover:text-destructive">
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {needsOutput && (
          <>
            <Input
              placeholder="Output field (e.g. interest_rate)"
              value={action.outputField ?? ""}
              onChange={(e) => onChange({ outputField: e.target.value })}
              className="h-8 text-xs"
            />
            <Input
              placeholder="Value or expression"
              value={action.outputValue ?? ""}
              onChange={(e) => onChange({ outputValue: e.target.value })}
              className="h-8 text-xs"
            />
          </>
        )}
        <Input
          placeholder="Reason code (e.g. LOW_CREDIT_SCORE)"
          value={action.reasonCode ?? ""}
          onChange={(e) => onChange({ reasonCode: e.target.value })}
          className={cn("h-8 text-xs", needsOutput ? "sm:col-span-2" : "")}
        />
        {needsMessage && (
          <Textarea
            placeholder="Message shown to the business user / audit trail"
            value={action.message ?? ""}
            onChange={(e) => onChange({ message: e.target.value })}
            className="min-h-14 text-xs sm:col-span-2"
          />
        )}
      </div>
    </div>
  );
}

export function ActionListEditor({
  actions,
  onChange,
}: {
  actions: RuleAction[];
  onChange: (actions: RuleAction[]) => void;
}) {
  const addAction = () => {
    onChange([...actions, { id: `act-${Date.now()}`, type: "Approve" }]);
  };
  const updateAction = (id: string, patch: Partial<RuleAction>) => {
    onChange(actions.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };
  const deleteAction = (id: string) => onChange(actions.filter((a) => a.id !== id));

  return (
    <div className="space-y-2.5">
      {actions.length === 0 && (
        <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
          No actions configured — add at least one THEN action.
        </p>
      )}
      {actions.map((a) => (
        <ActionRow key={a.id} action={a} onChange={(patch) => updateAction(a.id, patch)} onDelete={() => deleteAction(a.id)} />
      ))}
      <Button variant="outline" size="sm" onClick={addAction} className="gap-1.5">
        <Plus className="size-3.5" /> Add Action
      </Button>
    </div>
  );
}
