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
  KeyRound,
  Sliders,
  LayoutTemplate,
  Compass,
  CheckSquare,
  BookOpen,
  Plug,
  Package,
  Link2,
  Workflow,
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
// RuleGroupsManager import removed
import { RuleTemplatesManager } from "@/components/studio/rule-templates-manager";
// PriorityConfigManager import removed
import { ProductManager } from "@/components/studio/product-manager";
import { ProductRuleMappingManager } from "@/components/studio/product-rule-mapping-manager";
import { DashboardManagementManager } from "@/components/studio/dashboard-management-manager";
import { ListManager } from "@/components/studio/list-manager";
import { RolesManager } from "@/components/studio/roles-manager";
import { UserManager } from "@/components/studio/user-manager";
import { NotifyXManager } from "@/components/studio/notify-x-manager";

type SectionId =
  | "fields"
  | "entities"
  | "json-mapping"
  | "categories"
  | "rule-templates"
  | "products"
  | "product-rule-mapping"
  | "dashboard-management"
  | "industries"
  | "roles"
  | "users"
  | "notifyx";

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
      { id: "industries", label: "Domains", icon: Building2 },
      { id: "products", label: "Product Master", icon: Package },
      { id: "product-rule-mapping", label: "Product-Rule Mapping", icon: Link2 },
      { id: "categories", label: "Rule Categories", icon: Tag },
      { id: "rule-templates", label: "Rule Templates", icon: LayoutTemplate },
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
      { id: "roles", label: "Roles", icon: KeyRound },
      { id: "users", label: "User Management", icon: Users },
    ],
  },
  {
    label: "Automation",
    items: [
      { id: "notifyx", label: "NotifyX", icon: Workflow },
    ],
  },
];

const ROADMAP = [
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
  "rule-templates": "Reusable starting shapes for Rule Builder's condition and action editors — pre-fill a rule, then edit freely.",
  products: "Configurable product/scheme master (Home Loan, Auto Loan, ...) — a client can offer many. Rules stay standalone; see Product-Rule Mapping for which rules apply to each.",
  "product-rule-mapping": "Map each product to the rules that should execute for it — many-to-many. This is what /api/decision uses to identify and run only the rules mapped to the request's product.",
  "dashboard-management": "Per-role landing page and default dashboard widgets — BRD §5.3's Persona-to-Module Mapping, made configurable.",
  industries: "Every business domain/vertical the platform supports.",
  roles: "Reusable capability templates several users can share — who can do what, enforced both in the UI and at the data layer.",
  users: "Every named person on the roster — their Role, System Permissions, and which Rule Categories they're authorized to approve under Maker-Checker.",
  notifyx: "Automate reminders, escalations, and notifications with trigger -> condition -> action workflows.",
};

export default function SettingsPage() {
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const canManageConfig = useHasCapability("config.manage");
  // owners hooks removed for settings page navigation removal
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
          <p className="text-sm text-muted-foreground">
            No-code configuration layer — every industry, field, mapping, category and rule-governance setting used
            across the platform lives here.
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <ScrollArea className="w-64 shrink-0 border-r">
          <nav className="space-y-4 p-3">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 px-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSection(item.id)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors ${
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
              <p className="mb-1.5 px-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Roadmap</p>
              <div className="space-y-0.5">
                {ROADMAP.map((u) => (
                  <div key={u.label} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground/50">
                    <u.icon className="size-3.5 shrink-0" />
                    <span className="truncate">{u.label}</span>
                    <Badge variant="secondary" className="ml-auto shrink-0 text-sm opacity-70">Planned</Badge>
                  </div>
                ))}
              </div>
            </div>
          </nav>
        </ScrollArea>

        <ScrollArea className="min-h-0 min-w-0 flex-1">
          <div className="mx-auto max-w-350 space-y-3 px-5 py-5 sm:px-6">
            <div>
              <h2 className="text-sm font-semibold">{[...NAV_GROUPS.flatMap((g) => g.items)].find((i) => i.id === section)?.label}</h2>
              <p className="text-sm text-muted-foreground">{SECTION_DESCRIPTIONS[section]}</p>
            </div>

            {section === "fields" && <FieldCatalogManager />}
            {section === "entities" && <EntityCatalogManager />}
            {section === "json-mapping" && <JsonMappingManager />}
            {section === "categories" && <RuleCategoryManager />}
            {/* RuleGroupsManager render block removed */}
            {section === "rule-templates" && <RuleTemplatesManager />}
            {/* PriorityConfigManager render block removed */}
            {section === "products" && <ProductManager />}
            {section === "product-rule-mapping" && <ProductRuleMappingManager />}
            {/* decision-response config manager removed */}
            {section === "dashboard-management" && <DashboardManagementManager />}
            {section === "industries" && <IndustriesManager />}
            {section === "roles" && <RolesManager />}
            {section === "users" && <UserManager />}
            {section === "notifyx" && <NotifyXManager />}

            {section === "fields" && (
              <p className="pt-2 text-sm text-muted-foreground">
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
