"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Save, Rocket, AlertTriangle } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { BusinessRule, Condition, ConditionGroup, RuleAction } from "@/lib/types";
import { emptyGroup, updateNode, removeNode, addChildToGroup, validateTree } from "@/lib/condition-tree";
import { MetadataForm } from "@/components/rule-builder/metadata-form";
import { ConditionGroupEditor } from "@/components/rule-builder/condition-group-editor";
import { ActionListEditor } from "@/components/rule-builder/action-editor";
import { RuleSummary } from "@/components/rule-builder/rule-summary";
import { InlineTestPanel } from "@/components/rule-builder/inline-test-panel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

function nextRuleId(existing: BusinessRule[]) {
  const nums = existing.map((r) => parseInt(r.id.replace(/\D/g, ""), 10)).filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 100;
  return `RL-${max + 1}`;
}

function blankRule(id: string): BusinessRule {
  return {
    id,
    name: "",
    domain: "Lending",
    category: "",
    subCategory: "",
    priority: 3,
    status: "Draft",
    description: "",
    owner: "Credit Risk Division",
    rootGroup: emptyGroup("AND"),
    actions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    simulatable: true,
  };
}

function RuleBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const rules = useAppStore((s) => s.rules);
  const addRule = useAppStore((s) => s.addRule);
  const updateRule = useAppStore((s) => s.updateRule);
  const logAudit = useAppStore((s) => s.logAudit);
  const currentUser = useAppStore((s) => s.currentUser);

  const existingRule = useMemo(() => rules.find((r) => r.id === editId), [rules, editId]);
  const [rule, setRule] = useState<BusinessRule>(() => existingRule ?? blankRule(nextRuleId(rules)));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Re-seed the editable draft whenever the ?id= query param points at a different
    // stored rule (e.g. navigating from one rule's edit page to another's).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (existingRule) setRule(existingRule);
  }, [existingRule?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const patchRule = (patch: Partial<BusinessRule>) => setRule((r) => ({ ...r, ...patch }));

  const updateTreeNode = (id: string, patch: Partial<Condition | ConditionGroup>) =>
    setRule((r) => ({ ...r, rootGroup: updateNode(r.rootGroup, id, patch) }));
  const deleteTreeNode = (id: string) => setRule((r) => ({ ...r, rootGroup: removeNode(r.rootGroup, id) }));
  const addTreeChild = (groupId: string, child: Condition | ConditionGroup) =>
    setRule((r) => ({ ...r, rootGroup: addChildToGroup(r.rootGroup, groupId, child) }));
  const setActions = (actions: RuleAction[]) => setRule((r) => ({ ...r, actions }));

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!rule.name.trim()) errs.name = "Rule Name is a mandatory field. Please provide a distinct identifier.";
    if (!rule.category) errs.category = "Select a category to classify this rule.";
    const conditionErrors = validateTree(rule.rootGroup);
    if (rule.actions.length === 0) errs.actions = "Add at least one THEN action before saving.";
    setErrors(errs);
    if (Object.keys(errs).length > 0 || conditionErrors.length > 0) {
      toast.error("Rule cannot be saved", {
        description: conditionErrors[0] ?? Object.values(errs)[0],
      });
      return false;
    }
    return true;
  };

  const handleSave = (publish?: boolean) => {
    if (!validate()) return;
    const finalRule: BusinessRule = {
      ...rule,
      status: publish ? "Active" : rule.status,
      updatedAt: new Date().toISOString(),
    };
    if (existingRule) {
      updateRule(finalRule.id, () => ({ ...finalRule, version: finalRule.version + 1 }));
      logAudit({ user: currentUser.name, action: "Edited Rule", entity: "BusinessRule", entityId: finalRule.id, details: `${finalRule.name} saved as ${finalRule.status}.` });
    } else {
      addRule(finalRule);
      logAudit({ user: currentUser.name, action: "Created Rule", entity: "BusinessRule", entityId: finalRule.id, details: `New rule created as ${finalRule.status}.` });
    }
    toast.success(publish ? "Rule published" : "Rule saved", {
      description: `${finalRule.id} · ${finalRule.name} is now ${finalRule.status}.`,
    });
    router.push("/repository");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b bg-card/40 px-5 py-3 sm:px-6">
        <Button variant="ghost" size="icon" className="size-8" onClick={() => router.push("/repository")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="mr-auto">
          <h1 className="text-base font-semibold tracking-tight">{existingRule ? `Edit Rule · ${rule.id}` : "Create New Rule"}</h1>
          <p className="text-xs text-muted-foreground">No-code visual rule configuration</p>
        </div>
        {(errors.name || errors.category || errors.actions) && (
          <span className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertTriangle className="size-3.5" /> Fix validation errors to save
          </span>
        )}
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleSave(false)}>
          <Save className="size-3.5" /> Save Draft
        </Button>
        <Button size="sm" className="gap-1.5" onClick={() => handleSave(true)}>
          <Rocket className="size-3.5" /> Save &amp; Publish
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex max-w-330 flex-col gap-4 px-5 py-5 sm:px-6">
          <MetadataForm data={rule} onChange={patchRule} errors={errors} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              <div>
                <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  IF — Condition Builder
                </h2>
                <ConditionGroupEditor
                  group={rule.rootGroup}
                  domain={rule.domain}
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
                <ActionListEditor actions={rule.actions} onChange={setActions} />
                {errors.actions && <p className="mt-1.5 px-1 text-[11px] text-destructive">{errors.actions}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <RuleSummary rule={rule} />
              <InlineTestPanel rootGroup={rule.rootGroup} actions={rule.actions} />
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
