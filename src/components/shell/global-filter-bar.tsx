"use client";

import { useState } from "react";
import { RotateCcw, SlidersHorizontal, Check } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { MultiSelect } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RuleStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: RuleStatus; label: string }[] = [
  { value: "Active", label: "Active" },
  { value: "Draft", label: "Draft" },
  { value: "Inactive", label: "Inactive" },
  { value: "Archived", label: "Archived" },
];

export function GlobalFilterBar() {
  const filters = useAppStore((s) => s.globalFilters);
  const setFilters = useAppStore((s) => s.setGlobalFilters);
  const resetFilters = useAppStore((s) => s.resetGlobalFilters);
  const industries = useAppStore((s) => s.industries);
  const DOMAIN_OPTIONS = industries.map((i) => ({ value: i.id, label: i.name }));
  const hasActive = filters.domains.length > 0 || filters.statuses.length > 0;

  return (
    <div className="hidden items-center gap-2 lg:flex">
      <MultiSelect
        label="Domain"
        options={DOMAIN_OPTIONS}
        selected={filters.domains}
        onChange={(v) => setFilters({ domains: v as string[] })}
      />
      <MultiSelect
        label="Status"
        options={STATUS_OPTIONS}
        selected={filters.statuses}
        onChange={(v) => setFilters({ statuses: v as RuleStatus[] })}
      />
      {hasActive && (
        <Button variant="ghost" size="icon" className="size-9" onClick={resetFilters} aria-label="Reset filters">
          <RotateCcw className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

export function MobileFilterButton() {
  const [open, setOpen] = useState(false);
  const filters = useAppStore((s) => s.globalFilters);
  const setFilters = useAppStore((s) => s.setGlobalFilters);
  const resetFilters = useAppStore((s) => s.resetGlobalFilters);
  const industries = useAppStore((s) => s.industries);
  const DOMAIN_OPTIONS = industries.map((i) => ({ value: i.id, label: i.name }));
  const count = filters.domains.length + filters.statuses.length;

  const toggle = (key: "domains" | "statuses", value: string) => {
    const current = filters[key] as string[];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    setFilters({ [key]: next } as never);
  };

  return (
    <>
      <Button variant="outline" size="sm" className="h-9 gap-1.5 lg:hidden" onClick={() => setOpen(true)} aria-label="Filters">
        <SlidersHorizontal className="size-3.5" />
        <span className="hidden lg:inline">Filters</span>
        {count > 0 && <Badge variant="secondary" className="h-4.5 min-w-4.5 rounded-full px-1 text-[10px]">{count}</Badge>}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[75vh]">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 overflow-y-auto px-4 pb-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Domain</p>
              <div className="flex flex-wrap gap-2">
                {DOMAIN_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => toggle("domains", o.value)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm",
                      filters.domains.includes(o.value) && "border-primary bg-primary/10 text-primary"
                    )}
                  >
                    {filters.domains.includes(o.value) && <Check className="size-3.5" />}
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => toggle("statuses", o.value)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm",
                      filters.statuses.includes(o.value) && "border-primary bg-primary/10 text-primary"
                    )}
                  >
                    {filters.statuses.includes(o.value) && <Check className="size-3.5" />}
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={resetFilters}>
                Reset
              </Button>
              <Button className="flex-1" onClick={() => setOpen(false)}>
                Apply
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
