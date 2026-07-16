import { NotifyActionType, NotifyOperator, NotifyWorkflowStatus } from "./types";

// Small fixed vocabularies — proportionate to how this codebase already treats
// closed enums (Operator/ActionType in fields.ts/types.ts). Categories and
// Triggers, by contrast, are configurable store-backed registries (see
// mock-data.ts's DEFAULT_NOTIFY_CATEGORIES/DEFAULT_NOTIFY_TRIGGERS) since
// those are the axis that actually varies per tenant/domain.

export const NOTIFY_ACTION_TYPES: NotifyActionType[] = [
  "Send Email",
  "Send In-App Notification",
  "Send WhatsApp Message",
  "Notify Stakeholders",
  "Create Follow-up Task",
  "Create Escalation",
  "Change Status",
];

// The one action type that carries no message body (mirrors the source
// blueprint's single hardcoded UI rule, kept minimal rather than a full
// parameter-schema system per NOTIFYX_BLUEPRINT §7.4/§18).
export const NOTIFY_ACTIONS_WITHOUT_MESSAGE: NotifyActionType[] = ["Change Status"];

// Condition fields are a flat list (matching the source blueprint's own flat
// model, §7.3) rather than derived from a trigger payload schema — this
// prototype has no event-payload registry to derive them from.
export const NOTIFY_CONDITION_FIELDS: string[] = [
  "Rule Status",
  "Priority",
  "Domain",
  "Category",
  "Simulation Outcome",
  "Mapped Rules",
  "Product Status",
];

export const NOTIFY_OPERATORS: { value: NotifyOperator; label: string }[] = [
  { value: "is", label: "is" },
  { value: "is not", label: "is not" },
  { value: "contains", label: "contains" },
];

export const NOTIFY_DELAYS: string[] = [
  "1 hour",
  "4 hours",
  "24 hours",
  "3 days",
  "7 days",
  "24 hours before SLA breach",
  "Until rule approved",
  "Until simulation re-run",
];

// IF / THEN / WAIT step color tokens — one shared source for both the
// read-only StepBlock (detail view) and the builder's editable rows, so the
// two can never drift out of dark-mode sync (NOTIFYX_BLUEPRINT gap G-11).
export const NOTIFY_STEP_STYLES: Record<NotifyStepKind, { label: string; classes: string }> = {
  condition: { label: "IF", classes: "bg-blue-500/10 border-blue-500/25 text-blue-700 dark:text-blue-400" },
  action: { label: "THEN", classes: "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400" },
  wait: { label: "WAIT", classes: "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400" },
};
type NotifyStepKind = "condition" | "action" | "wait";

export const NOTIFY_STATUS_STYLES: Record<NotifyWorkflowStatus, string> = {
  Draft: "bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/25",
  Active: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  Paused: "bg-slate-500/12 text-slate-600 dark:text-slate-400 border-slate-500/25",
};

// Rotating palette assigned to categories by index (NOTIFYX_BLUEPRINT §5.6
// recommendation #2) — new categories get a color automatically instead of a
// hand-maintained per-id map.
export const NOTIFY_CATEGORY_PALETTE: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25",
  emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
  violet: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/25",
  red: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25",
  slate: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/25",
  cyan: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/25",
  pink: "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/25",
};
const PALETTE_KEYS = Object.keys(NOTIFY_CATEGORY_PALETTE);

export function categoryClasses(colorToken: string): string {
  return NOTIFY_CATEGORY_PALETTE[colorToken] ?? NOTIFY_CATEGORY_PALETTE.slate;
}

export function nextCategoryColor(existingCount: number): string {
  return PALETTE_KEYS[existingCount % PALETTE_KEYS.length];
}
