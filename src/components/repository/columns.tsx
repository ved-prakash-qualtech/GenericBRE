"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Copy, Eye, FileEdit, Archive, Ban, PlayCircle, MoreHorizontal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { BusinessRule } from "@/lib/types";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function SortHeader({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 hover:text-foreground transition-colors">
      {label}
      <ArrowUpDown className="size-3" />
    </button>
  );
}

export interface RepositoryActions {
  onView: (r: BusinessRule) => void;
  onEdit: (r: BusinessRule) => void;
  onClone: (r: BusinessRule) => void;
  onDisable: (r: BusinessRule) => void;
  onArchive: (r: BusinessRule) => void;
  onPublish: (r: BusinessRule) => void;
}

export function buildColumns(actions: RepositoryActions): ColumnDef<BusinessRule>[] {
  return [
    {
      accessorKey: "id",
      header: ({ column }) => <SortHeader label="Rule ID" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />,
      cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.id}</span>,
      size: 90,
    },
    {
      accessorKey: "name",
      header: ({ column }) => <SortHeader label="Rule Name" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />,
      cell: ({ row }) => (
        <button onClick={() => actions.onEdit(row.original)} className="text-left font-medium hover:text-primary hover:underline">
          {row.original.name}
        </button>
      ),
      size: 260,
    },
    {
      accessorKey: "domain",
      header: "Domain",
      size: 90,
    },
    {
      accessorKey: "category",
      header: "Category",
      size: 120,
    },
    {
      accessorKey: "priority",
      header: ({ column }) => <SortHeader label="Priority" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />,
      cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
      size: 100,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
      size: 100,
    },
    {
      accessorKey: "owner",
      header: "Owner",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.owner}</span>,
      size: 170,
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => <SortHeader label="Updated" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(row.original.updatedAt), { addSuffix: true })}
        </span>
      ),
      size: 120,
    },
    {
      id: "actions",
      header: "",
      size: 50,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onSelect={() => actions.onView(r)}>
                <Eye className="size-3.5" /> View
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => actions.onEdit(r)}>
                <FileEdit className="size-3.5" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => actions.onClone(r)}>
                <Copy className="size-3.5" /> Clone
              </DropdownMenuItem>
              {r.status !== "Active" && (
                <DropdownMenuItem onSelect={() => actions.onPublish(r)}>
                  <PlayCircle className="size-3.5" /> Publish
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {r.status !== "Inactive" && (
                <DropdownMenuItem onSelect={() => actions.onDisable(r)}>
                  <Ban className="size-3.5" /> Disable
                </DropdownMenuItem>
              )}
              <DropdownMenuItem variant="destructive" onSelect={() => actions.onArchive(r)}>
                <Archive className="size-3.5" /> Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
