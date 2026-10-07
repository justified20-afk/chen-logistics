"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCheck, Loader2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge, humanise } from "@/components/ui/status-badge";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/actions/portal";
import type { NotificationRecord } from "@/types/domain";

const SEVERITY_TONES = {
  critical: "danger",
  high: "danger",
  medium: "warning",
  low: "info",
} as const;

export function NotificationList({
  notifications,
  canMarkAll = true,
}: {
  notifications: NotificationRecord[];
  canMarkAll?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [readIds, setReadIds] = useState<string[]>([]);

  const isRead = (row: NotificationRecord) => Boolean(row.readAt) || readIds.includes(row.id);

  const markAll = () => {
    startTransition(async () => {
      const result = await markAllNotificationsReadAction();
      if (!result.ok) {
        toast.error("Could not mark everything read.");
        return;
      }
      toast.success("All notifications marked read");
      router.refresh();
    });
  };

  const markOne = (id: string) => {
    startTransition(async () => {
      const result = await markNotificationReadAction(id);
      if (result.ok) setReadIds((current) => [...current, id]);
    });
  };

  if (notifications.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Settings2 className="mx-auto size-6 text-muted-foreground" aria-hidden />
        <p className="mt-3 text-sm font-semibold">Nothing to review</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Notifications arrive when shipments slip, exceptions escalate, trips dispatch or payments
          need attention.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {canMarkAll ? (
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={markAll} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CheckCheck className="size-4" aria-hidden />}
            Mark all read
          </Button>
        </div>
      ) : null}

      <ul className="space-y-2">
        {notifications.map((row) => {
          const read = isRead(row);
          return (
            <li
              key={row.id}
              className={
                read
                  ? "rounded-lg border border-border bg-card p-4"
                  : "rounded-lg border border-brand/40 bg-brand/5 p-4"
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {!read ? (
                      <span className="size-2 shrink-0 rounded-full bg-brand" aria-label="Unread" />
                    ) : null}
                    <p className="text-sm font-semibold">{row.title}</p>
                    <StatusBadge
                      label={humanise(row.severity)}
                      tone={SEVERITY_TONES[row.severity] ?? "neutral"}
                      dot={false}
                    />
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {humanise(row.type)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{row.body}</p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">
                    {new Date(row.createdAt).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={row.actionHref}
                    className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium hover:bg-surface-hover"
                  >
                    {row.actionLabel}
                  </Link>
                  {!read ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-muted-foreground"
                      disabled={pending}
                      onClick={() => markOne(row.id)}
                    >
                      Mark read
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
