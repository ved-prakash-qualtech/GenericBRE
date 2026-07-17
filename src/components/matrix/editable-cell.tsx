"use client";

import { useState } from "react";
import { MatrixColumn } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

function formatDisplay(column: MatrixColumn, value: string | number): string {
  if (column.type === "percent") return `${value}%`;
  if (column.type === "currency") return `₹${Number(value).toLocaleString("en-IN")}`;
  return String(value);
}

export function EditableCell({
  column,
  value,
  onCommit,
  invalid,
  readOnly,
}: {
  column: MatrixColumn;
  value: string | number;
  onCommit: (value: string | number) => void;
  invalid?: boolean;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  if (readOnly) {
    return (
      <span className={cn("flex h-7 w-full items-center px-1.5 text-xs tabular-nums", invalid && "text-destructive font-medium")}>
        {formatDisplay(column, value)}
      </span>
    );
  }

  if (column.type === "select") {
    return (
      <Select
        items={Object.fromEntries((column.options ?? []).map((o) => [o, o]))}
        value={String(value)}
        onValueChange={(v) => onCommit(v as string)}
      >
        <SelectTrigger size="sm" className={cn("h-7 w-full border-transparent bg-transparent hover:border-input", invalid && "border-destructive")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(column.options ?? []).map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (editing) {
    return (
      <Input
        autoFocus
        type={column.type === "text" ? "text" : "number"}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          onCommit(column.type === "text" ? draft : Number(draft));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(String(value));
            setEditing(false);
          }
        }}
        className="h-7 w-full px-1.5 text-xs tabular-nums"
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      className={cn(
        "flex h-7 w-full items-center rounded-md px-1.5 text-left text-xs tabular-nums transition-colors hover:bg-accent",
        invalid && "bg-destructive/10 text-destructive font-medium"
      )}
    >
      {formatDisplay(column, value)}
    </button>
  );
}
