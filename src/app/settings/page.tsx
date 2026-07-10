"use client";

import { Settings2, ShieldCheck, Database, Plug } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IndustriesManager } from "@/components/studio/industries-manager";
import { FieldCatalogManager } from "@/components/studio/field-catalog-manager";
import { ListManager } from "@/components/studio/list-manager";
import { RolesManager } from "@/components/studio/roles-manager";

const ROADMAP = [
  { icon: ShieldCheck, label: "Enterprise SSO / OAuth2", desc: "Identity provider integration" },
  { icon: Database, label: "Rule Versioning & Audit History", desc: "Full lineage across environments" },
  { icon: Plug, label: "Core System Integrations", desc: "Banking, insurance & CRM connectors" },
];

export default function SettingsPage() {
  const categories = useAppStore((s) => s.categories);
  const owners = useAppStore((s) => s.owners);
  const addCategory = useAppStore((s) => s.addCategory);
  const deleteCategory = useAppStore((s) => s.deleteCategory);
  const addOwner = useAppStore((s) => s.addOwner);
  const deleteOwner = useAppStore((s) => s.deleteOwner);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b bg-card/40 px-5 py-3.5 sm:px-6">
        <span className="flex size-9 items-center justify-center rounded-xl border bg-muted/40">
          <Settings2 className="size-4.5 text-muted-foreground" />
        </span>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Configuration Studio</h1>
          <p className="text-xs text-muted-foreground">
            No-code configuration layer — every industry, business field, category and owner used across the platform lives here.
          </p>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto max-w-350 space-y-5 px-5 py-5 sm:px-6">
          <Tabs defaultValue="industries">
            <TabsList>
              <TabsTrigger value="industries">Industries</TabsTrigger>
              <TabsTrigger value="fields">Field Catalog</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="owners">Owners</TabsTrigger>
              <TabsTrigger value="roles">Roles</TabsTrigger>
            </TabsList>
            <TabsContent value="industries" className="pt-4">
              <IndustriesManager />
            </TabsContent>
            <TabsContent value="fields" className="pt-4">
              <FieldCatalogManager />
            </TabsContent>
            <TabsContent value="categories" className="pt-4">
              <ListManager
                label="Category"
                description="Rule categories available in the Rule Builder and Repository filters (e.g. Eligibility, Pricing, Compliance)."
                items={categories}
                onAdd={addCategory}
                onDelete={deleteCategory}
              />
            </TabsContent>
            <TabsContent value="owners" className="pt-4">
              <ListManager
                label="Owner"
                description="Owning teams/departments assignable to a rule."
                items={owners}
                onAdd={addOwner}
                onDelete={deleteOwner}
              />
            </TabsContent>
            <TabsContent value="roles" className="pt-4">
              <RolesManager />
            </TabsContent>
          </Tabs>

          <div>
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Roadmap</h2>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {ROADMAP.map((u) => (
                <div key={u.label} className="flex items-start gap-2.5 rounded-xl border bg-card p-3 text-left opacity-60">
                  <u.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-semibold">{u.label}</p>
                    <p className="text-[11px] text-muted-foreground">{u.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
