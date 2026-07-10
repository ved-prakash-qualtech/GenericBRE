import { Condition, ConditionGroup } from "./types";

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
    children: group.children.map((c) =>
      c.type === "group" ? cloneGroupWithFreshIds(c) : { ...c, id: newId("cond") }
    ),
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
  return node.children.reduce((sum, c) => (c.type === "condition" ? sum + 1 : sum + countConditions(c)), 0);
}

export function collectFieldKeys(node: ConditionGroup, out = new Set<string>()): Set<string> {
  for (const c of node.children) {
    if (c.type === "condition") {
      if (c.field) out.add(c.field);
    } else {
      collectFieldKeys(c, out);
    }
  }
  return out;
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
