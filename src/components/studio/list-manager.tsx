"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function ListManager({
  label,
  description,
  items,
  onAdd,
  onDelete,
}: {
  label: string;
  description: string;
  items: string[];
  onAdd: (value: string) => void;
  onDelete: (value: string) => void;
}) {
  const [draft, setDraft] = useState("");

  const submit = () => {
    const value = draft.trim();
    if (!value) return;
    if (items.includes(value)) {
      toast.error(`"${value}" already exists.`);
      return;
    }
    onAdd(value);
    toast.success(`"${value}" added.`);
    setDraft("");
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={`Add a new ${label.toLowerCase()}...`}
          className="h-9"
        />
        <Button size="sm" className="shrink-0 gap-1.5" onClick={submit}>
          <Plus className="size-3.5" /> Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} variant="secondary" className="gap-1.5 py-1.5 pr-1.5 pl-2.5 text-xs">
            {item}
            <button
              onClick={() => {
                onDelete(item);
                toast.info(`"${item}" removed.`);
              }}
              className="rounded-full p-0.5 hover:bg-destructive/15 hover:text-destructive"
              aria-label={`Remove ${item}`}
            >
              <Trash2 className="size-3" />
            </button>
          </Badge>
        ))}
        {items.length === 0 && <p className="text-xs text-muted-foreground">None configured yet.</p>}
      </div>
    </div>
  );
}
