"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationCenter } from "@/components/layout/notification-center";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import type { NotificationRecord } from "@/types/domain";
import type { RoleKey } from "@/types/permissions";

export function AppHeader({
  user,
  notifications,
  unread,
}: {
  user: { name: string; role: RoleKey; permissions: string[] };
  notifications: NotificationRecord[];
  unread: number;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const canConfigure = user.permissions.includes("settings.manage");

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetTrigger
            asChild
            className="lg:hidden"
          >
            <button
              type="button"
              aria-label="Open navigation"
              className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-card"
            >
              <Menu className="size-4" aria-hidden />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[19rem] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <SidebarNav
              role={user.role}
              permissions={user.permissions}
              onNavigate={() => setNavOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <div className="min-w-0 flex-1">
          <Breadcrumbs />
        </div>

        <GlobalSearch />
        <Separator orientation="vertical" className="hidden h-8 md:block" />
        <NotificationCenter notifications={notifications} unread={unread} />
        <ProfileMenu role={user.role} showSettings={canConfigure} />
      </div>
    </header>
  );
}
