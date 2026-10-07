import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { listNotifications, unreadNotificationCount } from "@/lib/notifications";
import { PageHeader } from "@/components/layout/page-header";
import { NotificationList } from "@/components/notifications/notification-list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

export default async function NotificationsPage(): Promise<React.JSX.Element> {
  const user = await requirePermission("notifications.view");
  const [notifications, unread] = await Promise.all([
    listNotifications(user, 100),
    unreadNotificationCount(user),
  ]);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Notifications"
        description="In-app only. No email or SMS is claimed unless a provider is actually configured — check Settings → Integrations."
        badge={
          unread > 0 ? (
            <span className="rounded bg-brand/15 px-2 py-0.5 text-[11px] font-semibold text-warning">
              {unread} unread
            </span>
          ) : null
        }
      />

      <NotificationList notifications={notifications} />
    </div>
  );
}
