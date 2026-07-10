import {
  FileEdit,
  Briefcase,
  ShieldCheck,
  FileCheck2,
  Headphones,
  Settings,
  UserCog,
  type LucideIcon,
} from "lucide-react";

const ROLE_ICON_MAP: Record<string, LucideIcon> = {
  FileEdit,
  Briefcase,
  ShieldCheck,
  FileCheck2,
  Headphones,
  Settings,
};

export function iconForRole(iconName: string | undefined): LucideIcon {
  return (iconName && ROLE_ICON_MAP[iconName]) || UserCog;
}

export const ROLE_ICON_OPTIONS = Object.keys(ROLE_ICON_MAP);
