"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { RuleTemplate, Condition, ConditionGroup, RuleAction } from "@/lib/types";
import { emptyGroup, updateNode, removeNode, addChildToGroup, countConditions } from "@/lib/condition-tree";
import { ConditionGroupEditor } from "@/components/rule-builder/condition-group-editor";
import { ActionListEditor } from "@/components/rule-builder/action-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const ANY_INDUSTRY = "__any__";
const NO_CATEGORY = "__none__";

function newDraft(): RuleTemplate {
  return { id: "", name: "", description: "", rootGroup: emptyGroup("AND"), actions: [] };
}

// Templates are deliberately allowed incomplete/placeholder conditions (a
// blank field is the normal, expected shape for a reusable skeleton — see
// DEFAULT_RULE_TEMPLATES) — unlike Rule Builder, this screen never runs
// validateTree; only a name is required to save.
export function RuleTemplatesManager() {
  const templates = useAppStore((s) => s.ruleTemplates);
  const industries = useAppStore((s) => s.industries);
  const ruleCategories = useAppStore((s) => s.ruleCategories);
  const addRuleTemplate = useAppStore((s) => s.addRuleTemplate);
  const updateRuleTemplate = useAppStore((s) => s.updateRuleTemplate);
  const deleteRuleTemplate = useAppStore((s) => s.deleteRuleTemplate);

  const [selectedId, setSelectedId] = useState<string | null>(() => templates[0]?.id ?? null);
  const [draft, setDraft] = useState<RuleTemplate | null>(null);
  const [pendingDelete, setPendingDelete] = useState<RuleTemplate | null>(null);
  const [showElseBranch, setShowElseBranch] = useState(() => !!templates[0]?.elseActions?.length);

  const selected = selectedId ? templates.find((t) => t.id === selectedId) ?? null : null;
  const active = draft ?? selected;
  const editorDomain = active?.domain ?? industries[0]?.id ?? "";

  const startCreate = () => {
    setSelectedId(null);
    setDraft(newDraft());
    setShowElseBranch(false);
  };
  const select = (t: RuleTemplate) => {
    setSelectedId(t.id);
    setDraft(null);
    setShowElseBranch(!!t.elseActions?.length);
  };

  const updateActive = (patch: Partial<RuleTemplate>) => {
    if (draft) setDraft({ ...draft, ...patch });
    else if (selected) updateRuleTemplate(selected.id, patch);
  };

  const updateTreeNode = (id: string, patch: Partial<Condition | ConditionGroup>) => {
    if (!active) return;
    updateActive({ rootGroup: updateNode(active.rootGroup, id, patch) });
  };
  const deleteTreeNode = (id: string) => {
    if (!active) return;
    updateActive({ rootGroup: removeNode(active.rootGroup, id) });
  };
  const addTreeChild = (groupId: string, child: Condition | ConditionGroup) => {
    if (!active) return;
    updateActive({ rootGroup: addChildToGroup(active.rootGroup, groupId, child) });
  };
  const setActions = (actionsList: RuleAction[]) => updateActive({ actions: actionsList });
  const setElseActions = (elseActionsList: RuleAction[]) => updateActive({ elseActions: elseActionsList });

  const save = () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error("Template name is required.");
      return;
    }
    const id = draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (templates.some((t) => t.id === id)) {
      toast.error(`A template with id "${id}" already exists.`);
      return;
    }
    addRuleTemplate({ ...draft, id });
    setDraft(null);
    setSelectedId(id);
    toast.success(`"${draft.name}" saved — available immediately in Rule Builder's "Start from a Template" picker.`);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteRuleTemplate(pendingDelete.id);
    if (selectedId === pendingDelete.id) setSelectedId(null);
    toast.info(`"${pendingDelete.name}" removed.`);
    setPendingDelete(null);
  };

  return (
    <div className="flex h-full min-h-100 gap-4">
      <div className="w-64 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground">Templates</p>
          <Button size="icon-sm" variant="ghost" onClick={startCreate}>
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="max-h-125 space-y-1 overflow-y-auto">
          {templates.map((t) => {
            const conditionCount = countConditions(t.rootGroup);
            return (
              <button
                key={t.id}
                onClick={() => select(t)}
                className={`w-full rounded-lg border p-2.5 text-left transition-colors ${selectedId === t.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
              >
                <p className="truncate text-xs font-semibold">{t.name}</p>
                <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">{t.description || "No description"}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">
                    {conditionCount} condition{conditionCount === 1 ? "" : "s"}
                  </span>
                  {t.domain && (
                    <Badge variant="secondary" className="text-[9px]">
                      {industries.find((i) => i.id === t.domain)?.name ?? t.domain}
                    </Badge>
                  )}
                  {t.categoryId && (
                    <Badge variant="outline" className="text-[9px]">
                      {ruleCategories.find((c) => c.id === t.categoryId)?.name ?? t.categoryId}
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
          {templates.length === 0 && !draft && (
            <p className="rounded-lg border border-dashed p-4 text-center text-[11px] text-muted-foreground">
              No templates yet. Add one to speed up Rule Builder authoring.
            </p>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {!active ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground">
            Select a template or create a new one.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 rounded-xl border bg-card p-3.5">
                <Label>Name *</Label>
                <Input
                  value={active.name}
                  onChange={(e) => updateActive({ name: e.target.value })}
                  placeholder="e.g. High-Value Manual Review"
                />
              </div>
              <div className="space-y-1.5 rounded-xl border bg-card p-3.5">
                <Label>Domain — scopes the field picker below</Label>
                <Select
                  value={active.domain ?? ANY_INDUSTRY}
                  onValueChange={(v) => updateActive({ domain: v === ANY_INDUSTRY ? undefined : (v as string) })}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY_INDUSTRY}>Any Domain</SelectItem>
                    {industries.map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 rounded-xl border bg-card p-3.5">
                <Label>Category — groups this template in the picker</Label>
                <Select
                  value={active.categoryId ?? NO_CATEGORY}
                  onValueChange={(v) => updateActive({ categoryId: v === NO_CATEGORY ? undefined : (v as string) })}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>No Category</SelectItem>
                    {ruleCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5 rounded-xl border bg-card p-3.5">
              <Label>Description</Label>
              <Textarea
                value={active.description}
                onChange={(e) => updateActive({ description: e.target.value })}
                placeholder="What this template is for and when to use it"
                className="min-h-16"
              />
            </div>

            <div>
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                IF — Condition Builder
              </h2>
              <ConditionGroupEditor
                group={active.rootGroup}
                domain={editorDomain}
                onUpdate={updateTreeNode}
                onDelete={deleteTreeNode}
                onAddChild={addTreeChild}
                isRoot
              />
            </div>

            <div>
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                THEN — Action Builder
              </h2>
              <ActionListEditor actions={active.actions} domain={editorDomain} rules={[]} onChange={setActions} />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ELSE — Otherwise</h2>
                {!showElseBranch && (
                  <Button variant="ghost" size="sm" className="h-6 gap-1 text-[11px]" onClick={() => setShowElseBranch(true)}>
                    <Plus className="size-3" /> Add ELSE Branch
                  </Button>
                )}
              </div>
              {showElseBranch ? (
                <>
                  <ActionListEditor actions={active.elseActions ?? []} domain={editorDomain} rules={[]} onChange={setElseActions} />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-6 text-[11px] text-muted-foreground"
                    onClick={() => {
                      setShowElseBranch(false);
                      setElseActions([]);
                    }}
                  >
                    Remove ELSE Branch
                  </Button>
                </>
              ) : (
                <p className="rounded-lg border border-dashed px-3 py-3 text-center text-xs text-muted-foreground">
                  No ELSE branch configured.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              {selected && !draft && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-destructive hover:text-destructive"
                  onClick={() => setPendingDelete(selected)}
                >
                  <Trash2 className="size-3.5" /> Delete Template
                </Button>
              )}
              {draft && (
                <Button size="sm" className="ml-auto gap-1.5" onClick={save}>
                  <Save className="size-3.5" /> Save Template
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{pendingDelete?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This template will no longer appear in Rule Builder&apos;s &quot;Start from a Template&quot; picker. Rules already
              created from it are unaffected.
            </AlertDialogDescription>
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
