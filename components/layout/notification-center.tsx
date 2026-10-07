"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Bell, CheckCheck, ExternalLink, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/actions/portal";
import type { NotificationRecord, Severity } from "@/types/domain";

const SEVERITY_CLASS: Record<Severity, string> = {
  critical: "bg-danger",
  high: "bg-warning",
  medium: "bg-info",
  low: "bg-muted-foreground",
};

const SEVERITY_TEXT: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function NotificationCenter({
  notifications,
  unread,
}: {
  notifications: NotificationRecord[];
  unread: number;
}) {
  const [items, setItems] = useState(notifications);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const read = (id: string) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)),
    );
    startTransition(() => void markNotificationReadAction(id));
  };

  const readAll = () => {
    setItems((current) =>
      current.map((item) =>
        item.readAt ? item : { ...item, readAt: new Date().toISOString() },
      ),
    );
    startTransition(() => void markAllNotificationsReadAction());
  };

  const unreadCount = items.filter((item) => !item.readAt).length;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
          className="relative grid size-9 place-items-center rounded-md border border-border bg-card transition-colors hover:bg-surface-hover"
        >
          <Bell className="size-4" aria-hidden />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-4 text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">
            Notifications
          </DropdownMenuLabel>
          <button
            type="button"
            onClick={readAll}
            disabled={pending || unreadCount === 0}
            className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {pending ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <CheckCheck className="size-3" aria-hidden />}
            Mark all read
          </button>
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-[60vh] overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nothing needs your attention. New operational alerts will appear here.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id} className={cn("px-3 py-3", !item.readAt && "bg-surface-hover")}>
                  <div className="flex gap-2.5">
                    <span
                      className={cn("mt-1.5 size-2 shrink-0 rounded-full", SEVERITY_CLASS[item.severity])}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{item.title}</p>
                      <p className="mt-0.5 break-words text-xs text-muted-foreground">{item.body}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span
                          className={cn(
                            "rounded px-1 py-0.5 font-medium",
                            item.severity === "critical" || item.severity === "high"
                              ? "bg-danger/10 text-danger"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {SEVERITY_TEXT[item.severity]}
                        </span>
                        <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                        {!item.readAt ? <span className="font-medium text-foreground">Unread</span> : null}
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <Link
                          href={item.actionHref}
                          onClick={() => read(item.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {item.actionLabel}
                          <ExternalLink className="size-3" aria-hidden />
                        </Link>
                        {!item.readAt ? (
                          <button
                            type="button"
                            onClick={() => read(item.id)}
                            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                          >
                            Mark read
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <Link
          href="/notifications"
          onClick={() => setOpen(false)}
          className="block px-3 py-2.5 text-center text-xs font-medium text-primary hover:underline"
        >
          Open notification centre
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
