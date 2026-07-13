"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, NAV_ITEMS_SECONDARY, visibleNavItems } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";

function NavLink({
  href,
  label,
  Icon,
  collapsed,
  disabled,
  badge,
  onNavigate,
}: {
  href: string;
  label: string;
  Icon: React.ElementType;
  collapsed: boolean;
  disabled?: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const linkClassName = cn(
    "group relative flex h-9.5 items-center gap-3 rounded-lg px-2.5 text-[13px] font-medium transition-colors",
    collapsed && "justify-center px-0",
    disabled
      ? "cursor-not-allowed text-sidebar-foreground/35"
      : active
      ? "bg-sidebar-primary/15 text-sidebar-foreground"
      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
  );

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) e.preventDefault();
    else onNavigate?.();
  };

  const linkContent = (
    <>
      {active && !collapsed && (
        <span className="absolute left-0 top-1/2 h-4.5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
      )}
      <Icon className={cn("size-4 shrink-0", active && "text-sidebar-primary")} strokeWidth={2.2} />
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && badge ? (
        <Badge className="ml-auto h-4.5 min-w-4.5 rounded-full px-1 text-[10px]">{badge}</Badge>
      ) : null}
      {collapsed && badge ? (
        <span className="absolute right-1 top-1 size-1.5 rounded-full bg-destructive" />
      ) : null}
    </>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link href={disabled ? "#" : href} aria-disabled={disabled} onClick={handleClick} className={linkClassName} />
          }
        >
          {linkContent}
        </TooltipTrigger>
        <TooltipContent side="right">{label}{disabled ? " (Phase 2)" : ""}</TooltipContent>
      </Tooltip>
    );
  }

  const link = (
    <Link href={disabled ? "#" : href} aria-disabled={disabled} onClick={handleClick} className={linkClassName}>
      {linkContent}
    </Link>
  );
  return link;
}

export function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const unread = useAppStore((s) => s.notifications.filter((n) => !n.read).length);
  const roles = useAppStore((s) => s.roles);
  const roleId = useAppStore((s) => s.currentUser.role);
  const primaryItems = visibleNavItems(NAV_ITEMS, roles, roleId);
  const secondaryItems = visibleNavItems(NAV_ITEMS_SECONDARY, roles, roleId);

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-2.5 py-4">
      <div className="flex flex-col gap-0.5">
        {!collapsed && (
          <p className="px-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Workspace
          </p>
        )}
        {primaryItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            Icon={item.icon}
            collapsed={collapsed}
            disabled={item.disabled}
            onNavigate={onNavigate}
          />
        ))}
      </div>
      <div className="flex flex-col gap-0.5">
        {!collapsed && (
          <p className="px-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Platform
          </p>
        )}
        {secondaryItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            Icon={item.icon}
            collapsed={collapsed}
            disabled={item.disabled}
            badge={item.badgeKey === "notifications" ? unread : undefined}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </nav>
  );
}
