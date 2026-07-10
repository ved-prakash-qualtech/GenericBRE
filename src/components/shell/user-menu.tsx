"use client";

import { useRouter } from "next/navigation";
import { LogOut, Palette, ShieldCheck, User } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { UserRole } from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLES: UserRole[] = [
  "Super Admin",
  "Business Analyst",
  "Product Manager",
  "Credit Risk Manager",
  "Underwriter",
  "Operations",
];

export function UserMenu() {
  const user = useAppStore((s) => s.currentUser);
  const setRole = useAppStore((s) => s.setUserRole);
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<button className="flex items-center gap-2 rounded-full border py-1 pl-1 pr-2.5 hover:bg-accent transition-colors" />}
      >
        <Avatar className="size-6.5">
          <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-semibold">
            {user.initials}
          </AvatarFallback>
        </Avatar>
        <span className="hidden text-xs font-medium lg:inline">{user.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2.5 py-2">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {user.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{user.name}</span>
            <span className="text-xs font-normal text-muted-foreground">{user.role}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ShieldCheck className="size-4" />
            Switch Role (RBAC preview)
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={user.role} onValueChange={(v) => setRole(v as UserRole)}>
              {ROLES.map((r) => (
                <DropdownMenuRadioItem key={r} value={r}>
                  {r}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onSelect={() => router.push("/appearance")}>
          <Palette className="size-4" />
          Appearance Studio
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <User className="size-4" />
          My Profile (Phase 2)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="text-muted-foreground">
          <LogOut className="size-4" />
          Sign Out (disabled in demo)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
