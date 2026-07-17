"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  FlaskConical,
  LayoutTemplate,
  AlertTriangle,
  ShieldAlert,
  Plus,
  Copy,
  Undo2,
  Redo2,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  CheckCircle2,
  FolderPlus,
  Trash2,
} from "lucide-react";
import { useAppStore, useHasCapability } from "@/lib/store";
import { BusinessField, BusinessRule, Condition, ConditionGroup, RuleAction, RuleTemplate } from "@/lib/types";
import {
  emptyGroup,
  emptyCondition,
  updateNode,
  removeNode,
  addChildToGroup,
  validateTree,
  cloneGroupWithFreshIds,
  collectFieldKeys,
  countConditions,
  duplicateNode,
  moveNode,
  insertChildAt,
  findParent,
  findNode,
  wrapInGroup,
} from "@/lib/condition-tree";
import { getField, fieldsForDomain } from "@/lib/fields";
import { copyToClipboard, pasteFromClipboard, useConditionClipboard } from "@/lib/condition-clipboard";
import { recordRecentField } from "@/components/rule-builder/builder-shared";
import { getGeneratedVariables, detectCircularDependency } from "@/lib/rule-chaining";
import { buildSampleRequestJson } from "@/lib/sample-json";
import { MetadataForm } from "@/components/rule-builder/metadata-form";
import { ConditionGroupEditor, TreeHandlers } from "@/components/rule-builder/condition-group-editor";
import { AttributePanel } from "@/components/rule-builder/attribute-panel";
// import { ExpressionPreview } from "@/components/rule-builder/expression-preview";
import { ActionListEditor } from "@/components/rule-builder/action-editor";
import { RulePreviewPanel } from "@/components/rule-builder/rule-preview-panel";
import { InlineTestPanel } from "@/components/rule-builder/inline-test-panel";
import { TemplatePicker } from "@/components/rule-builder/template-picker";
import { SampleJsonPanel } from "@/components/rule-builder/sample-json-panel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

function nextRuleId(existing: BusinessRule[]) {
  const nums = existing.map((r) => parseInt(r.id.replace(/\D/g, ""), 10)).filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 100;
  return `RL-${max + 1}`;
}

function blankRule(id: string, defaultDomain: string, defaultOwner: string): BusinessRule {
  return {
    id,
    name: "",
    domain: defaultDomain,
    category: "",
    subCategory: "",
    priority: 3,
    status: "Draft",
    // environment: "Dev", // FUTURE: restore when environment promotion is reintroduced
    description: "",
    owner: defaultOwner,
    rootGroup: emptyGroup("AND"),
    actions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    simulatable: true,
  };
}

// Every Condition leaf whose field is neither a real Field Catalog entry nor
// a currently-generated variable from another rule — a dangling reference.
function findInvalidReferences(group: ConditionGroup, fieldCatalog: BusinessField[], availableVariableKeys: Set<string>): string[] {
  const invalid: string[] = [];
  for (const c of group.children) {
    if (c.type === "condition") {
      if (c.field && !getField(fieldCatalog, c.field) && !availableVariableKeys.has(c.field)) {
        invalid.push(c.field);
      }
    } else {
      invalid.push(...findInvalidReferences(c, fieldCatalog, availableVariableKeys));
    }
  }
  return invalid;
}

// Two actions in the same branch (THEN or ELSE) declaring the same non-empty
// output field name is very likely a mistake (one silently wins/overwrites
// the other at execution time) rather than intentional.
function findDuplicateVariableName(actions: RuleAction[]): string | null {
  const seen = new Set<string>();
  for (const a of actions) {
    if ((a.type === "Assign Value" || a.type === "Calculate") && a.outputField) {
      if (seen.has(a.outputField)) return a.outputField;
      seen.add(a.outputField);
    }
  }
  return null;
}

function draftKeyFor(editId: string | null) {
  return `bre-rule-builder-draft:${editId ?? "new"}`;
}

function RuleBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const rules = useAppStore((s) => s.rules);
  const addRule = useAppStore((s) => s.addRule);
  const updateRule = useAppStore((s) => s.updateRule);
  const cloneRule = useAppStore((s) => s.cloneRule);
  const submitForReview = useAppStore((s) => s.submitForReview);
  const logAudit = useAppStore((s) => s.logAudit);
  const currentUser = useAppStore((s) => s.currentUser);
  const industries = useAppStore((s) => s.industries);
  const owners = useAppStore((s) => s.owners);
  const ruleTemplates = useAppStore((s) => s.ruleTemplates);
  const ruleCategories = useAppStore((s) => s.ruleCategories);
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const canCreate = useHasCapability("rule.create");
  const canEdit = useHasCapability("rule.edit");

  const existingRule = useMemo(() => rules.find((r) => r.id === editId), [rules, editId]);

  const [rule, setRule] = useState<BusinessRule>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(draftKeyFor(editId));
      if (saved) {
        try {
          return JSON.parse(saved) as BusinessRule;
        } catch {
          window.localStorage.removeItem(draftKeyFor(editId));
        }
      }
    }
    return existingRule ?? blankRule(nextRuleId(rules), industries[0]?.id ?? "", owners[0] ?? "");
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [showElseBranch, setShowElseBranch] = useState(() => !!existingRule?.elseActions?.length);
  // Non-blocking template hint — shown once per browser session on a fresh,
  // untouched new rule; never forces a modal on rule creation (see below).
  const [templateHintDismissed, setTemplateHintDismissed] = useState(
    () => typeof window !== "undefined" && window.sessionStorage.getItem("bre-template-hint-dismissed") === "1"
  );
  const dismissTemplateHint = () => {
    setTemplateHintDismissed(true);
    window.sessionStorage.setItem("bre-template-hint-dismissed", "1");
  };

  useEffect(() => {
    // Re-seed the editable draft whenever the ?id= query param points at a different
    // stored rule (e.g. navigating from one rule's edit page to another's).
    if (!existingRule) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRule(existingRule);
    setShowElseBranch(!!existingRule.elseActions?.length);
  }, [existingRule?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (window.localStorage.getItem(draftKeyFor(editId))) {
      toast.info("Draft restored", { description: "Your in-progress edit was restored from autosave." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto Save Draft — debounced, keyed per rule (or "new"), separate from the
  // Draft RuleStatus lifecycle and the Zustand-persisted store.
  useEffect(() => {
    const handle = setTimeout(() => {
      window.localStorage.setItem(draftKeyFor(editId), JSON.stringify(rule));
    }, 1500);
    return () => clearTimeout(handle);
  }, [rule, editId]);

  // Undo/Redo — a simple linear snapshot stack, coalesced so rapid typing
  // doesn't blow it up. Deliberately not a diff/patch system.
  const historyRef = useRef<{ past: BusinessRule[]; future: BusinessRule[] }>({ past: [], future: [] });
  const lastPushRef = useRef(0);
  const commitRule = (updater: (r: BusinessRule) => BusinessRule) => {
    setRule((r) => {
      const next = updater(r);
      const now = Date.now();
      if (now - lastPushRef.current > 400) {
        historyRef.current.past.push(r);
        if (historyRef.current.past.length > 50) historyRef.current.past.shift();
        historyRef.current.future = [];
        lastPushRef.current = now;
      }
      return next;
    });
  };
  const undo = () => {
    const { past } = historyRef.current;
    if (past.length === 0) return;
    setRule((current) => {
      const previous = past.pop()!;
      historyRef.current.future.push(current);
      return previous;
    });
  };
  const redo = () => {
    const { future } = historyRef.current;
    if (future.length === 0) return;
    setRule((current) => {
      const next = future.pop()!;
      historyRef.current.past.push(current);
      return next;
    });
  };

  const patchRule = (patch: Partial<BusinessRule>) => commitRule((r) => ({ ...r, ...patch }));

  const applyTemplate = (template: RuleTemplate) => {
    commitRule((r) => ({
      ...r,
      rootGroup: cloneGroupWithFreshIds(template.rootGroup),
      actions: template.actions.map((a) => ({ ...a })),
      elseActions: template.elseActions?.map((a) => ({ ...a })),
    }));
    setTemplatePickerOpen(false);
    toast.success(`"${template.name}" applied`, { description: "Fully editable below — adjust fields and values as needed." });
  };

  const updateTreeNode = (id: string, patch: Partial<Condition | ConditionGroup>) =>
    commitRule((r) => ({ ...r, rootGroup: updateNode(r.rootGroup, id, patch) }));
  const deleteTreeNode = (id: string) => commitRule((r) => ({ ...r, rootGroup: removeNode(r.rootGroup, id) }));
  const addTreeChild = (groupId: string, child: Condition | ConditionGroup) =>
    commitRule((r) => ({ ...r, rootGroup: addChildToGroup(r.rootGroup, groupId, child) }));
  const setActions = (actions: RuleAction[]) => commitRule((r) => ({ ...r, actions }));
  const setElseActions = (elseActions: RuleAction[]) => commitRule((r) => ({ ...r, elseActions }));

  // ---- SQL-style builder: attribute panel, selection, clipboard, DnD ----
  const entities = useAppStore((s) => s.entities);
  const clipboardCount = useConditionClipboard();
  const [attrPanelOpen, setAttrPanelOpen] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Selection can go stale after deletes/undo — prune against the live tree
  // instead of trying to keep every mutation path in sync with it.
  const activeSelection = useMemo(() => {
    const pruned = new Set<string>();
    selectedIds.forEach((id) => {
      if (findNode(rule.rootGroup, id)) pruned.add(id);
    });
    return pruned;
  }, [selectedIds, rule.rootGroup]);

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Selected nodes whose ancestors aren't ALSO selected — copying/deleting a
  // group must not double-process children that were individually ticked too.
  const topMostSelected = (): (Condition | ConditionGroup)[] => {
    const out: (Condition | ConditionGroup)[] = [];
    const walk = (g: ConditionGroup) => {
      for (const c of g.children) {
        if (activeSelection.has(c.id)) out.push(c);
        else if (c.type === "group") walk(c);
      }
    };
    walk(rule.rootGroup);
    return out;
  };

  const bulkCopy = () => {
    const nodes = topMostSelected();
    if (nodes.length === 0) return;
    copyToClipboard(nodes);
    toast.success(`Copied ${nodes.length} item${nodes.length === 1 ? "" : "s"} — paste into any group, even in another rule.`);
  };
  const bulkDelete = () => {
    const nodes = topMostSelected();
    if (nodes.length === 0) return;
    commitRule((r) => ({ ...r, rootGroup: nodes.reduce<ConditionGroup>((root, n) => removeNode(root, n.id), r.rootGroup) }));
    setSelectedIds(new Set());
  };
  const selectionSharesParent = useMemo(() => {
    const ids = [...activeSelection];
    if (ids.length < 2) return false;
    const first = findParent(rule.rootGroup, ids[0]);
    return !!first && ids.every((id) => findParent(rule.rootGroup, id) === first);
  }, [activeSelection, rule.rootGroup]);
  const bulkGroup = () => {
    commitRule((r) => ({ ...r, rootGroup: wrapInGroup(r.rootGroup, [...activeSelection]) }));
    setSelectedIds(new Set());
    toast.success("Selection wrapped in a new group.");
  };

  const pasteInto = (groupId: string) => {
    const nodes = pasteFromClipboard();
    if (nodes.length === 0) return;
    commitRule((r) => ({ ...r, rootGroup: nodes.reduce<ConditionGroup>((root, n) => addChildToGroup(root, groupId, n), r.rootGroup) }));
    toast.success(`Pasted ${nodes.length} item${nodes.length === 1 ? "" : "s"}.`);
  };

  const treeHandlers: TreeHandlers = {
    onUpdate: updateTreeNode,
    onDelete: deleteTreeNode,
    onAddChild: addTreeChild,
    onDuplicate: (id) => commitRule((r) => ({ ...r, rootGroup: duplicateNode(r.rootGroup, id) })),
    onCopy: (id) => {
      // Copying the root means "copy all conditions", not a nested clone of
      // the whole WHERE — pasting should merge into a group, not double-wrap.
      const nodes = id === rule.rootGroup.id ? rule.rootGroup.children : [findNode(rule.rootGroup, id)].filter((n): n is Condition | ConditionGroup => !!n);
      if (nodes.length === 0) return;
      copyToClipboard(nodes);
      toast.success(`Copied ${nodes.length} item${nodes.length === 1 ? "" : "s"} — paste into any group, even in another rule.`);
    },
    onPaste: pasteInto,
    onMoveNode: (nodeId, targetGroupId, index) =>
      commitRule((r) => ({ ...r, rootGroup: moveNode(r.rootGroup, nodeId, targetGroupId, index) })),
    onMoveUpDown: (id, delta) =>
      commitRule((r) => {
        const parent = findParent(r.rootGroup, id);
        if (!parent) return r;
        const idx = parent.children.findIndex((c) => c.id === id);
        if (idx === -1 || (delta === -1 && idx === 0) || (delta === 1 && idx === parent.children.length - 1)) return r;
        // moveNode's index is the visual slot BEFORE removal — down means
        // "after the next sibling" (idx+2), up means "before the previous" (idx-1).
        return { ...r, rootGroup: moveNode(r.rootGroup, id, parent.id, delta === 1 ? idx + 2 : idx - 1) };
      }),
    onInsertField: (groupId, index, fieldKey) => {
      recordRecentField(fieldKey);
      commitRule((r) => ({ ...r, rootGroup: insertChildAt(r.rootGroup, groupId, emptyCondition(fieldKey), index) }));
    },
    onToggleSelect: toggleSelect,
  };

  const addFieldToRoot = (fieldKey: string) =>
    commitRule((r) => ({ ...r, rootGroup: addChildToGroup(r.rootGroup, r.rootGroup.id, emptyCondition(fieldKey)) }));

  const liveIssueCount = validateTree(rule.rootGroup).length;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!rule.name.trim()) errs.name = "Rule Name is a mandatory field. Please provide a distinct identifier.";
    if (!rule.domain) errs.domain = "Select a domain for this rule.";
    if (!rule.category) errs.category = "Select a category to classify this rule.";
    if (countConditions(rule.rootGroup) === 0) errs.condition = "Add at least one condition — a rule needs at least one condition clause.";

    const conditionErrors = validateTree(rule.rootGroup);
    if (rule.actions.length === 0) errs.actions = "Add at least one THEN action before saving.";

    for (const [label, list] of [["THEN", rule.actions], ["ELSE", rule.elseActions ?? []]] as const) {
      const missingOutput = list.find((a) => (a.type === "Calculate" || a.type === "Assign Value") && !a.outputField);
      if (missingOutput) errs.outputField = `${label}: a Calculate/Assign Value action needs an Output Field.`;
      const dup = findDuplicateVariableName(list);
      if (dup) errs.duplicateVariable = `${label}: more than one action sets the same variable "${dup}".`;
    }

    const availableVars = new Set(getGeneratedVariables(rules, rule.id).map((v) => v.key));
    const invalidRefs = findInvalidReferences(rule.rootGroup, fieldCatalog, availableVars);
    if (invalidRefs.length > 0) {
      errs.variables = `"${invalidRefs[0]}" isn't a business field or a generated variable from another rule.`;
    }
    const simulatedRules = [...rules.filter((r) => r.id !== rule.id), rule];
    const cycle = detectCircularDependency(simulatedRules);
    if (cycle) errs.chain = `Circular rule dependency detected: ${cycle.cycle.join(" → ")}.`;

    setErrors(errs);
    if (Object.keys(errs).length > 0 || conditionErrors.length > 0) {
      toast.error("Rule cannot be saved", {
        description: conditionErrors[0] ?? Object.values(errs)[0],
      });
      return false;
    }
    return true;
  };

  const persistRule = (statusOverride?: BusinessRule["status"]): { ok: boolean; rule: BusinessRule; reason?: string } => {
    const finalRule: BusinessRule = {
      ...rule,
      status: statusOverride ?? rule.status,
      updatedAt: new Date().toISOString(),
    };
    if (existingRule) {
      const result = updateRule(finalRule.id, () => ({ ...finalRule, version: finalRule.version + 1 }));
      if (!result.ok) return { ok: false, rule: finalRule, reason: result.reason };
      logAudit({ user: currentUser.name, action: "Edited Rule", entity: "BusinessRule", entityId: finalRule.id, details: `${finalRule.name} saved as ${finalRule.status}.` });
    } else {
      const result = addRule(finalRule);
      if (!result.ok) return { ok: false, rule: finalRule, reason: result.reason };
      logAudit({ user: currentUser.name, action: "Created Rule", entity: "BusinessRule", entityId: finalRule.id, details: `New rule created as ${finalRule.status}.` });
    }
    window.localStorage.removeItem(draftKeyFor(editId));
    return { ok: true, rule: finalRule };
  };

  const handleSaveDraft = () => {
    if (!validate()) return;
    const saved = persistRule("Draft");
    if (!saved.ok) {
      toast.error("Couldn't save", { description: saved.reason });
      return;
    }
    toast.success("Rule saved", { description: `${saved.rule.id} · ${saved.rule.name} is now Draft.` });
    router.push("/repository");
  };

  // Every role submits into the Testing/review queue — there is no
  // straight-to-Active shortcut here, even for roles that also hold
  // rule.publish. Publishing only ever happens from the Repository's
  // Approve & Publish action, which enforces maker-checker (a reviewer
  // can't approve their own submission) at the store level.
  const handleSubmitForReview = () => {
    if (!validate()) return;
    const saved = persistRule("Draft");
    if (!saved.ok) {
      toast.error("Couldn't save", { description: saved.reason });
      return;
    }
    const result = submitForReview(saved.rule.id);
    if (!result.ok) {
      toast.error("Couldn't submit for review", { description: result.reason });
      return;
    }
    toast.success("Submitted for review", { description: `${saved.rule.id} · ${saved.rule.name} moved to Testing.` });
    router.push("/repository");
  };

  const handleDuplicate = () => {
    if (!existingRule) return;
    const result = cloneRule(existingRule.id);
    if (!result.ok || !result.newId) {
      toast.error("Couldn't duplicate", { description: result.reason });
      return;
    }
    toast.success("Rule duplicated", { description: `Created ${result.newId} as a new Draft copy.` });
    router.push(`/rule-builder?id=${result.newId}`);
  };

  // Keyboard shortcuts, same useEffect+addEventListener shape already
  // established for the Ctrl/Cmd+K command palette (src/components/shell/header.tsx).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      // Selection/clipboard keys must never hijack normal typing or native
      // copy of selected text inside the builder's inputs.
      const typing = !!(e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable=true], [role=combobox]");
      if (!typing) {
        if (e.key === "Delete" && activeSelection.size > 0) {
          e.preventDefault();
          bulkDelete();
          return;
        }
        if (mod && key === "c" && activeSelection.size > 0 && !window.getSelection()?.toString()) {
          e.preventDefault();
          bulkCopy();
          return;
        }
        if (mod && key === "v" && clipboardCount > 0) {
          e.preventDefault();
          pasteInto(rule.rootGroup.id);
          return;
        }
      }
      if (!mod) return;
      if (key === "s") {
        e.preventDefault();
        handleSaveDraft();
      } else if (key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (key === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rule, existingRule, selectedIds, clipboardCount]);

  const sampleJson = useMemo(
    () => buildSampleRequestJson(fieldCatalog, Array.from(collectFieldKeys(rule.rootGroup))),
    [rule.rootGroup, fieldCatalog]
  );

  // A capability check, not just a hidden button — someone can still land
  // here directly via the URL (e.g. /rule-builder?id=RL-101) without going
  // through a Repository row action that would have hidden Edit for them.
  const restricted = existingRule ? !canEdit : !canCreate;
  if (restricted) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <ShieldAlert className="size-10 text-muted-foreground/40" />
        <h1 className="text-base font-semibold">Access restricted</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {existingRule
            ? `${currentUser.name}'s role doesn't include permission to edit rules.`
            : `${currentUser.name}'s role doesn't include permission to create rules.`}
        </p>
        <Button variant="outline" size="sm" onClick={() => router.push("/repository")}>
          Back to Repository
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b bg-card/40 px-5 py-3 sm:px-6">
        <Button variant="ghost" size="icon" className="size-8" onClick={() => router.push("/repository")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="mr-auto">
          <h1 className="text-base font-semibold tracking-tight">{existingRule ? `Edit Rule · ${rule.id}` : "Create New Rule"}</h1>
          <p className="text-xs text-muted-foreground">No-code visual rule configuration — standalone, reusable across any Product</p>
        </div>
        {Object.keys(errors).length > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertTriangle className="size-3.5" /> Fix validation errors to save
          </span>
        )}
        <Button variant="ghost" size="icon-sm" title="Undo (Ctrl+Z)" onClick={undo}>
          <Undo2 className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon-sm" title="Redo (Ctrl+Shift+Z)" onClick={redo}>
          <Redo2 className="size-3.5" />
        </Button>
        {existingRule && (
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleDuplicate}>
            <Copy className="size-3.5" /> Duplicate
          </Button>
        )}
        {!existingRule && (
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setTemplatePickerOpen(true)}>
            <LayoutTemplate className="size-3.5" /> Use Template
          </Button>
        )}
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSaveDraft} title="Save Draft (Ctrl+S)">
          <Save className="size-3.5" /> Save Draft
        </Button>
        <Button size="sm" className="gap-1.5" onClick={handleSubmitForReview}>
          <FlaskConical className="size-3.5" /> Submit for Review
        </Button>
      </div>

      <TemplatePicker
        open={templatePickerOpen}
        onOpenChange={setTemplatePickerOpen}
        templates={ruleTemplates.filter((t) => !t.domain || t.domain === rule.domain)}
        industries={industries}
        categories={ruleCategories}
        onUse={applyTemplate}
      />

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex w-full flex-col gap-4 px-5 py-5 sm:px-6">
          <MetadataForm data={rule} onChange={patchRule} errors={errors} />
          {(errors.condition || errors.outputField || errors.duplicateVariable || errors.variables || errors.chain) && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
              {errors.condition && <p>{errors.condition}</p>}
              {errors.outputField && <p>{errors.outputField}</p>}
              {errors.duplicateVariable && <p>{errors.duplicateVariable}</p>}
              {errors.variables && <p>{errors.variables}</p>}
              {errors.chain && <p>{errors.chain}</p>}
            </div>
          )}

          {!existingRule && !templateHintDismissed && countConditions(rule.rootGroup) === 0 && rule.actions.length === 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/30 px-3.5 py-2.5">
              <LayoutTemplate className="size-4 shrink-0 text-primary" />
              <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                Starting from scratch? A template can pre-fill the condition and action builder below — fully editable after.
              </p>
              <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1.5 text-xs" onClick={() => setTemplatePickerOpen(true)}>
                <LayoutTemplate className="size-3.5" /> Browse Templates
              </Button>
              <Button size="icon-sm" variant="ghost" className="shrink-0" title="Dismiss" onClick={dismissTemplateHint}>
                <X className="size-3.5" />
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {attrPanelOpen && (
              <div className="lg:col-span-3">
                <div className="h-80 lg:sticky lg:top-4 lg:h-[calc(100dvh-230px)]">
                  <AttributePanel
                    fields={fieldsForDomain(fieldCatalog, rule.domain)}
                    entities={entities}
                    onAddField={addFieldToRoot}
                  />
                </div>
              </div>
            )}
            <div className={cn("flex flex-col gap-4", attrPanelOpen ? "lg:col-span-6" : "lg:col-span-9")}>
              <div>
                <div className="mb-2 flex items-center gap-2 px-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground"
                    title={attrPanelOpen ? "Hide Available Attributes" : "Show Available Attributes"}
                    onClick={() => setAttrPanelOpen((v) => !v)}
                  >
                    {attrPanelOpen ? <PanelLeftClose className="size-3.5" /> : <PanelLeftOpen className="size-3.5" />}
                  </Button>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Condition Builder
                  </h2>
                  {countConditions(rule.rootGroup) > 0 &&
                    (liveIssueCount > 0 ? (
                      <span className="flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                        <AlertTriangle className="size-3" /> {liveIssueCount} issue{liveIssueCount === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3" /> Valid
                      </span>
                    ))}
                </div>
                <ConditionGroupEditor
                  group={rule.rootGroup}
                  domain={rule.domain}
                  handlers={treeHandlers}
                  selection={activeSelection}
                  clipboardCount={clipboardCount}
                  currentRuleId={rule.id}
                  isRoot
                />
                {activeSelection.size > 0 && (
                  <div className="sticky bottom-3 z-10 mx-auto mt-3 flex w-fit items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-lg">
                    <span className="text-xs font-medium">{activeSelection.size} selected</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      disabled={!selectionSharesParent}
                      title={selectionSharesParent ? "Wrap the selection in a new nested group" : "Select 2+ items in the same group to wrap them"}
                      onClick={bulkGroup}
                    >
                      <FolderPlus className="size-3" /> Group
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={bulkCopy}>
                      <Copy className="size-3" /> Copy
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs text-destructive" onClick={bulkDelete}>
                      <Trash2 className="size-3" /> Delete
                    </Button>
                    <Button size="icon-sm" variant="ghost" title="Clear selection" onClick={() => setSelectedIds(new Set())}>
                      <X className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  THEN — Action Builder
                </h2>
                <ActionListEditor actions={rule.actions} domain={rule.domain} rules={rules} currentRuleId={rule.id} rootGroup={rule.rootGroup} onChange={setActions} />
                {errors.actions && <p className="mt-1.5 px-1 text-[11px] text-destructive">{errors.actions}</p>}
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between px-1">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    ELSE — Otherwise
                  </h2>
                  {!showElseBranch && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 text-[11px]"
                      onClick={() => setShowElseBranch(true)}
                    >
                      <Plus className="size-3" /> Add ELSE Branch
                    </Button>
                  )}
                </div>
                {showElseBranch ? (
                  <>
                    <p className="mb-2 px-1 text-[11px] text-muted-foreground">
                      Runs instead of THEN when the IF conditions don&apos;t match. Leave empty and this rule simply
                      does nothing on a non-match, same as before.
                    </p>
                    <ActionListEditor actions={rule.elseActions ?? []} domain={rule.domain} rules={rules} currentRuleId={rule.id} rootGroup={rule.rootGroup} onChange={setElseActions} />
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
                    No ELSE branch — this rule does nothing when its conditions don&apos;t match.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:col-span-3">
              {/* FUTURE: Re-enable ExpressionPreview if needed
              <ExpressionPreview rootGroup={rule.rootGroup} catalog={fieldCatalog} />
              */}
              <RulePreviewPanel rule={rule} fieldCatalog={fieldCatalog} />
              <SampleJsonPanel data={sampleJson} />
              <InlineTestPanel
                rootGroup={rule.rootGroup}
                actions={rule.actions}
                elseActions={rule.elseActions}
              />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export default function RuleBuilderPage() {
  return (
    <Suspense fallback={null}>
      <RuleBuilderContent />
    </Suspense>
  );
}
