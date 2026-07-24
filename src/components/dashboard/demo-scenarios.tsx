"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { PanelHeader } from "./recent-panels";
import { useAppStore } from "@/lib/store";
import { iconForIndustry } from "@/lib/industries";

// Cycles through a fixed set of accent gradients by index so any number of
// configured industries gets a distinct look without a per-industry hardcode.
const ACCENTS = [
  "from-blue-500/15 to-blue-500/0 text-blue-600 dark:text-blue-400",
  "from-amber-500/15 to-amber-500/0 text-amber-600 dark:text-amber-400",
  "from-emerald-500/15 to-emerald-500/0 text-emerald-600 dark:text-emerald-400",
  "from-violet-500/15 to-violet-500/0 text-violet-600 dark:text-violet-400",
  "from-rose-500/15 to-rose-500/0 text-rose-600 dark:text-rose-400",
];

export function DemoScenariosPanel() {
  const router = useRouter();
  const allIndustries = useAppStore((s) => s.industries);
  const domainFilter = useAppStore((s) => s.globalFilters.domains);
  const industries = domainFilter.length ? allIndustries.filter((i) => domainFilter.includes(i.id)) : allIndustries;

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Preconfigured Demo Scenarios" />
      <div className="grid flex-1 grid-cols-1 gap-2 overflow-y-auto p-2.5 sm:grid-cols-3">
        {industries.map((ind, i) => {
          const Icon = iconForIndustry(ind.icon);
          return (
            <motion.button
              key={ind.id}
              onClick={() => router.push(`/simulator?domain=${ind.id}&preset=happy`)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -2 }}
              className={`group relative overflow-hidden rounded-lg border bg-gradient-to-br p-3 text-left ${ACCENTS[i % ACCENTS.length]}`}
            >
              <Icon className="size-5" />
              <p className="mt-2 text-sm font-semibold text-foreground">{ind.name}</p>
              <p className="mt-1 text-sm leading-snug text-muted-foreground">
                {ind.description ?? "Run a live simulation against this industry's configured rules."}
              </p>
              <span className="mt-2 flex items-center gap-1 text-sm font-medium opacity-0 transition-opacity group-hover:opacity-100">
                Launch simulator <ArrowRight className="size-3" />
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
