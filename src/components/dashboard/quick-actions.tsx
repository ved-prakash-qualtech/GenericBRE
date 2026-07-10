"use client";

import { useRouter } from "next/navigation";
import { Plus, Library, Grid3x3, FlaskConical, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface Action {
  label: string;
  desc: string;
  icon: LucideIcon;
  href: string;
  accent: string;
}

const ACTIONS: Action[] = [
  { label: "Create Rule", desc: "Start a new no-code rule", icon: Plus, href: "/rule-builder", accent: "bg-primary text-primary-foreground" },
  { label: "Open Repository", desc: "Browse the full catalogue", icon: Library, href: "/repository", accent: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { label: "Decision Matrix", desc: "Edit pricing & threshold slabs", icon: Grid3x3, href: "/matrix", accent: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  { label: "Run Simulator", desc: "Test a live customer scenario", icon: FlaskConical, href: "/simulator", accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
];

export function QuickActions() {
  const router = useRouter();
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {ACTIONS.map((a, i) => (
        <motion.button
          key={a.label}
          onClick={() => router.push(a.href)}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.04 }}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.98 }}
          className="flex flex-col items-start gap-2 rounded-xl border bg-card p-3.5 text-left transition-shadow hover:shadow-md"
        >
          <span className={`flex size-8 items-center justify-center rounded-lg ${a.accent}`}>
            <a.icon className="size-4" />
          </span>
          <div>
            <p className="text-[13px] font-semibold leading-tight">{a.label}</p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{a.desc}</p>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
