"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FileStack, CheckCircle2, FileEdit, FlaskConical, Layers } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface Kpi {
  label: string;
  value: number;
  icon: React.ElementType;
  accent: string;
  href: string;
  suffix?: string;
}

export function KpiCards() {
  const rules = useAppStore((s) => s.rules);
  const simulations = useAppStore((s) => s.simulations);
  const router = useRouter();

  const total = rules.length;
  const active = rules.filter((r) => r.status === "Active").length;
  const draft = rules.filter((r) => r.status === "Draft").length;
  const disabled = rules.filter((r) => r.status === "Inactive" || r.status === "Archived").length;
  const categories = new Set(rules.map((r) => r.category)).size;

  const kpis: Kpi[] = [
    { label: "Total Rules", value: total, icon: FileStack, accent: "text-primary bg-primary/10", href: "/repository" },
    { label: "Active Rules", value: active, icon: CheckCircle2, accent: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400", href: "/repository?status=Active" },
    { label: "Draft Rules", value: draft, icon: FileEdit, accent: "text-amber-600 bg-amber-500/10 dark:text-amber-400", href: "/repository?status=Draft" },
    { label: "Simulations Run", value: simulations.length + 256, icon: FlaskConical, accent: "text-violet-600 bg-violet-500/10 dark:text-violet-400", href: "/simulator" },
    { label: "Business Categories", value: categories, icon: Layers, accent: "text-blue-600 bg-blue-500/10 dark:text-blue-400", href: "/repository", suffix: disabled ? `· ${disabled} disabled` : undefined },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {kpis.map((k, i) => (
        <motion.button
          key={k.label}
          onClick={() => router.push(k.href)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.25 }}
          whileHover={{ y: -2 }}
          className="group flex flex-col gap-2.5 rounded-xl border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className={cn("flex size-8 items-center justify-center rounded-lg", k.accent)}>
              <k.icon className="size-4" />
            </span>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums leading-none">{k.value}</p>
            <p className="mt-1.5 text-xs font-medium text-muted-foreground">{k.label}</p>
            {k.suffix && <p className="text-[10px] text-muted-foreground/70">{k.suffix}</p>}
          </div>
        </motion.button>
      ))}
    </div>
  );
}
