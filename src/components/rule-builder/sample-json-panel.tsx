"use client";

import { useState } from "react";
import { Copy, Download, FileJson, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { downloadJson } from "@/lib/csv";
import { cn } from "@/lib/utils";

// Read-only by default — regenerated live by the caller via useMemo whenever
// the rule's conditions/actions or the Rule Group's other rules change (see
// src/lib/sample-json.ts's buildSampleRequestJson). First use of
// navigator.clipboard in this app.
//
// Pass `editable` + `value`/`onChange` (Simulator's use) to turn this into a
// user-editable JSON textarea instead — same panel, same Copy/Download
// affordances, just a controlled `<Textarea>` instead of a `<pre>`. Rule
// Builder's existing read-only call site (passing only `data`) is unaffected.
interface SampleJsonPanelProps {
  data?: Record<string, unknown>;
  editable?: boolean;
  value?: string;
  onChange?: (text: string) => void;
}

export function SampleJsonPanel({ data, editable = false, value, onChange }: SampleJsonPanelProps) {
  const [copied, setCopied] = useState(false);
  const json = editable ? value ?? "" : JSON.stringify(data ?? {}, null, 2);
  const isEmpty = editable ? json.trim().length === 0 : Object.keys(data ?? {}).length === 0;

  let parseError = false;
  if (editable && json.trim().length > 0) {
    try {
      JSON.parse(json);
    } catch {
      parseError = true;
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      toast.success("Sample JSON copied to clipboard.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy", { description: "Your browser may have blocked clipboard access." });
    }
  };

  const download = () => {
    if (editable) {
      try {
        downloadJson("sample_request", JSON.parse(json));
      } catch {
        toast.error("Couldn't download — fix the invalid JSON first.");
      }
      return;
    }
    downloadJson("sample_request", data ?? {});
  };

  return (
    <div className="rounded-xl border bg-card p-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <FileJson className="size-3.5" /> Sample Request JSON
        </p>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" onClick={copy} disabled={isEmpty} title="Copy">
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={download} disabled={isEmpty || parseError} title="Download">
            <Download className="size-3.5" />
          </Button>
        </div>
      </div>
      {isEmpty && !editable ? (
        <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
          Add conditions or actions referencing business fields to generate a sample payload.
        </p>
      ) : editable ? (
        <>
          <Textarea
            value={json}
            onChange={(e) => onChange?.(e.target.value)}
            spellCheck={false}
            className={cn(
              "max-h-80 min-h-40 overflow-auto font-mono text-sm leading-relaxed",
              parseError && "border-destructive"
            )}
          />
          {parseError && <p className="mt-1.5 text-sm text-destructive">Invalid JSON — fix before running the simulation.</p>}
        </>
      ) : (
        <pre className="max-h-64 overflow-auto rounded-lg bg-muted/40 p-3 text-sm leading-relaxed">{json}</pre>
      )}
      {!editable && (
        <p className="mt-2 text-sm text-muted-foreground/70">Auto-regenerates from every field this rule references.</p>
      )}
    </div>
  );
}
