import { BusinessRule, Condition, ConditionGroup } from "./types";

let seq = 0;
export function newId(prefix: string) {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}${seq}`;
}

export function emptyCondition(field = ""): Condition {
  return { id: newId("cond"), type: "condition", field, operator: "=", value: "" };
}

export function emptyGroup(logic: "AND" | "OR" = "AND"): ConditionGroup {
  return { id: newId("grp"), type: "group", logic, children: [] };
}

// Deep-clones a condition tree with brand-new ids — used when instantiating a
// Rule Template, so using the same template twice never produces id clashes.
export function cloneGroupWithFreshIds(group: ConditionGroup): ConditionGroup {
  return {
    ...group,
    id: newId("grp"),
    children: group.children.map((c) => (c.type === "group" ? cloneGroupWithFreshIds(c) : { ...c, id: newId("cond") })),
  };
}

type Node = Condition | ConditionGroup;

export function mapTree(node: ConditionGroup, fn: (n: Node) => Node): ConditionGroup {
  const mapped = fn(node) as ConditionGroup;
  return {
    ...mapped,
    children: mapped.children.map((c) => (c.type === "group" ? mapTree(c, fn) : (fn(c) as Condition))),
  };
}

export function updateNode(root: ConditionGroup, id: string, patch: Partial<Node>): ConditionGroup {
  return mapTree(root, (n) => (n.id === id ? ({ ...n, ...patch } as Node) : n));
}

export function removeNode(root: ConditionGroup, id: string): ConditionGroup {
  function recurse(group: ConditionGroup): ConditionGroup {
    return {
      ...group,
      children: group.children
        .filter((c) => c.id !== id)
        .map((c) => (c.type === "group" ? recurse(c) : c)),
    };
  }
  return recurse(root);
}

export function addChildToGroup(root: ConditionGroup, groupId: string, child: Node): ConditionGroup {
  function recurse(group: ConditionGroup): ConditionGroup {
    if (group.id === groupId) {
      return { ...group, children: [...group.children, child] };
    }
    return {
      ...group,
      children: group.children.map((c) => (c.type === "group" ? recurse(c) : c)),
    };
  }
  return recurse(root);
}

export function countConditions(node: ConditionGroup): number {
  return node.children.reduce((sum, c) => (c.type === "group" ? sum + countConditions(c) : sum + 1), 0);
}

export function collectFieldKeys(node: ConditionGroup, out = new Set<string>()): Set<string> {
  for (const c of node.children) {
    if (c.type === "group") {
      collectFieldKeys(c, out);
    } else if (c.field) {
      out.add(c.field);
    }
  }
  return out;
}

// Where a Field Catalog entry is actually used — walks each rule's condition
// tree (IF) plus its THEN/ELSE action output fields, so the Field Catalog can
// show a real "N rules depend on this" count instead of a guess.
export function fieldUsage(fieldKey: string, rules: BusinessRule[]): { count: number; ruleIds: string[] } {
  const ruleIds = rules
    .filter((r) => {
      if (collectFieldKeys(r.rootGroup).has(fieldKey)) return true;
      const actions = [...r.actions, ...(r.elseActions ?? [])];
      return actions.some((a) => a.outputField === fieldKey);
    })
    .map((r) => r.id);
  return { count: ruleIds.length, ruleIds };
}

/** The group that directly contains `id`, or null if `id` is the root/absent. */
export function findParent(root: ConditionGroup, id: string): ConditionGroup | null {
  for (const c of root.children) {
    if (c.id === id) return root;
    if (c.type === "group") {
      const found = findParent(c, id);
      if (found) return found;
    }
  }
  return null;
}

export function findNode(root: ConditionGroup, id: string): Node | null {
  if (root.id === id) return root;
  for (const c of root.children) {
    if (c.id === id) return c;
    if (c.type === "group") {
      const found = findNode(c, id);
      if (found) return found;
    }
  }
  return null;
}

/** True when `maybeDescendant` is inside (or is) the subtree rooted at `groupId`. */
function isWithin(root: ConditionGroup, groupId: string, maybeDescendantId: string): boolean {
  const group = findNode(root, groupId);
  if (!group || group.type !== "group") return false;
  return findNode(group, maybeDescendantId) !== null;
}

/** Fresh-id clone of any node — conditions get a new id, groups recurse. */
export function cloneNodeWithFreshIds(node: Node): Node {
  return node.type === "group" ? cloneGroupWithFreshIds(node) : { ...node, id: newId("cond") };
}

/** Inserts a clone of node `id` immediately after the original in the same parent. */
export function duplicateNode(root: ConditionGroup, id: string): ConditionGroup {
  function recurse(group: ConditionGroup): ConditionGroup {
    const idx = group.children.findIndex((c) => c.id === id);
    if (idx !== -1) {
      const copy = cloneNodeWithFreshIds(group.children[idx]);
      const children = [...group.children];
      children.splice(idx + 1, 0, copy);
      return { ...group, children };
    }
    return { ...group, children: group.children.map((c) => (c.type === "group" ? recurse(c) : c)) };
  }
  return recurse(root);
}

export function insertChildAt(root: ConditionGroup, groupId: string, child: Node, index: number): ConditionGroup {
  function recurse(group: ConditionGroup): ConditionGroup {
    if (group.id === groupId) {
      const children = [...group.children];
      children.splice(Math.max(0, Math.min(index, children.length)), 0, child);
      return { ...group, children };
    }
    return { ...group, children: group.children.map((c) => (c.type === "group" ? recurse(c) : c)) };
  }
  return recurse(root);
}

/** Moves a node into `targetGroupId` at `index`. No-op if the move would put a
 *  group inside itself/its own descendant, or the node/target doesn't exist. */
export function moveNode(root: ConditionGroup, nodeId: string, targetGroupId: string, index: number): ConditionGroup {
  if (nodeId === targetGroupId || isWithin(root, nodeId, targetGroupId)) return root;
  const node = findNode(root, nodeId);
  if (!node || node === root || !findNode(root, targetGroupId)) return root;
  // Removing first shifts sibling indexes when moving downward within the
  // same parent — adjust so `index` still means the visual slot the user
  // dropped on.
  const parent = findParent(root, nodeId);
  let adjustedIndex = index;
  if (parent && parent.id === targetGroupId) {
    const from = parent.children.findIndex((c) => c.id === nodeId);
    if (from !== -1 && from < index) adjustedIndex = index - 1;
  }
  return insertChildAt(removeNode(root, nodeId), targetGroupId, node, adjustedIndex);
}

/** Wraps N same-parent siblings (in their current order) into one new group. */
export function wrapInGroup(root: ConditionGroup, ids: string[], logic: "AND" | "OR" = "AND"): ConditionGroup {
  if (ids.length === 0) return root;
  const parent = findParent(root, ids[0]);
  if (!parent || !ids.every((id) => parent.children.some((c) => c.id === id))) return root;
  const idSet = new Set(ids);
  const wrapped: ConditionGroup = { id: newId("grp"), type: "group", logic, children: parent.children.filter((c) => idSet.has(c.id)) };
  const firstIdx = parent.children.findIndex((c) => idSet.has(c.id));
  const remaining = parent.children.filter((c) => !idSet.has(c.id));
  remaining.splice(firstIdx, 0, wrapped);
  return updateNode(root, parent.id, { children: remaining });
}

export interface TreeStats {
  conditions: number;
  groups: number;
  andCount: number;
  orCount: number;
  maxDepth: number;
}

/** Connector counts = max(children-1, 0) per group, attributed to its logic —
 *  i.e. how many AND/OR joins the rendered expression actually contains. */
export function treeStats(root: ConditionGroup): TreeStats {
  const stats: TreeStats = { conditions: 0, groups: 0, andCount: 0, orCount: 0, maxDepth: 0 };
  function walk(group: ConditionGroup, depth: number) {
    stats.groups += 1;
    stats.maxDepth = Math.max(stats.maxDepth, depth);
    const joins = Math.max(group.children.length - 1, 0);
    if (group.logic === "AND") stats.andCount += joins;
    else stats.orCount += joins;
    for (const c of group.children) {
      if (c.type === "group") walk(c, depth + 1);
      else stats.conditions += 1;
    }
  }
  walk(root, 1);
  return stats;
}

export function validateTree(node: ConditionGroup, errors: string[] = [], path = "IF"): string[] {
  node.children.forEach((c, i) => {
    if (c.type === "condition") {
      if (!c.field) errors.push(`${path}: condition ${i + 1} is missing a business field.`);
      if (!c.operator) errors.push(`${path}: condition ${i + 1} is missing an operator.`);
      if (c.value === "" || c.value === undefined) errors.push(`${path}: condition ${i + 1} is missing a value.`);
      if (c.operator === "between" && (!c.value2 || c.value2 === "")) {
        errors.push(`${path}: condition ${i + 1} needs both a from and to value for "Between".`);
      }
    } else {
      validateTree(c, errors, `${path} → group`);
    }
  });
  return errors;
}
