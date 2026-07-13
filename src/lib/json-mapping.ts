import { FieldDataType } from "./types";

export interface FlattenedAttribute {
  path: string;
  sampleValue: unknown;
  inferredType: FieldDataType;
}

function inferType(value: unknown): FieldDataType {
  if (Array.isArray(value)) return "list";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  return "string";
}

// Recursively walks a parsed JSON payload, producing one row per leaf
// attribute with a JSON-path-like address. Objects extend the path with
// `.key`; arrays sample their first element (if any) and extend the path
// with `[]` — good enough to seed a mapping table from a real sample
// payload, not a full JSON Schema/OpenAPI parser.
export function flattenJson(value: unknown, prefix = ""): FlattenedAttribute[] {
  if (value === null || value === undefined) {
    return prefix ? [{ path: prefix, sampleValue: value, inferredType: "string" }] : [];
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [{ path: `${prefix}[]`, sampleValue: [], inferredType: "list" }];
    }
    const first = value[0];
    if (first !== null && typeof first === "object") {
      return flattenJson(first, `${prefix}[]`);
    }
    return [{ path: `${prefix}[]`, sampleValue: first, inferredType: "list" }];
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, v]) =>
      flattenJson(v, prefix ? `${prefix}.${key}` : key)
    );
  }

  return [{ path: prefix, sampleValue: value, inferredType: inferType(value) }];
}
