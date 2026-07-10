import { Settings2, ShieldCheck, Users, Plug, Database } from "lucide-react";

const UPCOMING = [
  { icon: Users, label: "Role-Based Access Control", desc: "Fine-grained permissions per persona" },
  { icon: ShieldCheck, label: "Enterprise SSO / OAuth2", desc: "Identity provider integration" },
  { icon: Database, label: "Rule Versioning & Audit History", desc: "Full lineage across environments" },
  { icon: Plug, label: "Core System Integrations", desc: "Banking, insurance & CRM connectors" },
];

export default function SettingsPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border bg-muted/40">
        <Settings2 className="size-6 text-muted-foreground" />
      </div>
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Enterprise Settings</h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Infrastructure and governance controls are intentionally disabled in this Phase&nbsp;1 prototype
          to keep focus on the core rule-management experience.
        </p>
      </div>
      <div className="grid w-full max-w-lg grid-cols-1 gap-2.5 sm:grid-cols-2">
        {UPCOMING.map((u) => (
          <div key={u.label} className="flex items-start gap-2.5 rounded-xl border bg-card p-3 text-left opacity-60">
            <u.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs font-semibold">{u.label}</p>
              <p className="text-[11px] text-muted-foreground">{u.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground/70">Planned for Phase 2 — Functional MVP</p>
    </div>
  );
}
