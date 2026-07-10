"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useAppStore } from "@/lib/store";
import { PanelHeader } from "./recent-panels";
import { RuleStatus } from "@/lib/types";
import { colorForIndustry } from "@/lib/industries";

const STATUS_COLORS: Record<RuleStatus, string> = {
  Active: "var(--chart-1)",
  Draft: "var(--chart-4)",
  Testing: "var(--chart-3)",
  Inactive: "var(--chart-2)",
  Archived: "var(--chart-5)",
};

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <span className="font-medium">{payload[0].name}</span>: {payload[0].value}
    </div>
  );
}

export function DomainDistributionChart() {
  const rules = useAppStore((s) => s.rules);
  const industries = useAppStore((s) => s.industries);
  const router = useRouter();

  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rules) counts[r.domain] = (counts[r.domain] ?? 0) + 1;
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [rules]);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Domain Distribution" />
      <div className="flex flex-1 items-center gap-4 p-3">
        <div className="h-36 w-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={38}
                outerRadius={62}
                paddingAngle={3}
                cursor="pointer"
                onClick={(d) => router.push(`/repository?domain=${d.name}`)}
              >
                {data.map((d) => (
                  <Cell key={d.name} fill={colorForIndustry(industries, d.name)} stroke="var(--card)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          {data.map((d) => (
            <button
              key={d.name}
              onClick={() => router.push(`/repository?domain=${d.name}`)}
              className="flex items-center justify-between rounded-md px-1.5 py-1 text-left hover:bg-accent/60 transition-colors"
            >
              <span className="flex items-center gap-2 text-xs">
                <span className="size-2 rounded-full" style={{ backgroundColor: colorForIndustry(industries, d.name) }} />
                {d.name}
              </span>
              <span className="text-xs font-semibold tabular-nums">{d.value}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RuleStatusChart() {
  const rules = useAppStore((s) => s.rules);
  const router = useRouter();

  const data = useMemo(() => {
    const order: RuleStatus[] = ["Active", "Testing", "Draft", "Inactive", "Archived"];
    const counts: Record<string, number> = {};
    for (const r of rules) counts[r.status] = (counts[r.status] ?? 0) + 1;
    return order.map((name) => ({ name, value: counts[name] ?? 0 }));
  }, [rules]);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Rule Status Breakdown" />
      <div className="flex-1 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
            <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" width={28} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(d) => router.push(`/repository?status=${d.name}`)}>
              {data.map((d) => (
                <Cell key={d.name} fill={STATUS_COLORS[d.name as RuleStatus]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
