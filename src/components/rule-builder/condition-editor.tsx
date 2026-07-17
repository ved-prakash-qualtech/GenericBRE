"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Trash2, Variable } from "lucide-react";
import { Condition, Domain, Operator } from "@/lib/types";
import { fieldsForDomain, getField, OPERATORS } from "@/lib/fields";
import { useAppStore } from "@/lib/store";
import { getGeneratedVariables } from "@/lib/rule-chaining";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const BOOLEAN_ITEMS = { true: "Yes", false: "No" };

export function ConditionEditor({
  condition,
  domain,
  currentRuleId,
  onChange,
  onDelete,
}: {
  condition: Condition;
  domain: Domain;
  /** The rule being edited, so its own outputs are excluded from its own
   *  "Generated Variables" list — rule chaining is global (see
   *  src/lib/rule-chaining.ts), not scoped to a group. Absent for Rule Templates. */
  currentRuleId?: string;
  onChange: (patch: Partial<Condition>) => void;
  onDelete: () => void;
}) {
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const rules = useAppStore((s) => s.rules);
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
  const fields = fieldsForDomain(fieldCatalog, domain);
  const variables = getGeneratedVariables(rules, currentRuleId);
  const field = getField(fieldCatalog, condition.field);
  const variable = variables.find((v) => v.key === condition.field);
  const availableOperators = OPERATORS.filter((o) => !field || o.types.includes(field.type));
  const fieldLabel = field?.label ?? variable?.key ?? "";

  const selectField = (key: string) => {
    onChange({ field: key, value: "", value2: undefined });
    setFieldPickerOpen(false);
  };

  const renderValueInput = () => {
    if (field?.type === "boolean") {
      return (
        <Select items={BOOLEAN_ITEMS} value={condition.value || undefined} onValueChange={(v) => onChange({ value: v ?? "" })}>
          <SelectTrigger size="sm" className="h-8 w-28"><SelectValue placeholder="Value" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    if (field?.type === "enum" && field.options && condition.operator !== "in") {
      return (
        <Select value={condition.value || undefined} onValueChange={(v) => onChange({ value: v ?? "" })}>
          <SelectTrigger size="sm" className="h-8 w-40"><SelectValue placeholder="Value" /></SelectTrigger>
          <SelectContent>
            {field.options.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    if (condition.operator === "between") {
      const betweenType = field?.type === "date" ? "date" : "number";
      return (
        <div className="flex items-center gap-1.5">
          <Input
            type={betweenType}
            value={condition.value}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder="From"
            className="h-8 w-20"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            type={betweenType}
            value={condition.value2 ?? ""}
            onChange={(e) => onChange({ value2: e.target.value })}
            placeholder="To"
            className="h-8 w-20"
          />
        </div>
      );
    }
    return (
      <Input
        type={field?.type === "number" || field?.type === "currency" ? "number" : field?.type === "date" ? "date" : "text"}
        value={condition.value}
        onChange={(e) => onChange({ value: e.target.value })}
        placeholder={condition.operator === "in" ? "value1, value2, ..." : "Value"}
        className="h-8 w-32"
      />
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-background px-2 py-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="outline" size="sm" className="h-8 w-16 text-xs font-medium">
            {condition.conditionType === "where" ? "WHERE" : "IF"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onChange({ conditionType: "if" })}>
            IF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onChange({ conditionType: "where" })}>
            WHERE
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover open={fieldPickerOpen} onOpenChange={setFieldPickerOpen}>
        <PopoverTrigger
          render={<Button variant="outline" size="sm" className="h-8 w-48 justify-between gap-1.5 font-normal" />}
        >
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            {variable && <Variable className="size-3.5 shrink-0 text-primary" />}
            <span className="truncate">{fieldLabel || "Search fields..."}</span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0">
          <Command>
            <CommandInput placeholder="Search fields..." />
            <CommandList>
              <CommandEmpty>No matching fields.</CommandEmpty>
              <CommandGroup heading="Business Fields">
                {fields.map((f) => (
                  <CommandItem key={f.key} value={f.label} onSelect={() => selectField(f.key)} className="gap-2">
                    <Check className={cn("size-3.5", condition.field === f.key ? "opacity-100" : "opacity-0")} />
                    {f.label}
                  </CommandItem>
                ))}
              </CommandGroup>
              {variables.length > 0 && (
                <CommandGroup heading="Generated Variables">
                  {variables.map((v) => (
                    <CommandItem key={v.key} value={v.key} onSelect={() => selectField(v.key)} className="gap-2">
                      <Check className={cn("size-3.5", condition.field === v.key ? "opacity-100" : "opacity-0")} />
                      <Variable className="size-3.5 shrink-0 text-primary" />
                      <span className="truncate">{v.key}</span>
                      <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">from {v.sourceRuleName}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Select
        items={Object.fromEntries(availableOperators.map((o) => [o.value, o.label]))}
        value={condition.operator}
        onValueChange={(v) => onChange({ operator: v as Operator })}
      >
        <SelectTrigger size="sm" className="h-8 w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableOperators.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {renderValueInput()}
      {field?.unit && <span className="text-xs text-muted-foreground">{field.unit}</span>}

      <Button variant="ghost" size="icon-sm" onClick={onDelete} className="ml-auto text-muted-foreground hover:text-destructive">
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
