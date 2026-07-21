import {
  LayoutDashboard,
  Boxes,
  Wand2,
  Library,
  Grid3x3,
  FlaskConical,
  ScrollText,
  Settings,
  Compass,
  type LucideIcon,
} from "lucide-react";
import { Capability, Role } from "./types";
import { hasCapability } from "./store";
import { TranslationKey } from "./i18n";

export interface NavItem {
  href: string;
  label: string;
  /** Translated label for the Sidebar (see src/lib/i18n.ts). `label` above
   *  stays plain English for consumers that aren't wired to translation yet
   *  (Command Palette, the "(Phase 2)" disabled tooltip). */
  labelKey: TranslationKey;
  icon: LucideIcon;
  disabled?: boolean;
  /** Hidden from the nav entirely (not just disabled) when the current role lacks this capability. */
  requiredCapability?: Capability;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", labelKey: "nav.products", icon: Boxes },
  { href: "/rule-builder", label: "Rule Builder", labelKey: "nav.ruleBuilder", icon: Wand2, requiredCapability: "rule.create" },
  { href: "/repository", label: "Rule Repository", labelKey: "nav.ruleRepository", icon: Library, requiredCapability: "rule.view" },
  { href: "/matrix", label: "Decision Matrix", labelKey: "nav.decisionMatrix", icon: Grid3x3 },
  { href: "/simulator", label: "Rule Simulator", labelKey: "nav.ruleSimulator", icon: FlaskConical, requiredCapability: "rule.simulate" },
];

export const NAV_ITEMS_SECONDARY: NavItem[] = [
  { href: "/audit-log", label: "Audit Log", labelKey: "nav.auditLog", icon: ScrollText, requiredCapability: "config.manage" },
  { href: "/metadata-explorer", label: "Metadata Explorer", labelKey: "nav.metadataExplorer", icon: Compass },
  { href: "/settings", label: "Configuration Studio", labelKey: "nav.configStudio", icon: Settings, requiredCapability: "config.manage" },
];

// Role-based navigation (BRD §5.3) — a role only sees the modules its
// capabilities actually grant, rather than every module regardless of persona.
export function visibleNavItems(items: NavItem[], roles: Role[], roleId: string): NavItem[] {
  return items.filter((item) => !item.requiredCapability || hasCapability(roles, roleId, item.requiredCapability));
}
