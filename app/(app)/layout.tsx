import { requireUser } from "@/lib/session";
import { listNotifications, unreadNotificationCount } from "@/lib/notifications";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [notifications, unread] = await Promise.all([
    listNotifications(user, 20),
    unreadNotificationCount(user),
  ]);

  return (
    <AppShell
      user={{ name: user.name, role: user.role, permissions: user.permissions }}
      notifications={notifications}
      unread={unread}
    >
      {children}
    </AppShell>
  );
}
