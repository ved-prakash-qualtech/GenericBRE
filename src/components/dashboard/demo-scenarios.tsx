"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CreditCard, Landmark, ShieldPlus, ArrowRight } from "lucide-react";
import { PanelHeader } from "./recent-panels";

const SCENARIOS = [
  {
    title: "Digital Lending Eligibility",
    desc: "Bureau score, income & DTI checks with instant interest rate pricing.",
    icon: CreditCard,
    href: "/simulator?domain=Lending&preset=happy",
    accent: "from-blue-500/15 to-blue-500/0 text-blue-600 dark:text-blue-400",
  },
  {
    title: "NBFC Gold Loan Haircut",
    desc: "Collateral valuation, purity checks & LTV-based haircut calculation.",
    icon: Landmark,
    href: "/simulator?domain=NBFC&preset=happy",
    accent: "from-amber-500/15 to-amber-500/0 text-amber-600 dark:text-amber-400",
  },
  {
    title: "Insurance Premium Loading",
    desc: "Age & smoker-based underwriting with automatic risk loading.",
    icon: ShieldPlus,
    href: "/simulator?domain=Insurance&preset=happy",
    accent: "from-emerald-500/15 to-emerald-500/0 text-emerald-600 dark:text-emerald-400",
  },
];

export function DemoScenariosPanel() {
  const router = useRouter();
  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Preconfigured Demo Scenarios" />
      <div className="grid flex-1 grid-cols-1 gap-2.5 p-3 sm:grid-cols-3">
        {SCENARIOS.map((s, i) => (
          <motion.button
            key={s.title}
            onClick={() => router.push(s.href)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -2 }}
            className={`group relative overflow-hidden rounded-lg border bg-gradient-to-br p-3.5 text-left ${s.accent}`}
          >
            <s.icon className="size-5" />
            <p className="mt-2.5 text-[13px] font-semibold text-foreground">{s.title}</p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{s.desc}</p>
            <span className="mt-2 flex items-center gap-1 text-[11px] font-medium opacity-0 transition-opacity group-hover:opacity-100">
              Launch simulator <ArrowRight className="size-3" />
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
