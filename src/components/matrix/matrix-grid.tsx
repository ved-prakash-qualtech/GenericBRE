"use client";

import { useMemo, useRef } from "react";
import { toast } from "sonner";
import { Plus, Copy, Trash2, Download, Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import { DecisionMatrix, MatrixRow } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { validateMatrix, MatrixIssue } from "@/lib/matrix-lookup";
import { downloadCsv } from "@/lib/csv";
import { EditableCell } from "./editable-cell";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

let rowSeq = 5000;

export function MatrixGrid({ matrix }: { matrix: DecisionMatrix }) {
  const updateMatrixRow = useAppStore((s) => s.updateMatrixRow);
  const addMatrixRow = useAppStore((s) => s.addMatrixRow);
  const deleteMatrixRow = useAppStore((s) => s.deleteMatrixRow);
  const duplicateMatrixRow = useAppStore((s) => s.duplicateMatrixRow);
  const updateMatrixRows = useAppStore((s) => s.updateMatrixRows);
  const logAudit = useAppStore((s) => s.logAudit);
  const currentUser = useAppStore((s) => s.currentUser);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const issues = useMemo(() => validateMatrix(matrix), [matrix]);
  const issueRowIds = useMemo(() => new Set(issues.flatMap((i) => i.rowIds)), [issues]);

  const handleCommit = (row: MatrixRow, key: string, value: string | number) => {
    updateMatrixRow(matrix.id, row.id, { ...row.values, [key]: value });
  };

  const handleAddRow = () => {
    rowSeq += 1;
    const blankValues = Object.fromEntries(
      matrix.columns.map((c) => [c.key, c.type === "select" ? c.options?.[0] ?? "" : 0])
    );
    addMatrixRow(matrix.id, { id: `R${rowSeq}`, values: blankValues });
    toast.success("Row added", { description: "Fill in the new slab values." });
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) return;
      const headers = lines[0].split(",").map((h) => h.trim());
      const rows: MatrixRow[] = lines.slice(1).map((line, i) => {
        const cells = line.split(",");
        const values: MatrixRow["values"] = {};
        headers.forEach((h, idx) => {
          const col = matrix.columns.find((c) => c.label === h || c.key === h);
          if (col) {
            const raw = cells[idx]?.trim() ?? "";
            values[col.key] = col.type === "text" || col.type === "select" ? raw : Number(raw);
          }
        });
        return { id: `IMP${Date.now()}${i}`, values };
      });
      updateMatrixRows(matrix.id, rows);
      logAudit({ user: currentUser.name, action: "Imported Matrix", entity: "DecisionMatrix", entityId: matrix.id, details: `Imported ${rows.length} rows from CSV.` });
      toast.success(`Imported ${rows.length} rows`, { description: matrix.name });
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <div className="mr-auto">
          <p className="text-sm font-semibold">{matrix.name}</p>
          <p className="text-xs text-muted-foreground">{matrix.description}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleAddRow}>
          <Plus className="size-3.5" /> Add Row
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
          <Upload className="size-3.5" /> Import
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImport(file);
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() =>
            downloadCsv(
              matrix.id,
              matrix.rows.map((r) => Object.fromEntries(matrix.columns.map((c) => [c.label, r.values[c.key]])))
            )
          }
        >
          <Download className="size-3.5" /> Export
        </Button>
      </div>

      {issues.length > 0 ? (
        <div className="flex flex-col gap-1 border-b bg-destructive/5 px-4 py-2.5">
          {issues.map((issue: MatrixIssue, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-destructive">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span className="font-semibold capitalize">{issue.type}:</span> {issue.message}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 border-b bg-emerald-500/5 px-4 py-2 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5" /> No overlaps, duplicates, or gaps detected.
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow className="hover:bg-transparent">
              {matrix.columns.map((c) => (
                <TableHead key={c.key} className="text-xs font-semibold text-muted-foreground">{c.label}</TableHead>
              ))}
              <TableHead className="w-20 text-xs font-semibold text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrix.rows.map((row) => (
              <TableRow key={row.id} className={cn(issueRowIds.has(row.id) && "bg-destructive/[0.04]")}>
                {matrix.columns.map((c) => (
                  <TableCell key={c.key} className="p-1">
                    <EditableCell
                      column={c}
                      value={row.values[c.key]}
                      onCommit={(v) => handleCommit(row, c.key, v)}
                      invalid={issueRowIds.has(row.id)}
                    />
                  </TableCell>
                ))}
                <TableCell className="p-1">
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="icon-sm" onClick={() => duplicateMatrixRow(matrix.id, row.id)}>
                      <Copy className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMatrixRow(matrix.id, row.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
