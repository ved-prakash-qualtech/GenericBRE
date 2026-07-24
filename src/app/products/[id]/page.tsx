"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Rocket } from "lucide-react";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useAppStore, useHasCapability } from "@/lib/store";
import { getMappedRules } from "@/lib/product-rule-engine";
import { buildSampleRequestJson } from "@/lib/sample-json";
import { collectFieldKeys } from "@/lib/condition-tree";
import { Stepper, StepperStep } from "@/components/ui/stepper";
import { MappedRulesReorder, MappedRulesChecklist } from "@/components/studio/product-rule-mapping-manager";
import { SampleJsonPanel } from "@/components/rule-builder/sample-json-panel";
import { RunSimulatorPanel } from "@/components/simulator/run-simulator-panel";
import { SimulationHistoryTab } from "@/components/products/simulation-history-tab";
import { ApiInformationTab } from "@/components/products/api-information-tab";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

const WORKSPACE_STEPS: StepperStep[] = [
  { id: "overview", label: "Create" },
  { id: "mapped-rules", label: "Map Rules" },
  { id: "sequence", label: "Sequence" },
  { id: "sample-json", label: "Sample JSON" },
  { id: "simulate", label: "Simulate" },
  { id: "publish", label: "Publish" },
  { id: "api", label: "API Ready" },
];

export default function ProductWorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = params.id;

  const products = useAppStore((s) => s.products);
  const rules = useAppStore((s) => s.rules);
  const productRuleMappings = useAppStore((s) => s.productRuleMappings);
  const ruleCategories = useAppStore((s) => s.ruleCategories);
  const industries = useAppStore((s) => s.industries);
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const simulations = useAppStore((s) => s.simulations);
  const updateProduct = useAppStore((s) => s.updateProduct);
  const publishProduct = useAppStore((s) => s.publishProduct);
  const saveProductRuleMapping = useAppStore((s) => s.saveProductRuleMapping);
  const canManage = useHasCapability("config.manage");

  const product = products.find((p) => p.id === productId);
  const [activeTab, setActiveTab] = useState(() => (searchParams.get("tab") === "simulate" ? "simulate" : "overview"));
  const [draft, setDraft] = useState(product);

  const mappedRules = useMemo(
    () => (product ? getMappedRules(product.id, rules, productRuleMappings) : []),
    [product, rules, productRuleMappings]
  );
  const productMappingRows = useMemo(
    () => productRuleMappings.filter((m) => m.productId === product?.id && m.active),
    [productRuleMappings, product?.id]
  );
  const productSims = useMemo(
    () => simulations.filter((s) => s.productId === product?.id),
    [simulations, product?.id]
  );
  const sampleJson = useMemo(
    () =>
      buildSampleRequestJson(
        fieldCatalog,
        Array.from(new Set(mappedRules.flatMap((r) => Array.from(collectFieldKeys(r.rootGroup)))))
      ),
    [fieldCatalog, mappedRules]
  );

  const sequenced = productMappingRows.length > 0 && productMappingRows.every((m) => m.order !== undefined);
  const published = product?.publishStatus === "Published";
  const completedStepIds = useMemo(() => {
    const done: string[] = ["overview"];
    if (mappedRules.length > 0) done.push("mapped-rules");
    if (sequenced) done.push("sequence");
    if (mappedRules.length > 0) done.push("sample-json");
    if (productSims.length > 0) done.push("simulate");
    if (published) {
      done.push("publish");
      done.push("api");
    }
    return done;
  }, [mappedRules.length, sequenced, productSims.length, published]);

  const canPublish = mappedRules.length > 0 && sequenced && productSims.length > 0;

  if (!product || !draft) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">Product not found.</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/products")}>
          <ArrowLeft className="size-3.5" /> Back to Products
        </Button>
      </div>
    );
  }

  const saveOverview = () => {
    if (!draft.name.trim()) {
      toast.error("Product name is required.");
      return;
    }
    const domainChanged = draft.domain !== product.domain;
    const crossDomainAfterChange = domainChanged && mappedRules.some((r) => r.domain !== draft.domain);
    updateProduct(product.id, {
      name: draft.name,
      domain: draft.domain,
      status: draft.status,
      description: draft.description,
    });
    if (crossDomainAfterChange) {
      toast.warning("Overview saved — review Map Rules.", {
        description: `Some of this product's mapped rules belong to a different domain than the new "${draft.domain}" setting. They'll still execute, but that's rarely intentional.`,
      });
    } else {
      toast.success("Overview saved.");
    }
  };

  const handlePublish = () => {
    const result = publishProduct(product.id);
    if (!result.ok) {
      toast.error("Publish blocked", { description: result.reason });
      return;
    }
    toast.success(`"${product.name}" published — now live via the Product API.`);
    setActiveTab("api");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-col gap-3 border-b bg-card/40 px-5 py-3.5 sm:px-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/products" />}>Products</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate">{product.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => router.push("/products")}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="truncate text-lg font-semibold tracking-tight">{product.name}</h1>
              <Badge variant="outline" className="h-6 shrink-0 font-mono text-sm">{product.code}</Badge>
              <Badge variant={product.status === "Active" ? "default" : "secondary"} className="h-6 shrink-0 text-sm">
                {product.status}
              </Badge>
              <Badge variant={published ? "default" : "secondary"} className="h-6 shrink-0 text-xs">
                {product.publishStatus ?? "Draft"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {industries.find((i) => i.id === product.domain)?.name ?? product.domain}
            </p>
          </div>
          {!published && (
            <Button
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={handlePublish}
              disabled={!canPublish || !canManage}
              title={!canPublish ? "Map rules, sequence them, and run a simulation before publishing" : undefined}
            >
              <Rocket className="size-3.5" /> Publish
            </Button>
          )}
        </div>
        {/* Scroll the journey stepper on narrow screens (its 7 steps don't fit
            under ~500px); restores the full-width flex spread at sm and up. */}
        <div className="overflow-x-auto">
          <Stepper
            steps={WORKSPACE_STEPS}
            currentStepId={activeTab === "history" ? "simulate" : activeTab}
            completedStepIds={completedStepIds}
            onStepClick={(id) => setActiveTab(id === "publish" ? "overview" : id)}
            className="min-w-[520px] sm:min-w-0"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)} className="flex min-h-0 flex-1 flex-col gap-0">
        {/* Horizontal-scroll wrapper so the 7-tab bar stays fully reachable on
            narrow screens instead of clipping off the right edge. */}
        <div className="mx-5 mt-3 overflow-x-auto sm:mx-6">
          <TabsList className="w-fit">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="mapped-rules">Mapped Rules</TabsTrigger>
            <TabsTrigger value="sequence">Rule Sequence</TabsTrigger>
            <TabsTrigger value="sample-json">Sample JSON</TabsTrigger>
            <TabsTrigger value="simulate">Run Simulator</TabsTrigger>
            <TabsTrigger value="history">Simulation History</TabsTrigger>
            <TabsTrigger value="api">API Information</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="max-w-2xl space-y-3 p-5 sm:p-6">
              <div className="space-y-1.5 rounded-xl border bg-card p-3.5">
                <Label>Name *</Label>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 rounded-xl border bg-card p-3.5">
                  <Label>Code</Label>
                  <Input value={draft.code} disabled className="font-mono" />
                  <p className="text-sm text-muted-foreground">
                    Stable API identifier — not editable here to avoid breaking existing integrations.
                  </p>
                </div>
                <div className="space-y-1.5 rounded-xl border bg-card p-3.5">
                  <Label>Domain</Label>
                  <Select value={draft.domain} onValueChange={(v) => setDraft({ ...draft, domain: (v as string) ?? draft.domain })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {industries.map((i) => (
                        <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5 rounded-xl border bg-card p-3.5">
                <Label>Status</Label>
                <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: (v as "Active" | "Inactive") ?? draft.status })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">Controls execution eligibility — separate from Publish status above.</p>
              </div>
              <div className="space-y-1.5 rounded-xl border bg-card p-3.5">
                <Label>Description</Label>
                <Textarea
                  value={draft.description ?? ""}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  className="min-h-16"
                />
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={saveOverview} disabled={!canManage}>Save Changes</Button>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="mapped-rules" className="min-h-0 flex-1">
          <div className="h-full p-5 sm:p-6">
            <MappedRulesChecklist product={product} rules={rules} ruleCategories={ruleCategories} mappings={productRuleMappings} />
          </div>
        </TabsContent>

        <TabsContent value="sequence" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="p-5 sm:p-6">
              <MappedRulesReorder
                product={product}
                rules={rules}
                mappings={productRuleMappings}
                onReorder={(orderedIds) => {
                  saveProductRuleMapping(product.id, orderedIds);
                  toast.success("Execution sequence updated.");
                }}
              />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="sample-json" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="p-5 sm:p-6">
              <SampleJsonPanel data={sampleJson} />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="simulate" className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col p-5 sm:p-6">
            <RunSimulatorPanel product={product} />
          </div>
        </TabsContent>

        <TabsContent value="history" className="min-h-0 flex-1">
          <SimulationHistoryTab simulations={productSims} />
        </TabsContent>

        <TabsContent value="api" className="min-h-0 flex-1">
          <ApiInformationTab product={product} sampleInput={sampleJson} mappedRuleCount={mappedRules.length} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
