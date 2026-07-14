"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RequestParametersManager } from "./request-parameters-manager";
import { RuleSetMappingManager } from "./rule-set-mapping-manager";
import { ExecutionManagerTestPanel } from "./execution-manager-test-panel";

// Routes an incoming request (Industry + whatever other dimensions are
// configured) to an ordered sequence of Rule Sets, instead of every
// simulatable rule in an industry running unconditionally. See the plan doc
// for the full architecture — this is purely the module's UI shell.
export function ExecutionManager() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Decides which Rule Sets execute — and in what sequence — for a given combination of request parameters, so
        adding a new product or API only requires configuration here, not code.
      </p>
      <Tabs defaultValue="mappings">
        <TabsList>
          <TabsTrigger value="mappings">Rule Set Mappings</TabsTrigger>
          <TabsTrigger value="parameters">Request Parameters</TabsTrigger>
          <TabsTrigger value="test">Test Mapping</TabsTrigger>
        </TabsList>
        <TabsContent value="mappings" className="pt-3">
          <RuleSetMappingManager />
        </TabsContent>
        <TabsContent value="parameters" className="pt-3">
          <RequestParametersManager />
        </TabsContent>
        <TabsContent value="test" className="pt-3">
          <ExecutionManagerTestPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
