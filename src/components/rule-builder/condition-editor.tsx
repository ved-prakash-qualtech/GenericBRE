"use client";

import { Trash2 } from "lucide-react";
import { Condition, Domain, Operator } from "@/lib/types";
import { fieldsForDomain, getField, OPERATORS } from "@/lib/fields";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const BOOLEAN_ITEMS = { true: "Yes", false: "No" };

export function ConditionEditor({
  condition,
  domain,
  onChange,
  onDelete,
}: {
  condition: Condition;
  domain: Domain;
  onChange: (patch: Partial<Condition>) => void;
  onDelete: () => void;
}) {
  const fields = fieldsForDomain(domain);
  const field = getField(condition.field);
  const availableOperators = OPERATORS.filter((o) => !field || o.types.includes(field.type));

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
      return (
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            value={condition.value}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder="From"
            className="h-8 w-20"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            type="number"
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
        type={field?.type === "number" || field?.type === "currency" ? "number" : "text"}
        value={condition.value}
        onChange={(e) => onChange({ value: e.target.value })}
        placeholder={condition.operator === "in" ? "value1, value2, ..." : "Value"}
        className="h-8 w-32"
      />
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-background px-2 py-1.5">
      <Select
        items={Object.fromEntries(fields.map((f) => [f.key, f.label]))}
        value={condition.field || undefined}
        onValueChange={(v) => onChange({ field: v as string, value: "", value2: undefined })}
      >
        <SelectTrigger size="sm" className="h-8 w-44">
          <SelectValue placeholder="Business field..." />
        </SelectTrigger>
        <SelectContent>
          {fields.map((f) => (
            <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

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
