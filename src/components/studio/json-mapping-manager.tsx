"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Wand2, FileJson, Save } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { JsonMapping, JsonMappingEntry, FieldDataType } from "@/lib/types";
import { flattenJson } from "@/lib/json-mapping";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

const FIELD_TYPES: FieldDataType[] = ["number", "string", "boolean", "enum", "currency", "list"];

function newDraft(industry: string): JsonMapping {
  return {
    id: "",
    name: "",
    industry,
    direction: "request",
    entries: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function JsonMappingManager() {
  const jsonMappings = useAppStore((s) => s.jsonMappings);
  const industries = useAppStore((s) => s.industries);
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const addJsonMapping = useAppStore((s) => s.addJsonMapping);
  const updateJsonMapping = useAppStore((s) => s.updateJsonMapping);
  const deleteJsonMapping = useAppStore((s) => s.deleteJsonMapping);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<JsonMapping | null>(null);
  const [payloadText, setPayloadText] = useState("");
  const [pendingDelete, setPendingDelete] = useState<JsonMapping | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = selectedId ? jsonMappings.find((m) => m.id === selectedId) ?? null : null;
  const active = draft ?? selected;

  const startCreate = () => {
    setSelectedId(null);
    setDraft(newDraft(industries[0]?.id ?? ""));
    setPayloadText("");
  };
  const select = (m: JsonMapping) => {
    setSelectedId(m.id);
    setDraft(null);
    setPayloadText("");
  };

  const updateActive = (patch: Partial<JsonMapping>) => {
    if (draft) {
      setDraft({ ...draft, ...patch });
    } else if (selected) {
      updateJsonMapping(selected.id, patch);
    }
  };

  const detectAttributes = () => {
    if (!payloadText.trim()) {
      toast.error("Paste or upload a sample JSON payload first.");
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(payloadText);
    } catch {
      toast.error("That isn't valid JSON.");
      return;
    }
    const flattened = flattenJson(parsed);
    const newEntries: JsonMappingEntry[] = flattened.map((f) => ({
      id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      externalAttribute: f.path.split(/[.[]/).pop()?.replace("]", "") || f.path,
      jsonPath: f.path,
      dataType: f.inferredType,
      required: false,
      status: "Unmapped",
    }));
    const existingPaths = new Set((active?.entries ?? []).map((e) => e.jsonPath));
    const merged = [...(active?.entries ?? []), ...newEntries.filter((e) => !existingPaths.has(e.jsonPath))];
    updateActive({ entries: merged });
    toast.success(`Detected ${newEntries.filter((e) => !existingPaths.has(e.jsonPath)).length} new attribute(s).`);
  };

  const updateEntry = (entryId: string, patch: Partial<JsonMappingEntry>) => {
    if (!active) return;
    const entries = active.entries.map((e) =>
      e.id === entryId ? { ...e, ...patch, status: (patch.mappedField ?? e.mappedField) ? "Mapped" as const : "Unmapped" as const } : e
    );
    updateActive({ entries });
  };

  const removeEntry = (entryId: string) => {
    if (!active) return;
    updateActive({ entries: active.entries.filter((e) => e.id !== entryId) });
  };

  const save = () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error("Mapping name is required.");
      return;
    }
    const id = draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (jsonMappings.some((m) => m.id === id)) {
      toast.error(`A mapping with id "${id}" already exists.`);
      return;
    }
    const saved: JsonMapping = { ...draft, id };
    addJsonMapping(saved);
    setDraft(null);
    setSelectedId(id);
    toast.success(`"${saved.name}" saved — ${saved.entries.filter((e) => e.status === "Mapped").length} of ${saved.entries.length} attributes mapped.`);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteJsonMapping(pendingDelete.id);
    if (selectedId === pendingDelete.id) setSelectedId(null);
    toast.info(`"${pendingDelete.name}" removed.`);
    setPendingDelete(null);
  };

  const industryFields = active ? fieldCatalog.filter((f) => f.domain === active.industry || f.domain === "Common") : [];

  return (
    <div className="flex h-full min-h-100 gap-4">
      <div className="w-64 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground">Saved Mappings</p>
          <Button size="icon-sm" variant="ghost" onClick={startCreate}>
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="max-h-125 space-y-1 overflow-y-auto">
          {jsonMappings.map((m) => (
            <button
              key={m.id}
              onClick={() => select(m)}
              className={`w-full rounded-lg border p-2.5 text-left transition-colors ${selectedId === m.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
            >
              <p className="truncate text-xs font-semibold">{m.name}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <Badge variant="secondary" className="text-[9px]">{m.direction}</Badge>
                <span className="text-[10px] text-muted-foreground">{m.entries.length} attrs</span>
              </div>
            </button>
          ))}
          {jsonMappings.length === 0 && !draft && (
            <p className="rounded-lg border border-dashed p-4 text-center text-[11px] text-muted-foreground">
              No mappings yet. Add one to import a sample JSON payload.
            </p>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {!active ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground">
            Select a mapping or create a new one.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 rounded-xl border bg-card p-3.5 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input
                  value={active.name}
                  disabled={!draft}
                  onChange={(e) => updateActive({ name: e.target.value })}
                  placeholder="e.g. Loan Origination Request"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Select value={active.industry} onValueChange={(v) => updateActive({ industry: (v as string) ?? "" })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {industries.map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Direction</Label>
                <Select value={active.direction} onValueChange={(v) => updateActive({ direction: (v as "request" | "response") ?? "request" })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="request">Request JSON</SelectItem>
                    <SelectItem value="response">Response JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border bg-card p-3.5">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-xs">
                  <FileJson className="size-3.5" /> Sample JSON Payload
                </Label>
                <div className="flex gap-1.5">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) file.text().then(setPayloadText);
                      e.target.value = "";
                    }}
                  />
                  <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => fileRef.current?.click()}>
                    <Upload className="size-3.5" /> Upload
                  </Button>
                  <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={detectAttributes}>
                    <Wand2 className="size-3.5" /> Detect Attributes
                  </Button>
                </div>
              </div>
              <Textarea
                value={payloadText}
                onChange={(e) => setPayloadText(e.target.value)}
                placeholder={'{\n  "applicant": { "age": 34, "city": "Pune" },\n  "loan": { "amount": 500000 }\n}'}
                className="min-h-24 font-mono text-xs"
              />
            </div>

            <div className="max-h-100 overflow-auto rounded-xl border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>External Attribute</TableHead>
                    <TableHead>JSON Path</TableHead>
                    <TableHead>Mapped Field</TableHead>
                    <TableHead>Data Type</TableHead>
                    <TableHead className="w-16">Req.</TableHead>
                    <TableHead>Transformation</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {active.entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-xs">{entry.externalAttribute}</TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">{entry.jsonPath}</TableCell>
                      <TableCell>
                        <Select
                          items={{ "": "Unmapped", ...Object.fromEntries(industryFields.map((f) => [f.key, f.label])) }}
                          value={entry.mappedField ?? ""}
                          onValueChange={(v) => updateEntry(entry.id, { mappedField: v ? (v as string) : undefined })}
                        >
                          <SelectTrigger size="sm" className="h-8 w-40"><SelectValue placeholder="Unmapped" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Unmapped</SelectItem>
                            {industryFields.map((f) => (
                              <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={entry.dataType} onValueChange={(v) => updateEntry(entry.id, { dataType: (v as FieldDataType) ?? "string" })}>
                          <SelectTrigger size="sm" className="h-8 w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Checkbox checked={entry.required} onCheckedChange={(v) => updateEntry(entry.id, { required: !!v })} />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={entry.transformationRule ?? ""}
                          onChange={(e) => updateEntry(entry.id, { transformationRule: e.target.value || undefined })}
                          placeholder="e.g. uppercase"
                          className="h-8 w-28 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={entry.defaultValue ?? ""}
                          onChange={(e) => updateEntry(entry.id, { defaultValue: e.target.value || undefined })}
                          className="h-8 w-24 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={entry.status === "Mapped" ? "default" : "secondary"} className="text-[10px]">
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={() => removeEntry(entry.id)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {active.entries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="py-6 text-center text-xs text-muted-foreground">
                        No attributes yet — paste a sample payload above and click Detect Attributes.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              {selected && !draft && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-destructive hover:text-destructive"
                  onClick={() => setPendingDelete(selected)}
                >
                  <Trash2 className="size-3.5" /> Delete Mapping
                </Button>
              )}
              {draft && (
                <Button size="sm" className="ml-auto gap-1.5" onClick={save}>
                  <Save className="size-3.5" /> Save Mapping
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{pendingDelete?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>This mapping set will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
