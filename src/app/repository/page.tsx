"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Download, Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAppStore, useHasCapability } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { buildColumns } from "@/components/repository/columns";
import { DataTable } from "@/components/repository/data-table";
import { RuleViewSheet } from "@/components/repository/rule-view-sheet";
import { downloadCsv } from "@/lib/csv";
import { BusinessRule } from "@/lib/types";
import { detectRuleConflicts, detectConflictsForCandidate, RuleConflict } from "@/lib/conflict-detection";

function RepositoryContent() {
  const rules = useAppStore((s) => s.rules);
  const cloneRule = useAppStore((s) => s.cloneRule);
  const setRuleStatus = useAppStore((s) => s.setRuleStatus);
  const submitForReview = useAppStore((s) => s.submitForReview);
  const approveRule = useAppStore((s) => s.approveRule);
  const rejectRule = useAppStore((s) => s.rejectRule);
  const promoteRuleEnvironment = useAppStore((s) => s.promoteRuleEnvironment);
  const deleteRule = useAppStore((s) => s.deleteRule);
  const industries = useAppStore((s) => s.industries);
  const categories = useAppStore((s) => s.categories);
  const owners = useAppStore((s) => s.owners);
  const ruleGroups = useAppStore((s) => s.ruleGroups);
  const canPublish = useHasCapability("rule.publish");
  const canCreate = useHasCapability("rule.create");
  const canEdit = useHasCapability("rule.edit");
  const canDelete = useHasCapability("rule.delete");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [domains, setDomains] = useState<string[]>(searchParams.get("domain") ? [searchParams.get("domain")!] : []);
  const [statuses, setStatuses] = useState<string[]>(searchParams.get("status") ? [searchParams.get("status")!] : []);
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [ownerFilters, setOwnerFilters] = useState<string[]>([]);
  const [groupFilters, setGroupFilters] = useState<string[]>([]);
  const [environmentFilters, setEnvironmentFilters] = useState<string[]>([]);
  const [viewRule, setViewRule] = useState<BusinessRule | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [approvalConfirm, setApprovalConfirm] = useState<{ rule: BusinessRule; conflicts: RuleConflict[] } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<BusinessRule | null>(null);

  const conflicts = useMemo(() => detectRuleConflicts(rules), [rules]);

  const performApprove = useCallback(
    (r: BusinessRule) => {
      const result = approveRule(r.id);
      if (result.ok) {
        toast.success(`${r.id} approved & published`, { description: `${r.name} is now live.` });
      } else {
        toast.error("Approval blocked", { description: result.reason });
      }
    },
    [approveRule]
  );

  const filtered = useMemo(() => {
    return rules.filter((r) => {
      if (search && !`${r.name} ${r.id}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (domains.length && !domains.includes(r.domain)) return false;
      if (statuses.length && !statuses.includes(r.status)) return false;
      if (categoryFilters.length && !categoryFilters.includes(r.category)) return false;
      if (ownerFilters.length && !ownerFilters.includes(r.owner)) return false;
      if (groupFilters.length && !groupFilters.includes(r.groupId ?? "")) return false;
      if (environmentFilters.length && !environmentFilters.includes(r.environment)) return false;
      return true;
    });
  }, [rules, search, domains, statuses, categoryFilters, ownerFilters, groupFilters, environmentFilters]);

  const columns = useMemo(
    () =>
      buildColumns(
        {
          onView: (r) => {
            setViewRule(r);
            setViewOpen(true);
          },
          onEdit: (r) => router.push(`/rule-builder?id=${r.id}`),
          onClone: (r) => {
            const result = cloneRule(r.id);
            if (result.ok) {
              toast.success(`Cloned ${r.id} → ${result.newId}`, { description: "New rule saved as Draft." });
            } else {
              toast.error("Clone blocked", { description: result.reason });
            }
          },
          onDisable: (r) => {
            const result = setRuleStatus(r.id, "Inactive");
            if (result.ok) {
              toast.info(`${r.id} disabled`, { description: `${r.name} removed from live evaluation.` });
            } else {
              toast.error("Action blocked", { description: result.reason });
            }
          },
          onArchive: (r) => {
            const result = setRuleStatus(r.id, "Archived");
            if (result.ok) {
              toast.info(`${r.id} archived`);
            } else {
              toast.error("Action blocked", { description: result.reason });
            }
          },
          onSubmitForReview: (r) => {
            const result = submitForReview(r.id);
            if (result.ok) {
              toast.success(`${r.id} submitted for review`, { description: "Moved to Testing pending approval." });
            } else {
              toast.error("Action blocked", { description: result.reason });
            }
          },
          onApprove: (r) => {
            const candidateConflicts = detectConflictsForCandidate(r, rules);
            if (candidateConflicts.length > 0) {
              setApprovalConfirm({ rule: r, conflicts: candidateConflicts });
            } else {
              performApprove(r);
            }
          },
          onReject: (r) => {
            const result = rejectRule(r.id);
            if (result.ok) {
              toast.info(`${r.id} sent back to Draft`);
            } else {
              toast.error("Action blocked", { description: result.reason });
            }
          },
          onReactivate: (r) => {
            const result = setRuleStatus(r.id, "Active");
            if (result.ok) {
              toast.success(`${r.id} re-activated`);
            } else {
              toast.error("Action blocked", { description: result.reason });
            }
          },
          onPromote: (r) => {
            const result = promoteRuleEnvironment(r.id);
            if (result.ok) {
              toast.success(`${r.id} promoted`, { description: `${r.name} is now in a higher environment tier.` });
            } else {
              toast.error("Promotion blocked", { description: result.reason });
            }
          },
          onTestInSimulator: (r) => {
            router.push(`/simulator?domain=${r.domain}&sandboxRule=${r.id}`);
          },
          onDelete: (r) => setDeleteConfirm(r),
        },
        { canPublish, canCreate, canEdit, canDelete, ruleGroups }
      ),
    [router, cloneRule, setRuleStatus, submitForReview, rejectRule, promoteRuleEnvironment, canPublish, canCreate, canEdit, canDelete, ruleGroups, rules, performApprove]
  );

  const clearAll = () => {
    setSearch("");
    setDomains([]);
    setStatuses([]);
    setCategoryFilters([]);
    setOwnerFilters([]);
    setGroupFilters([]);
    setEnvironmentFilters([]);
  };

  const hasFilters =
    search ||
    domains.length ||
    statuses.length ||
    categoryFilters.length ||
    ownerFilters.length ||
    groupFilters.length ||
    environmentFilters.length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-card/40 px-5 py-3.5 sm:px-6">
        <div className="mr-auto">
          <h1 className="text-lg font-semibold tracking-tight">Rule Repository</h1>
          <p className="text-xs text-muted-foreground">Searchable catalogue of every configured business rule</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() =>
            downloadCsv(
              "rule_repository",
              filtered.map((r) => ({
                RuleID: r.id,
                Name: r.name,
                Domain: r.domain,
                Category: r.category,
                Priority: r.priority,
                Status: r.status,
                Environment: r.environment,
                Owner: r.owner,
                UpdatedAt: r.updatedAt,
              }))
            )
          }
        >
          <Download className="size-3.5" /> Export CSV
        </Button>
        {canCreate && (
          <Button size="sm" className="gap-1.5" onClick={() => router.push("/rule-builder")}>
            <Plus className="size-3.5" /> Create Rule
          </Button>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-5 py-2.5 sm:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search rules by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-64 pl-8"
          />
        </div>
        <MultiSelect
          label="Domain"
          options={industries.map((i) => ({ value: i.id, label: i.name }))}
          selected={domains}
          onChange={setDomains}
        />
        <MultiSelect
          label="Status"
          options={[
            { value: "Active", label: "Active" },
            { value: "Testing", label: "Testing" },
            { value: "Draft", label: "Draft" },
            { value: "Inactive", label: "Inactive" },
            { value: "Archived", label: "Archived" },
          ]}
          selected={statuses}
          onChange={setStatuses}
        />
        <MultiSelect
          label="Category"
          options={categories.map((c) => ({ value: c, label: c }))}
          selected={categoryFilters}
          onChange={setCategoryFilters}
        />
        <MultiSelect
          label="Owner"
          options={owners.map((o) => ({ value: o, label: o }))}
          selected={ownerFilters}
          onChange={setOwnerFilters}
        />
        <MultiSelect
          label="Rule Group"
          options={ruleGroups.map((g) => ({ value: g.id, label: g.name }))}
          selected={groupFilters}
          onChange={setGroupFilters}
        />
        <MultiSelect
          label="Environment"
          options={[
            { value: "Dev", label: "Dev" },
            { value: "UAT", label: "UAT" },
            { value: "Prod", label: "Prod" },
          ]}
          selected={environmentFilters}
          onChange={setEnvironmentFilters}
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs">
            Clear all
          </Button>
        )}
      </div>

      {conflicts.length > 0 && (
        <div className="flex shrink-0 flex-col gap-1 border-b bg-destructive/5 px-5 py-2.5 sm:px-6">
          {conflicts.slice(0, 3).map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>
                <span className="font-semibold">Possible conflict:</span> {c.ruleAId} vs {c.ruleBId} — {c.reason}
              </span>
            </div>
          ))}
          {conflicts.length > 3 && (
            <p className="pl-5.5 text-[11px] text-destructive/70">+{conflicts.length - 3} more possible conflict(s).</p>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 p-5 sm:p-6">
        <DataTable columns={columns} data={filtered} />
      </div>

      <RuleViewSheet rule={viewRule} open={viewOpen} onOpenChange={setViewOpen} />

      <AlertDialog open={!!approvalConfirm} onOpenChange={(v) => !v && setApprovalConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" /> Possible conflict detected
            </AlertDialogTitle>
            <AlertDialogDescription>
              Publishing {approvalConfirm?.rule.id} would create
              {approvalConfirm && approvalConfirm.conflicts.length > 1 ? " these conflicts" : " this conflict"} with
              rules already Active. You can still approve — this is advisory, not a hard block.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="space-y-1.5 rounded-lg border bg-destructive/5 p-2.5 text-xs">
            {approvalConfirm?.conflicts.map((c, i) => (
              <li key={i} className="text-destructive">
                {c.ruleAId} vs {c.ruleBId} — {c.reason}
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (approvalConfirm) performApprove(approvalConfirm.rule);
                setApprovalConfirm(null);
              }}
            >
              Approve Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(v) => !v && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" /> Delete {deleteConfirm?.id} permanently?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes {deleteConfirm?.name} and its condition/action definitions for good — unlike Archive, this
              can&apos;t be undone. Its version history and audit trail entries stay for the record, but the rule
              itself is gone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteConfirm) return;
                const result = deleteRule(deleteConfirm.id);
                if (result.ok) {
                  toast.success(`${deleteConfirm.id} deleted permanently`);
                } else {
                  toast.error("Delete blocked", { description: result.reason });
                }
                setDeleteConfirm(null);
              }}
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function RepositoryPage() {
  return (
    <Suspense fallback={null}>
      <RepositoryContent />
    </Suspense>
  );
}
