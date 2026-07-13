"use client";

import { Trash2 } from "lucide-react";
import { Domain, Operator, QuantifierCondition, Quantifier } from "@/lib/types";
import { fieldsForDomain, getField, OPERATORS } from "@/lib/fields";
import { useAppStore } from "@/lib/store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const BOOLEAN_ITEMS = { true: "Yes", false: "No" };

const QUANTIFIER_OPTIONS: { value: Quantifier; label: string }[] = [
  { value: "ANY", label: "ANY item" },
  { value: "ALL", label: "ALL items" },
  { value: "NONE", label: "NO item" },
  { value: "COUNT", label: "COUNT of items" },
];

const COUNT_COMPARATORS: { value: NonNullable<QuantifierCondition["countComparator"]>; label: string }[] = [
  { value: ">=", label: "at least" },
  { value: ">", label: "more than" },
  { value: "=", label: "exactly" },
  { value: "<", label: "fewer than" },
  { value: "<=", label: "at most" },
];

export function QuantifierConditionEditor({
  condition,
  domain,
  onChange,
  onDelete,
}: {
  condition: QuantifierCondition;
  domain: Domain;
  onChange: (patch: Partial<QuantifierCondition>) => void;
  onDelete: () => void;
}) {
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const listFields = fieldsForDomain(fieldCatalog, domain).filter((f) => f.type === "list");
  const field = getField(fieldCatalog, condition.field);
  const itemType = field?.itemType;
  const availableOperators = OPERATORS.filter((o) => !itemType || o.types.includes(itemType));

  const renderItemValueInput = () => {
    if (itemType === "boolean") {
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
    if (itemType === "enum" && field?.itemOptions) {
      return (
        <Select value={condition.value || undefined} onValueChange={(v) => onChange({ value: v ?? "" })}>
          <SelectTrigger size="sm" className="h-8 w-40"><SelectValue placeholder="Value" /></SelectTrigger>
          <SelectContent>
            {field.itemOptions.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    if (condition.operator === "between") {
      return (
        <div className="flex items-center gap-1.5">
          <Input type="number" value={condition.value} onChange={(e) => onChange({ value: e.target.value })} placeholder="From" className="h-8 w-20" />
          <span className="text-xs text-muted-foreground">–</span>
          <Input type="number" value={condition.value2 ?? ""} onChange={(e) => onChange({ value2: e.target.value })} placeholder="To" className="h-8 w-20" />
        </div>
      );
    }
    return (
      <Input
        type={itemType === "number" || itemType === "currency" ? "number" : "text"}
        value={condition.value}
        onChange={(e) => onChange({ value: e.target.value })}
        placeholder="Value"
        className="h-8 w-28"
      />
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/5 px-2 py-1.5">
      <Select
        value={condition.quantifier}
        onValueChange={(v) => onChange({ quantifier: (v ?? "ANY") as Quantifier })}
      >
        <SelectTrigger size="sm" className="h-8 w-32 border-violet-500/40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {QUANTIFIER_OPTIONS.map((q) => (
            <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-xs text-muted-foreground">in</span>

      <Select
        items={Object.fromEntries(listFields.map((f) => [f.key, f.label]))}
        value={condition.field || undefined}
        onValueChange={(v) => onChange({ field: (v as string) ?? "", value: "", value2: undefined })}
      >
        <SelectTrigger size="sm" className="h-8 w-44">
          <SelectValue placeholder={listFields.length === 0 ? "No list fields yet" : "List field..."} />
        </SelectTrigger>
        <SelectContent>
          {listFields.map((f) => (
            <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-xs text-muted-foreground">where item</span>

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

      {renderItemValueInput()}
      {field?.unit && <span className="text-xs text-muted-foreground">{field.unit}</span>}

      {condition.quantifier === "COUNT" && (
        <>
          <span className="text-xs text-muted-foreground">is</span>
          <Select
            value={condition.countComparator ?? ">="}
            onValueChange={(v) => onChange({ countComparator: v as QuantifierCondition["countComparator"] })}
          >
            <SelectTrigger size="sm" className="h-8 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNT_COMPARATORS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            value={condition.countValue ?? ""}
            onChange={(e) => onChange({ countValue: e.target.value })}
            placeholder="N"
            className="h-8 w-16"
          />
        </>
      )}

      <Button variant="ghost" size="icon-sm" onClick={onDelete} className="ml-auto text-muted-foreground hover:text-destructive">
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
