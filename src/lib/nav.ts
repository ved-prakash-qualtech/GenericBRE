import {
  LayoutDashboard,
  Wand2,
  Library,
  Grid3x3,
  FlaskConical,
  Bell,
  ScrollText,
  Settings,
  Compass,
  type LucideIcon,
} from "lucide-react";
import { Capability, Role } from "./types";
import { hasCapability } from "./store";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  badgeKey?: "notifications";
  /** Hidden from the nav entirely (not just disabled) when the current role lacks this capability. */
  requiredCapability?: Capability;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/rule-builder", label: "Rule Builder", icon: Wand2, requiredCapability: "rule.create" },
  { href: "/repository", label: "Rule Repository", icon: Library, requiredCapability: "rule.view" },
  { href: "/matrix", label: "Decision Matrix", icon: Grid3x3 },
  { href: "/simulator", label: "Rule Simulator", icon: FlaskConical, requiredCapability: "rule.simulate" },
];

export const NAV_ITEMS_SECONDARY: NavItem[] = [
  { href: "/notifications", label: "Notifications", icon: Bell, badgeKey: "notifications" },
  { href: "/audit-log", label: "Audit Log", icon: ScrollText },
  { href: "/metadata-explorer", label: "Metadata Explorer", icon: Compass },
  { href: "/settings", label: "Configuration Studio", icon: Settings, requiredCapability: "config.manage" },
];

// Role-based navigation (BRD §5.3) — a role only sees the modules its
// capabilities actually grant, rather than every module regardless of persona.
export function visibleNavItems(items: NavItem[], roles: Role[], roleId: string): NavItem[] {
  return items.filter((item) => !item.requiredCapability || hasCapability(roles, roleId, item.requiredCapability));
}
