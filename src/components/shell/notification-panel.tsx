"use client";

import { useState } from "react";
import { Bell, CheckCheck, AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { NotificationType } from "@/lib/types";
import { useRouter } from "next/navigation";

const ICONS: Record<NotificationType, React.ElementType> = {
  Error: AlertCircle,
  Warning: AlertTriangle,
  Success: CheckCircle2,
  Info: Info,
};

const COLORS: Record<NotificationType, string> = {
  Error: "text-red-500 bg-red-500/10",
  Warning: "text-amber-500 bg-amber-500/10",
  Success: "text-emerald-500 bg-emerald-500/10",
  Info: "text-blue-500 bg-blue-500/10",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const notifications = useAppStore((s) => s.notifications);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const markAllRead = useAppStore((s) => s.markAllNotificationsRead);
  const router = useRouter();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <>
      <Button variant="ghost" size="icon" className="relative size-9" onClick={() => setOpen(true)} aria-label="Notifications">
        <Bell className="size-[18px]" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
          <SheetHeader className="flex-row items-center justify-between border-b space-y-0">
            <SheetTitle>Notification Centre</SheetTitle>
            <Button variant="ghost" size="sm" className="mr-8 gap-1.5 text-xs" onClick={markAllRead}>
              <CheckCheck className="size-3.5" /> Mark all read
            </Button>
          </SheetHeader>
          <ScrollArea className="flex-1">
            <div className="flex flex-col divide-y">
              {notifications.map((n) => {
                const Icon = ICONS[n.type];
                return (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/50",
                      !n.read && "bg-primary/[0.03] border-l-2 border-l-primary"
                    )}
                  >
                    <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full", COLORS[n.type])}>
                      <Icon className="size-3.5" />
                    </span>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("text-[13px] leading-tight", !n.read ? "font-semibold" : "font-medium text-foreground/80")}>
                          {n.title}
                        </p>
                        {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug">{n.message}</p>
                      <div className="flex items-center gap-2 pt-0.5">
                        {n.module && <span className="text-[10px] font-medium text-muted-foreground/70">{n.module}</span>}
                        <span className="text-[10px] text-muted-foreground/50">
                          {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
          <div className="border-t p-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setOpen(false);
                router.push("/notifications");
              }}
            >
              View all notifications
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
