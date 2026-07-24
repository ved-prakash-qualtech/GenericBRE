"use client";

import { useState } from "react";
import { RotateCcw, SlidersHorizontal, Check } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { MultiSelect } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// Domain-only — this is what actually scopes the Dashboard's widgets (see
// useScopedRules/globalFilters.domains). Status used to live here too but
// was never read by any page, so it was dropped rather than shipped as a
// dead control. The header only renders this on /dashboard (see header.tsx)
// since no other page consumes globalFilters at all.
export function GlobalFilterBar() {
  const filters = useAppStore((s) => s.globalFilters);
  const setFilters = useAppStore((s) => s.setGlobalFilters);
  const resetFilters = useAppStore((s) => s.resetGlobalFilters);
  const industries = useAppStore((s) => s.industries);
  const DOMAIN_OPTIONS = industries.map((i) => ({ value: i.id, label: i.name }));
  const hasActive = filters.domains.length > 0;

  return (
    <div className="hidden items-center gap-2 lg:flex">
      <MultiSelect
        label="Domain"
        options={DOMAIN_OPTIONS}
        selected={filters.domains}
        onChange={(v) => setFilters({ domains: v as string[] })}
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
  const count = filters.domains.length;

  const toggle = (value: string) => {
    const next = filters.domains.includes(value) ? filters.domains.filter((v) => v !== value) : [...filters.domains, value];
    setFilters({ domains: next });
  };

  return (
    <>
      <Button variant="outline" size="sm" className="h-9 gap-1.5 lg:hidden" onClick={() => setOpen(true)} aria-label="Filters">
        <SlidersHorizontal className="size-3.5" />
        <span className="hidden lg:inline">Filters</span>
        {count > 0 && <Badge variant="secondary" className="h-4.5 min-w-4.5 rounded-full px-1 text-sm">{count}</Badge>}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[75vh]">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 overflow-y-auto px-4 pb-4">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Domain</p>
              <div className="flex flex-wrap gap-2">
                {DOMAIN_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => toggle(o.value)}
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
