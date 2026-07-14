"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Save, Route, ArrowDown } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { RuleExecutionMapping, RuleSetStep, ExecutionMode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export const MODE_LABELS: Record<ExecutionMode, string> = {
  sequential: "Sequential",
  parallel: "Parallel",
  "stop-on-first-match": "Stop on First Match",
  "execute-all": "Continue Execution",
  conditional: "Conditional",
};

export const MODE_COLORS: Record<ExecutionMode, string> = {
  sequential: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  parallel: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30",
  "stop-on-first-match": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  "execute-all": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  conditional: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
};

const MODES: ExecutionMode[] = ["sequential", "parallel", "stop-on-first-match", "execute-all", "conditional"];

function newDraft(): RuleExecutionMapping {
  const now = new Date().toISOString();
  return { id: "", name: "", conditions: {}, steps: [], createdAt: now, updatedAt: now };
}

export function VisualFlow({ steps, ruleGroupsById }: { steps: RuleSetStep[]; ruleGroupsById: Map<string, string> }) {
  const ordered = [...steps].sort((a, b) => a.order - b.order);
  if (ordered.length === 0) {
    return <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">Add steps to see the execution flow.</p>;
  }
  return (
    <div className="flex flex-col items-stretch gap-0.5">
      {ordered.map((step, i) => (
        <div key={step.id} className="flex flex-col items-center">
          <div className={`w-full rounded-lg border px-3 py-2 text-xs font-medium ${MODE_COLORS[step.mode]}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate">{ruleGroupsById.get(step.ruleSetId) ?? "Unassigned Rule Set"}</span>
              <Badge variant="outline" className="shrink-0 border-current text-[9px]">{MODE_LABELS[step.mode]}</Badge>
            </div>
          </div>
          {i < ordered.length - 1 && <ArrowDown className="my-0.5 size-3.5 shrink-0 text-muted-foreground/50" />}
        </div>
      ))}
    </div>
  );
}

export function RuleSetMappingManager() {
  const mappings = useAppStore((s) => s.ruleExecutionMappings);
  const industries = useAppStore((s) => s.industries);
  const requestParameterDefs = useAppStore((s) => s.requestParameterDefs);
  const ruleGroups = useAppStore((s) => s.ruleGroups);
  const addRuleExecutionMapping = useAppStore((s) => s.addRuleExecutionMapping);
  const updateRuleExecutionMapping = useAppStore((s) => s.updateRuleExecutionMapping);
  const deleteRuleExecutionMapping = useAppStore((s) => s.deleteRuleExecutionMapping);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RuleExecutionMapping | null>(null);
  const [pendingDelete, setPendingDelete] = useState<RuleExecutionMapping | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const selected = selectedId ? mappings.find((m) => m.id === selectedId) ?? null : null;
  const active = draft ?? selected;
  const ruleGroupsById = new Map(ruleGroups.map((g) => [g.id, g.name]));

  const conditionDims = [
    { id: "industry", label: "Industry", options: industries.map((i) => ({ value: i.id, label: i.name })) },
    ...requestParameterDefs.map((d) => ({ id: d.id, label: d.label, options: null })),
  ];

  const startCreate = () => {
    setSelectedId(null);
    setDraft(newDraft());
  };
  const select = (m: RuleExecutionMapping) => {
    setSelectedId(m.id);
    setDraft(null);
  };

  const updateActive = (patch: Partial<RuleExecutionMapping>) => {
    if (draft) setDraft({ ...draft, ...patch });
    else if (selected) updateRuleExecutionMapping(selected.id, patch);
  };

  const setCondition = (dimId: string, value: string) => {
    if (!active) return;
    const conditions = { ...active.conditions };
    if (value) conditions[dimId] = value;
    else delete conditions[dimId];
    updateActive({ conditions });
  };

  // addStep only ever runs from a click handler, never during render, so
  // Date.now() here doesn't affect render purity.
  /* eslint-disable react-hooks/purity */
  const addStep = () => {
    if (!active || ruleGroups.length === 0) {
      toast.error("Create a Rule Group in Rule Groups first — that's what a step references.");
      return;
    }
    const step: RuleSetStep = { id: `step-${Date.now()}`, ruleSetId: ruleGroups[0].id, order: active.steps.length, mode: "sequential" };
    updateActive({ steps: [...active.steps, step] });
  };
  /* eslint-enable react-hooks/purity */
  const updateStep = (id: string, patch: Partial<RuleSetStep>) => {
    if (!active) return;
    updateActive({ steps: active.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  };
  const removeStep = (id: string) => {
    if (!active) return;
    updateActive({ steps: active.steps.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i })) });
  };
  const handleDrop = (targetId: string) => {
    if (!active || !draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }
    const ids = [...active.steps].sort((a, b) => a.order - b.order).map((s) => s.id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    ids.splice(from, 1);
    ids.splice(to, 0, draggedId);
    const byId = new Map(active.steps.map((s) => [s.id, s]));
    updateActive({ steps: ids.map((id, i) => ({ ...byId.get(id)!, order: i })) });
    setDraggedId(null);
  };

  const save = () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error("Mapping name is required.");
      return;
    }
    if (draft.steps.length === 0) {
      toast.error("Add at least one step — a mapping with no Rule Sets executes nothing.");
      return;
    }
    const id = draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (mappings.some((m) => m.id === id)) {
      toast.error(`A mapping with id "${id}" already exists.`);
      return;
    }
    const saved = { ...draft, id };
    addRuleExecutionMapping(saved);
    setDraft(null);
    setSelectedId(id);
    toast.success(`"${saved.name}" saved.`);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteRuleExecutionMapping(pendingDelete.id);
    if (selectedId === pendingDelete.id) setSelectedId(null);
    toast.info(`"${pendingDelete.name}" removed.`);
    setPendingDelete(null);
  };

  return (
    <div className="flex h-full min-h-100 gap-4">
      <div className="w-64 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground">Rule Set Mappings</p>
          <Button size="icon-sm" variant="ghost" onClick={startCreate}>
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="max-h-125 space-y-1 overflow-y-auto">
          {mappings.map((m) => (
            <button
              key={m.id}
              onClick={() => select(m)}
              className={`w-full rounded-lg border p-2.5 text-left transition-colors ${selectedId === m.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
            >
              <p className="truncate text-xs font-semibold">{m.name}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {Object.entries(m.conditions).length === 0 && <span className="text-[10px] text-muted-foreground">Any request</span>}
                {Object.entries(m.conditions).map(([k, v]) => (
                  <Badge key={k} variant="secondary" className="text-[9px]">{v}</Badge>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">{m.steps.length} step{m.steps.length === 1 ? "" : "s"}</p>
            </button>
          ))}
          {mappings.length === 0 && !draft && (
            <p className="rounded-lg border border-dashed p-4 text-center text-[11px] text-muted-foreground">
              No mappings yet. Add one to route requests to specific Rule Sets.
            </p>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {!active ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground">
            Select a mapping or create a new one.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_240px]">
            <div className="space-y-3">
              <div className="space-y-1.5 rounded-xl border bg-card p-3.5">
                <Label>Mapping Name *</Label>
                <Input
                  value={active.name}
                  disabled={!draft}
                  onChange={(e) => updateActive({ name: e.target.value })}
                  placeholder="e.g. Home Loan — Balance Transfer"
                />
              </div>

              <div className="space-y-2 rounded-xl border bg-card p-3.5">
                <Label>Conditions — blank means &quot;any&quot; for that dimension</Label>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {conditionDims.map((dim) => (
                    <div key={dim.id} className="space-y-1">
                      <span className="text-[10px] font-medium text-muted-foreground">{dim.label}</span>
                      {dim.options ? (
                        <Select value={active.conditions[dim.id] ?? ""} onValueChange={(v) => setCondition(dim.id, (v as string) ?? "")}>
                          <SelectTrigger size="sm" className="h-8 w-full"><SelectValue placeholder="Any" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Any</SelectItem>
                            {dim.options.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={active.conditions[dim.id] ?? ""}
                          onChange={(e) => setCondition(dim.id, e.target.value)}
                          placeholder="Any"
                          className="h-8 text-xs"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 rounded-xl border bg-card p-3.5">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5"><Route className="size-3.5" /> Execution Sequence</Label>
                  <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={addStep}>
                    <Plus className="size-3.5" /> Add Step
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {[...active.steps].sort((a, b) => a.order - b.order).map((step) => (
                    <div
                      key={step.id}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(step.id)}
                      className="flex select-none items-center gap-2 rounded-lg border bg-card px-2.5 py-2"
                    >
                      <span
                        draggable
                        onDragStart={() => setDraggedId(step.id)}
                        onDragEnd={() => setDraggedId(null)}
                        className="flex shrink-0 cursor-grab active:cursor-grabbing"
                      >
                        <GripVertical className="size-4 text-muted-foreground" />
                      </span>
                      <Select value={step.ruleSetId} onValueChange={(v) => updateStep(step.id, { ruleSetId: (v as string) ?? step.ruleSetId })}>
                        <SelectTrigger size="sm" className="h-8 flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ruleGroups.map((g) => (
                            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={step.mode} onValueChange={(v) => updateStep(step.id, { mode: (v as ExecutionMode) ?? "sequential" })}>
                        <SelectTrigger size="sm" className="h-8 w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MODES.map((mode) => (
                            <SelectItem key={mode} value={mode}>{MODE_LABELS[mode]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon-sm" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeStep(step.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                  {active.steps.length === 0 && (
                    <p className="rounded-lg border border-dashed p-3 text-center text-[11px] text-muted-foreground">
                      No steps yet — add the Rule Sets that should execute for this mapping, in order.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                {selected && !draft && (
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-destructive hover:text-destructive" onClick={() => setPendingDelete(selected)}>
                    <Trash2 className="size-3.5" /> Delete Mapping
                  </Button>
                )}
                {draft && (
                  <Button size="sm" className="ml-auto gap-1.5" onClick={save}>
                    <Save className="size-3.5" /> Save Mapping
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Visual Flow</Label>
              <div className="rounded-xl border bg-card p-3">
                <VisualFlow steps={active.steps} ruleGroupsById={ruleGroupsById} />
              </div>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{pendingDelete?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>This mapping and its execution sequence will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
