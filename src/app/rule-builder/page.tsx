"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Save, Rocket, FlaskConical, LayoutTemplate, AlertTriangle } from "lucide-react";
import { useAppStore, useHasCapability } from "@/lib/store";
import { BusinessRule, Condition, ConditionGroup, RuleAction, RuleTemplate } from "@/lib/types";
import { emptyGroup, updateNode, removeNode, addChildToGroup, validateTree, cloneGroupWithFreshIds } from "@/lib/condition-tree";
import { MetadataForm } from "@/components/rule-builder/metadata-form";
import { ConditionGroupEditor } from "@/components/rule-builder/condition-group-editor";
import { ActionListEditor } from "@/components/rule-builder/action-editor";
import { RuleSummary } from "@/components/rule-builder/rule-summary";
import { InlineTestPanel } from "@/components/rule-builder/inline-test-panel";
import { TemplatePicker } from "@/components/rule-builder/template-picker";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

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

function RuleBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const rules = useAppStore((s) => s.rules);
  const addRule = useAppStore((s) => s.addRule);
  const updateRule = useAppStore((s) => s.updateRule);
  const submitForReview = useAppStore((s) => s.submitForReview);
  const approveRule = useAppStore((s) => s.approveRule);
  const logAudit = useAppStore((s) => s.logAudit);
  const currentUser = useAppStore((s) => s.currentUser);
  const industries = useAppStore((s) => s.industries);
  const owners = useAppStore((s) => s.owners);
  const ruleTemplates = useAppStore((s) => s.ruleTemplates);
  const canPublish = useHasCapability("rule.publish");

  const existingRule = useMemo(() => rules.find((r) => r.id === editId), [rules, editId]);
  const [rule, setRule] = useState<BusinessRule>(
    () => existingRule ?? blankRule(nextRuleId(rules), industries[0]?.id ?? "", owners[0] ?? "")
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [templatePickerOpen, setTemplatePickerOpen] = useState(!existingRule);

  useEffect(() => {
    // Re-seed the editable draft whenever the ?id= query param points at a different
    // stored rule (e.g. navigating from one rule's edit page to another's).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (existingRule) setRule(existingRule);
  }, [existingRule?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const patchRule = (patch: Partial<BusinessRule>) => setRule((r) => ({ ...r, ...patch }));

  const applyTemplate = (template: RuleTemplate) => {
    setRule((r) => ({
      ...r,
      rootGroup: cloneGroupWithFreshIds(template.rootGroup),
      actions: template.actions.map((a) => ({ ...a })),
    }));
    setTemplatePickerOpen(false);
    toast.success(`"${template.name}" applied`, { description: "Fully editable below — adjust fields and values as needed." });
  };

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

  const persistRule = (statusOverride?: BusinessRule["status"]): BusinessRule => {
    const finalRule: BusinessRule = {
      ...rule,
      status: statusOverride ?? rule.status,
      updatedAt: new Date().toISOString(),
    };
    if (existingRule) {
      updateRule(finalRule.id, () => ({ ...finalRule, version: finalRule.version + 1 }));
      logAudit({ user: currentUser.name, action: "Edited Rule", entity: "BusinessRule", entityId: finalRule.id, details: `${finalRule.name} saved as ${finalRule.status}.` });
    } else {
      addRule(finalRule);
      logAudit({ user: currentUser.name, action: "Created Rule", entity: "BusinessRule", entityId: finalRule.id, details: `New rule created as ${finalRule.status}.` });
    }
    return finalRule;
  };

  const handleSaveDraft = () => {
    if (!validate()) return;
    const saved = persistRule("Draft");
    toast.success("Rule saved", { description: `${saved.id} · ${saved.name} is now Draft.` });
    router.push("/repository");
  };

  // Only roles with the `rule.publish` capability see this — it saves and
  // immediately approves/publishes in one step (BRD §5.5 allows PM/Risk/
  // Underwriter/SysAdmin to self-publish; Business Analyst cannot).
  const handleSaveAndPublish = () => {
    if (!validate()) return;
    const saved = persistRule("Draft");
    approveRule(saved.id);
    toast.success("Rule published", { description: `${saved.id} · ${saved.name} is now Active.` });
    router.push("/repository");
  };

  // Roles without `rule.publish` submit into the Testing/review queue instead
  // of publishing directly — BRD §5.5's governance workflow.
  const handleSubmitForReview = () => {
    if (!validate()) return;
    const saved = persistRule("Draft");
    submitForReview(saved.id);
    toast.success("Submitted for review", { description: `${saved.id} · ${saved.name} moved to Testing.` });
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
        {!existingRule && (
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setTemplatePickerOpen(true)}>
            <LayoutTemplate className="size-3.5" /> Use Template
          </Button>
        )}
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSaveDraft}>
          <Save className="size-3.5" /> Save Draft
        </Button>
        {canPublish ? (
          <Button size="sm" className="gap-1.5" onClick={handleSaveAndPublish}>
            <Rocket className="size-3.5" /> Save &amp; Publish
          </Button>
        ) : (
          <Button size="sm" className="gap-1.5" onClick={handleSubmitForReview}>
            <FlaskConical className="size-3.5" /> Submit for Review
          </Button>
        )}
      </div>

      <TemplatePicker
        open={templatePickerOpen}
        onOpenChange={setTemplatePickerOpen}
        templates={ruleTemplates}
        onUse={applyTemplate}
      />

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
