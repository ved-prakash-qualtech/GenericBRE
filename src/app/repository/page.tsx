"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { buildColumns } from "@/components/repository/columns";
import { DataTable } from "@/components/repository/data-table";
import { RuleViewSheet } from "@/components/repository/rule-view-sheet";
import { downloadCsv } from "@/lib/csv";
import { BusinessRule } from "@/lib/types";
import { CATEGORIES, OWNERS } from "@/lib/fields";

function RepositoryContent() {
  const rules = useAppStore((s) => s.rules);
  const cloneRule = useAppStore((s) => s.cloneRule);
  const setRuleStatus = useAppStore((s) => s.setRuleStatus);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [domains, setDomains] = useState<string[]>(searchParams.get("domain") ? [searchParams.get("domain")!] : []);
  const [statuses, setStatuses] = useState<string[]>(searchParams.get("status") ? [searchParams.get("status")!] : []);
  const [categories, setCategories] = useState<string[]>([]);
  const [owners, setOwners] = useState<string[]>([]);
  const [viewRule, setViewRule] = useState<BusinessRule | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const filtered = useMemo(() => {
    return rules.filter((r) => {
      if (search && !`${r.name} ${r.id}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (domains.length && !domains.includes(r.domain)) return false;
      if (statuses.length && !statuses.includes(r.status)) return false;
      if (categories.length && !categories.includes(r.category)) return false;
      if (owners.length && !owners.includes(r.owner)) return false;
      return true;
    });
  }, [rules, search, domains, statuses, categories, owners]);

  const columns = useMemo(
    () =>
      buildColumns({
        onView: (r) => {
          setViewRule(r);
          setViewOpen(true);
        },
        onEdit: (r) => router.push(`/rule-builder?id=${r.id}`),
        onClone: (r) => {
          const newId = cloneRule(r.id);
          toast.success(`Cloned ${r.id} → ${newId}`, { description: "New rule saved as Draft." });
        },
        onDisable: (r) => {
          setRuleStatus(r.id, "Inactive");
          toast.info(`${r.id} disabled`, { description: `${r.name} removed from live evaluation.` });
        },
        onArchive: (r) => {
          setRuleStatus(r.id, "Archived");
          toast.info(`${r.id} archived`);
        },
        onPublish: (r) => {
          setRuleStatus(r.id, "Active");
          toast.success(`${r.id} published`, { description: `${r.name} is now live.` });
        },
      }),
    [router, cloneRule, setRuleStatus]
  );

  const clearAll = () => {
    setSearch("");
    setDomains([]);
    setStatuses([]);
    setCategories([]);
    setOwners([]);
  };

  const hasFilters = search || domains.length || statuses.length || categories.length || owners.length;

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
                Owner: r.owner,
                UpdatedAt: r.updatedAt,
              }))
            )
          }
        >
          <Download className="size-3.5" /> Export CSV
        </Button>
        <Button size="sm" className="gap-1.5" onClick={() => router.push("/rule-builder")}>
          <Plus className="size-3.5" /> Create Rule
        </Button>
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
          options={[
            { value: "Lending", label: "Lending" },
            { value: "Insurance", label: "Insurance" },
            { value: "NBFC", label: "NBFC" },
          ]}
          selected={domains}
          onChange={setDomains}
        />
        <MultiSelect
          label="Status"
          options={[
            { value: "Active", label: "Active" },
            { value: "Draft", label: "Draft" },
            { value: "Inactive", label: "Inactive" },
            { value: "Archived", label: "Archived" },
          ]}
          selected={statuses}
          onChange={setStatuses}
        />
        <MultiSelect
          label="Category"
          options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          selected={categories}
          onChange={setCategories}
        />
        <MultiSelect
          label="Owner"
          options={OWNERS.map((o) => ({ value: o, label: o }))}
          selected={owners}
          onChange={setOwners}
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs">
            Clear all
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 p-5 sm:p-6">
        <DataTable columns={columns} data={filtered} />
      </div>

      <RuleViewSheet rule={viewRule} open={viewOpen} onOpenChange={setViewOpen} />
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
