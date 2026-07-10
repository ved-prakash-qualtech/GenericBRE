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

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  badgeKey?: "notifications";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/rule-builder", label: "Rule Builder", icon: Wand2 },
  { href: "/repository", label: "Rule Repository", icon: Library },
  { href: "/matrix", label: "Decision Matrix", icon: Grid3x3 },
  { href: "/simulator", label: "Rule Simulator", icon: FlaskConical },
];

export const NAV_ITEMS_SECONDARY: NavItem[] = [
  { href: "/notifications", label: "Notifications", icon: Bell, badgeKey: "notifications" },
  { href: "/audit-log", label: "Audit Log", icon: ScrollText },
  { href: "/metadata-explorer", label: "Metadata Explorer", icon: Compass },
  { href: "/settings", label: "Configuration Studio", icon: Settings },
];
