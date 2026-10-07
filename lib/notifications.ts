import "server-only";
import { getDb } from "@/lib/mongodb";
import { oid, toDomainList } from "@/lib/db";
import type { NotificationRecord, NotificationType, Severity } from "@/types/domain";
import type { RoleKey } from "@/types/permissions";

export interface NotificationInput {
  type: NotificationType;
  severity: Severity;
  title: string;
  body: string;
  actionHref: string;
  actionLabel: string;
  /** Deliver to one user … */
  userId?: string;
  /** … or to everyone holding a role. */
  audienceRole?: RoleKey;
  dedupeKey?: string;
}

/**
 * Stores an in-app notification intent. No email/SMS is ever claimed — external
 * delivery is only ever reported when a provider is actually configured.
 */
export async function createNotification(input: NotificationInput): Promise<void> {
  try {
    const db = await getDb();
    const doc = {
      type: input.type,
      severity: input.severity,
      title: input.title,
      body: input.body,
      actionHref: input.actionHref,
      actionLabel: input.actionLabel,
      userId: input.userId,
      audienceRole: input.audienceRole,
      dedupeKey: input.dedupeKey,
      readAt: null,
      createdAt: new Date(),
    } as never;

    if (input.dedupeKey) {
      await db.collection("notifications").updateOne(
        { dedupeKey: input.dedupeKey, readAt: null } as never,
        { $set: { body: input.body, createdAt: new Date() }, $setOnInsert: doc } as never,
        { upsert: true },
      );
      return;
    }
    await db.collection("notifications").insertOne(doc);
  } catch (error) {
    console.error("[vale] failed to store notification", {
      type: input.type,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function listNotifications(user: {
  id: string;
  role: RoleKey;
}, limit = 30): Promise<NotificationRecord[]> {
  const db = await getDb();
  const docs = await db
    .collection("notifications")
    .find({
      $or: [{ userId: user.id }, { audienceRole: user.role }, { audienceRole: { $exists: false }, userId: { $exists: false } }],
    } as never)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return toDomainList<NotificationRecord>(docs);
}

export async function unreadNotificationCount(user: {
  id: string;
  role: RoleKey;
}): Promise<number> {
  const db = await getDb();
  return db.collection("notifications").countDocuments({
    readAt: null,
    $or: [{ userId: user.id }, { audienceRole: user.role }, { audienceRole: { $exists: false }, userId: { $exists: false } }],
  } as never);
}

export async function markNotificationRead(id: string, user: { id: string; role: RoleKey }) {
  const target = oid(id);
  if (!target) return;
  const db = await getDb();
  await db.collection("notifications").updateOne(
    {
      _id: target,
      $or: [{ userId: user.id }, { audienceRole: user.role }, { audienceRole: { $exists: false }, userId: { $exists: false } }],
    } as never,
    { $set: { readAt: new Date() } } as never,
  );
}

export async function markAllNotificationsRead(user: { id: string; role: RoleKey }) {
  const db = await getDb();
  await db.collection("notifications").updateMany(
    {
      readAt: null,
      $or: [{ userId: user.id }, { audienceRole: user.role }],
    } as never,
    { $set: { readAt: new Date() } } as never,
  );
}
