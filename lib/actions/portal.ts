"use server";

import { getSessionUser } from "@/lib/session";
import { globalSearch } from "@/lib/search";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import type { SearchResult } from "@/types/domain";

export async function searchAction(query: string): Promise<SearchResult[]> {
  const user = await getSessionUser();
  if (!user) return [];
  return globalSearch(query, user);
}

export async function markNotificationReadAction(id: string): Promise<{ ok: boolean }> {
  const user = await getSessionUser();
  if (!user) return { ok: false };
  await markNotificationRead(id, user);
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<{ ok: boolean }> {
  const user = await getSessionUser();
  if (!user) return { ok: false };
  await markAllNotificationsRead(user);
  return { ok: true };
}

export async function fetchNotificationsAction() {
  const user = await getSessionUser();
  if (!user) return [];
  return listNotifications(user, 20);
}
