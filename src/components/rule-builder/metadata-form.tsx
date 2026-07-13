"use client";

import { BusinessRule, Domain, Priority } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

const PRIORITIES: Priority[] = [1, 2, 3, 4, 5];
const PRIORITY_ITEMS: Record<number, string> = {
  1: "P1 · Critical",
  2: "P2 · High",
  3: "P3 · Medium",
  4: "P4 · Low",
  5: "P5 · Lowest",
};

interface MetadataFormProps {
  data: Pick<BusinessRule, "id" | "name" | "domain" | "category" | "subCategory" | "groupId" | "priority" | "status" | "description" | "owner">;
  onChange: (patch: Partial<BusinessRule>) => void;
  errors?: Record<string, string>;
}

export function MetadataForm({ data, onChange, errors = {} }: MetadataFormProps) {
  const industries = useAppStore((s) => s.industries);
  const ruleCategories = useAppStore((s) => s.ruleCategories);
  const owners = useAppStore((s) => s.owners);
  const ruleGroups = useAppStore((s) => s.ruleGroups);

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 lg:col-span-2">
          <Label className={cn(errors.name && "text-destructive")}>Rule Name *</Label>
          <Input
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. Minimum Credit Score Validation"
            className={cn(errors.name && "border-destructive")}
          />
          {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Rule ID</Label>
          <Input value={data.id} disabled className="font-mono text-muted-foreground" />
        </div>

        <div className="space-y-1.5">
          <Label>Priority *</Label>
          <Select
            items={PRIORITY_ITEMS}
            value={String(data.priority)}
            onValueChange={(v) => onChange({ priority: Number(v) as Priority })}
          >
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={String(p)}>{PRIORITY_ITEMS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Industry *</Label>
          <Select value={data.domain} onValueChange={(v) => onChange({ domain: v as Domain })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {industries.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className={cn(errors.category && "text-destructive")}>Category *</Label>
          <Select value={data.category} onValueChange={(v) => onChange({ category: v ?? "" })}>
            <SelectTrigger className={cn("w-full", errors.category && "border-destructive")}><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {ruleCategories.map((c) => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Sub Category</Label>
          <Input
            value={data.subCategory ?? ""}
            onChange={(e) => onChange({ subCategory: e.target.value })}
            placeholder="Optional"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <div className="flex h-9 items-center">
            <StatusBadge status={data.status} />
          </div>
          <p className="text-[10px] text-muted-foreground/70">Changed via the workflow actions (Save Draft / Submit for Review / Publish), not directly.</p>
        </div>

        <div className="space-y-1.5">
          <Label>Rule Group</Label>
          <Select
            value={data.groupId ?? "__none__"}
            onValueChange={(v) => onChange({ groupId: v === "__none__" ? undefined : v ?? undefined })}
          >
            <SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {ruleGroups.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Owner</Label>
          <Select value={data.owner} onValueChange={(v) => onChange({ owner: v ?? "" })}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select owner" /></SelectTrigger>
            <SelectContent>
              {owners.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
          <Label>Description</Label>
          <Textarea
            value={data.description ?? ""}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Explain the business purpose of this rule for future maintainers..."
            className="min-h-16"
          />
        </div>
      </div>
    </div>
  );
}
