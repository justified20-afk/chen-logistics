import { AppHeader } from "@/components/layout/app-header";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import type { NotificationRecord } from "@/types/domain";
import type { RoleKey } from "@/types/permissions";

export function AppShell({
  user,
  notifications,
  unread,
  children,
}: {
  user: { name: string; role: RoleKey; permissions: string[] };
  notifications: NotificationRecord[];
  unread: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh w-full">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-border bg-sidebar lg:block">
        <SidebarNav role={user.role} permissions={user.permissions} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader user={user} notifications={notifications} unread={unread} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
