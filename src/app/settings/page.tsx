"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Settings2,
  ShieldAlert,
  Database,
  Boxes,
  FileJson,
  Tag,
  Layers,
  ListOrdered,
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  GitBranch,
  LayoutTemplate,
  Compass,
  CheckSquare,
  BookOpen,
  Plug,
  type LucideIcon,
} from "lucide-react";
import { useAppStore, useHasCapability } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IndustriesManager } from "@/components/studio/industries-manager";
import { FieldCatalogManager } from "@/components/studio/field-catalog-manager";
import { EntityCatalogManager } from "@/components/studio/entity-catalog-manager";
import { JsonMappingManager } from "@/components/studio/json-mapping-manager";
import { RuleCategoryManager } from "@/components/studio/rule-category-manager";
import { RuleGroupsManager } from "@/components/studio/rule-groups-manager";
import { PriorityConfigManager } from "@/components/studio/priority-config-manager";
import { DashboardManagementManager } from "@/components/studio/dashboard-management-manager";
import { ListManager } from "@/components/studio/list-manager";
import { RolesManager } from "@/components/studio/roles-manager";

type SectionId =
  | "fields"
  | "entities"
  | "json-mapping"
  | "categories"
  | "rule-groups"
  | "priority"
  | "dashboard-management"
  | "industries"
  | "owners"
  | "roles";

interface NavItem {
  id: SectionId;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Data & Schema",
    items: [
      { id: "fields", label: "Field Catalog", icon: Database },
      { id: "entities", label: "Entity Catalog", icon: Boxes },
      { id: "json-mapping", label: "JSON Mapping", icon: FileJson },
    ],
  },
  {
    label: "Rule Governance",
    items: [
      { id: "categories", label: "Rule Categories", icon: Tag },
      { id: "rule-groups", label: "Rule Groups", icon: Layers },
      { id: "priority", label: "Priority Configuration", icon: ListOrdered },
    ],
  },
  {
    label: "Experience",
    items: [
      { id: "dashboard-management", label: "Dashboard Management", icon: LayoutDashboard },
    ],
  },
  {
    label: "Access",
    items: [
      { id: "industries", label: "Industries", icon: Building2 },
      { id: "owners", label: "Owners", icon: Users },
      { id: "roles", label: "Roles", icon: ShieldCheck },
    ],
  },
];

const ROADMAP = [
  { icon: GitBranch, label: "Execution Sequence", desc: "Visual workflow: parallel groups, conditional branching, dependencies" },
  { icon: LayoutTemplate, label: "Rule Templates Manager", desc: "Dedicated screen — templates are usable today via Rule Builder" },
  { icon: Compass, label: "Metadata Explorer — Dependency Graph", desc: "Visual impact analysis; the overview list already exists" },
  { icon: CheckSquare, label: "Validation Rules", desc: "Cross-field validation independent of business rules" },
  { icon: BookOpen, label: "Lookup Manager", desc: "Shared reference/lookup tables beyond enum field options" },
  { icon: Plug, label: "API Mapping (OpenAPI Import)", desc: "Auto-generate a JSON Mapping set from a Swagger/OpenAPI spec" },
];

const SECTION_DESCRIPTIONS: Record<SectionId, string> = {
  fields: "The business field vocabulary that drives every condition dropdown in Rule Builder and every dynamic input in the Simulator.",
  entities: "Business entities (Applicant, Loan Account, Collateral...) that Field Catalog entries attach to.",
  "json-mapping": "Map incoming/outgoing API JSON attributes to internal BRE fields — the foundation for integrating a real source system.",
  categories: "Rule categories available in the Rule Builder and Repository filters.",
  "rule-groups": "Named, reusable rule collections — purely organizational, independent of Category.",
  priority: "How the engine resolves multiple qualifying rules for the same case.",
  "dashboard-management": "Per-role landing page and default dashboard widgets — BRD §5.3's Persona-to-Module Mapping, made configurable.",
  industries: "Every industry/vertical the platform supports.",
  owners: "Owning teams/departments assignable to a rule.",
  roles: "Who can do what — capabilities are assigned per role, enforced both in the UI and at the data layer.",
};

export default function SettingsPage() {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const canManageConfig = useHasCapability("config.manage");
  const owners = useAppStore((s) => s.owners);
  const addOwner = useAppStore((s) => s.addOwner);
  const deleteOwner = useAppStore((s) => s.deleteOwner);
  const [section, setSection] = useState<SectionId>("fields");

  // A capability check, not just a hidden nav item — someone can still land
  // here directly via the URL without going through a nav that would have
  // hidden Settings for them.
  if (!canManageConfig) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <ShieldAlert className="size-10 text-muted-foreground/40" />
        <h1 className="text-base font-semibold">Access restricted</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {currentUser.name}&apos;s role doesn&apos;t include permission to manage Configuration Studio.
        </p>
        <Button variant="outline" size="sm" onClick={() => router.push("/")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b bg-card/40 px-5 py-3.5 sm:px-6">
        <span className="flex size-9 items-center justify-center rounded-xl border bg-muted/40">
          <Settings2 className="size-4.5 text-muted-foreground" />
        </span>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Configuration Studio</h1>
          <p className="text-xs text-muted-foreground">
            No-code configuration layer — every industry, field, mapping, category and rule-governance setting used
            across the platform lives here.
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <ScrollArea className="w-56 shrink-0 border-r">
          <nav className="space-y-4 p-3">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSection(item.id)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                        section === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <item.icon className="size-3.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Roadmap</p>
              <div className="space-y-0.5">
                {ROADMAP.map((u) => (
                  <div key={u.label} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-muted-foreground/50">
                    <u.icon className="size-3.5 shrink-0" />
                    <span className="truncate">{u.label}</span>
                    <Badge variant="secondary" className="ml-auto shrink-0 text-[9px] opacity-70">Planned</Badge>
                  </div>
                ))}
              </div>
            </div>
          </nav>
        </ScrollArea>

        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto max-w-350 space-y-3 px-5 py-5 sm:px-6">
            <div>
              <h2 className="text-sm font-semibold">{[...NAV_GROUPS.flatMap((g) => g.items)].find((i) => i.id === section)?.label}</h2>
              <p className="text-xs text-muted-foreground">{SECTION_DESCRIPTIONS[section]}</p>
            </div>

            {section === "fields" && <FieldCatalogManager />}
            {section === "entities" && <EntityCatalogManager />}
            {section === "json-mapping" && <JsonMappingManager />}
            {section === "categories" && <RuleCategoryManager />}
            {section === "rule-groups" && <RuleGroupsManager />}
            {section === "priority" && <PriorityConfigManager />}
            {section === "dashboard-management" && <DashboardManagementManager />}
            {section === "industries" && <IndustriesManager />}
            {section === "owners" && (
              <ListManager label="Owner" description="" items={owners} onAdd={addOwner} onDelete={deleteOwner} />
            )}
            {section === "roles" && <RolesManager />}

            {section === "fields" && (
              <p className="pt-2 text-[11px] text-muted-foreground">
                Looking for the full metadata overview across every module? See the{" "}
                <Link href="/metadata-explorer" className="text-primary hover:underline">Metadata Explorer</Link>.
              </p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
