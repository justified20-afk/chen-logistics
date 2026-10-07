"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Moon, Settings, Sun, UserRound } from "lucide-react";
import { ROLE_LABELS, type RoleKey } from "@/types/permissions";

const subscribe = () => () => {};
const getClientMounted = () => true;
const getServerMounted = () => false;

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function ProfileMenu({
  role,
  showSettings,
}: {
  role: RoleKey;
  showSettings: boolean;
}) {
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  // Hydration guard without an effect: the server snapshot is false and the
  // client snapshot is true, so theme-dependent labels never mismatch SSR output.
  const mounted = useSyncExternalStore(subscribe, getClientMounted, getServerMounted);

  const name = session?.user?.name ?? "…";
  const email = session?.user?.email ?? "";
  const canDrive = role === "driver";
  const canCustomer = role === "customer";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open profile menu"
          className="rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="p-3">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{email}</p>
          <p className="mt-1.5 inline-flex rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {ROLE_LABELS[role]}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canDrive ? (
          <DropdownMenuItem asChild>
            <Link href="/driver/profile">
              <UserRound className="size-4" aria-hidden /> My profile
            </Link>
          </DropdownMenuItem>
        ) : canCustomer ? (
          <DropdownMenuItem asChild>
            <Link href="/customer/profile">
              <UserRound className="size-4" aria-hidden /> My profile
            </Link>
          </DropdownMenuItem>
        ) : null}
        {showSettings ? (
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="size-4" aria-hidden /> Settings
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}
          disabled={!mounted}
        >
          {theme === "dark" ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
          {theme === "dark" ? "Light theme" : "Dark theme"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => void signOut({ callbackUrl: "/signin" })}
          disabled={status === "loading"}
        >
          <LogOut className="size-4" aria-hidden /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
