"use client";

import { BusinessRule, Domain, Priority, RuleStatus } from "@/lib/types";
import { CATEGORIES, OWNERS } from "@/lib/fields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const DOMAINS: Domain[] = ["Lending", "Insurance", "NBFC"];
const PRIORITIES: Priority[] = [1, 2, 3, 4, 5];
const STATUSES: RuleStatus[] = ["Draft", "Active", "Inactive", "Archived"];
const PRIORITY_ITEMS: Record<number, string> = {
  1: "P1 · Critical",
  2: "P2 · High",
  3: "P3 · Medium",
  4: "P4 · Low",
  5: "P5 · Lowest",
};

interface MetadataFormProps {
  data: Pick<BusinessRule, "id" | "name" | "domain" | "category" | "subCategory" | "priority" | "status" | "description" | "owner">;
  onChange: (patch: Partial<BusinessRule>) => void;
  errors?: Record<string, string>;
}

export function MetadataForm({ data, onChange, errors = {} }: MetadataFormProps) {
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
          <Label>Domain *</Label>
          <Select value={data.domain} onValueChange={(v) => onChange({ domain: v as Domain })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOMAINS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className={cn(errors.category && "text-destructive")}>Category *</Label>
          <Select value={data.category} onValueChange={(v) => onChange({ category: v ?? "" })}>
            <SelectTrigger className={cn("w-full", errors.category && "border-destructive")}><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
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
          <Label>Status *</Label>
          <Select value={data.status} onValueChange={(v) => onChange({ status: v as RuleStatus })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Owner</Label>
          <Select value={data.owner} onValueChange={(v) => onChange({ owner: v ?? "" })}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select owner" /></SelectTrigger>
            <SelectContent>
              {OWNERS.map((o) => (
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
