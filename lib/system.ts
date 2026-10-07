import "server-only";
import { z } from "zod";
import { getDb } from "@/lib/mongodb";
import { oid, toDomain, toDomainList } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { fieldErrors } from "@/lib/schemas/common";
import { settingsSchema, userSchema } from "@/lib/schemas/system";
import {
  fail,
  ok,
  CONFLICT,
  NOT_FOUND,
  type ActionResult,
} from "@/lib/actions/result";
import type { ActorContext } from "@/lib/actions/context";
import type { SessionUser } from "@/lib/session";
import type {
  AuditLog,
  SystemSettings,
  UserRecord,
  UserStatus,
} from "@/types/domain";
import type { RoleKey } from "@/types/permissions";

const SETTINGS_ID = "system";

export async function getSettings(): Promise<SystemSettings | null> {
  const db = await getDb();
  const doc = await db.collection("settings").findOne({ _id: SETTINGS_ID } as never);
  return doc ? toDomain<SystemSettings>(doc) : null;
}

export async function updateSettings(
  raw: unknown,
  context: ActorContext,
): Promise<ActionResult<{ id: string }>> {
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("Check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  }
  const db = await getDb();
  const before = await getSettings();

  if (parsed.data.defaultOriginHubId) {
    const hub = await db.collection("hubs").findOne({ _id: oid(parsed.data.defaultOriginHubId) } as never);
    if (!hub) return fail("That default hub no longer exists.");
  }

  const $set: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  const updated = await db
    .collection("settings")
    .findOneAndUpdate({ _id: SETTINGS_ID } as never, { $set: $set as never } as never, {
      upsert: true,
      returnDocument: "after",
    });

  await recordAudit({
    actorId: context.user.id,
    actorName: context.user.name,
    actorRole: context.user.role,
    action: "settings.updated",
    entityType: "settings",
    entityId: SETTINGS_ID,
    entityLabel: "System settings",
    before: before
      ? {
          companyName: before.companyName,
          currency: before.currency,
          delayThresholdHours: before.delayThresholdHours,
          codEnabled: before.codEnabled,
        }
      : undefined,
    after: parsed.data,
    ip: context.ip,
    userAgent: context.userAgent,
  });

  return ok({ id: SETTINGS_ID });
}

/* --------------------------------------------------------------------- users */

export interface UserListFilter {
  q?: string;
  role?: string;
  status?: string;
  sort?: string;
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export const userFilterSchema = z.object({
  q: z.string().trim().max(120).optional(),
  role: z.string().optional(),
  status: z.string().optional(),
  sort: z.string().optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

export async function listUsers(
  filter: UserListFilter,
): Promise<{ rows: UserRecord[]; total: number; page: number; pageSize: number }> {
  const db = await getDb();
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filter.pageSize ?? 20));

  const query: Record<string, unknown> = {};
  if (filter.q) {
    const escaped = filter.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [{ name: regex }, { email: regex }];
  }
  if (filter.role) query.role = filter.role;
  if (filter.status) query.status = filter.status;

  const SORTABLE: Record<string, string> = {
    name: "name",
    email: "email",
    role: "role",
    status: "status",
    lastLoginAt: "lastLoginAt",
    createdAt: "createdAt",
  };
  const sortKey = SORTABLE[filter.sort ?? ""] ?? "createdAt";
  const direction = filter.dir === "asc" ? 1 : -1;

  const [total, docs] = await Promise.all([
    db.collection("users").countDocuments(query as never),
    db
      .collection("users")
      .find(query as never)
      .sort({ [sortKey]: direction } as never)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
  ]);

  return { rows: toDomainList<UserRecord>(docs), total, page, pageSize };
}

const userUpdateSchema = z.object({
  userId: z.string().min(1),
  role: z.enum([
    "administrator",
    "operations_manager",
    "dispatcher",
    "warehouse",
    "driver",
    "support",
    "finance",
    "customer",
  ]).optional(),
  status: z.enum(["active", "suspended", "invited"]).optional(),
  name: z.string().trim().min(2).max(120).optional(),
});

export async function updateUser(
  raw: unknown,
  context: ActorContext,
): Promise<ActionResult<{ id: string }>> {
  const parsed = userUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("Check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  }
  const { userId, role, status, name } = parsed.data;
  const _id = oid(userId);
  if (!_id) return fail(NOT_FOUND);

  const db = await getDb();
  const doc = await db.collection("users").findOne({ _id } as never);
  if (!doc) return fail(NOT_FOUND);
  const before = toDomain<UserRecord>(doc);

  // Never let the last active administrator be demoted or suspended.
  if (
    before.role === "administrator" &&
    (role !== undefined || status !== undefined) &&
    (role !== "administrator" || status === "suspended")
  ) {
    const admins = await db.collection("users").countDocuments({
      role: "administrator",
      status: "active",
    } as never);
    if (admins <= 1) {
      return fail(
        "This is the last active administrator. Promote another account before changing this one.",
      );
    }
  }

  if (userId === context.user.id && status === "suspended") {
    return fail("You cannot suspend your own account.");
  }

  const $set: Record<string, unknown> = { updatedAt: new Date() };
  if (role !== undefined) $set.role = role;
  if (status !== undefined) $set.status = status;
  if (name !== undefined) $set.name = name;

  const updated = await db.collection("users").findOneAndUpdate(
    { _id } as never,
    { $set: $set as never } as never,
    { returnDocument: "after" },
  );
  if (!updated) return fail(NOT_FOUND);

  await recordAudit({
    actorId: context.user.id,
    actorName: context.user.name,
    actorRole: context.user.role,
    action: "user.updated",
    entityType: "user",
    entityId: userId,
    entityLabel: before.email,
    before: { role: before.role, status: before.status, name: before.name },
    after: { role: role ?? before.role, status: status ?? before.status, name: name ?? before.name },
    ip: context.ip,
    userAgent: context.userAgent,
  });

  if (role && role !== before.role) {
    await createNotification({
      type: "system",
      severity: "low",
      title: "Your role changed",
      body: `${context.user.name} changed your role to ${role.replace("_", " ")}.`,
      actionHref: "/dashboard",
      actionLabel: "Open dashboard",
      userId,
      dedupeKey: `role-change:${userId}:${Date.now()}`,
    });
  }

  return ok({ id: userId });
}

/* --------------------------------------------------------------- audit log */

export interface AuditListFilter {
  q?: string;
  action?: string;
  entityType?: string;
  actor?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export const auditFilterSchema = z.object({
  q: z.string().trim().max(120).optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  actor: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

export async function listAudit(
  filter: AuditListFilter,
): Promise<{ rows: AuditLog[]; total: number; page: number; pageSize: number }> {
  const db = await getDb();
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filter.pageSize ?? 20));

  const query: Record<string, unknown> = {};
  if (filter.q) {
    const escaped = filter.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [
      { entityLabel: regex },
      { actorName: regex },
      { action: regex },
      { entityId: regex },
    ];
  }
  if (filter.action) query.action = filter.action;
  if (filter.entityType) query.entityType = filter.entityType;
  if (filter.actor) query.actorName = filter.actor;
  if (filter.from || filter.to) {
    const createdAt: Record<string, Date> = {};
    if (filter.from) createdAt.$gte = new Date(filter.from);
    if (filter.to) createdAt.$lte = new Date(`${filter.to}T23:59:59`);
    query.createdAt = createdAt;
  }

  const [total, docs] = await Promise.all([
    db.collection("auditLogs").countDocuments(query as never),
    db
      .collection("auditLogs")
      .find(query as never)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
  ]);

  return { rows: toDomainList<AuditLog>(docs), total, page, pageSize };
}

/* ------------------------------------------------------------------ helpers */

export interface RoleOption {
  value: RoleKey;
  label: string;
}

export const USER_STATUS_VALUES: UserStatus[] = ["active", "suspended", "invited"];

export async function userStatusCounts(): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db
    .collection("users")
    .aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
    .toArray();
  const output: Record<string, number> = {};
  for (const row of rows) output[String(row._id)] = Number(row.count ?? 0);
  return output;
}

/** Keeps the imported `userSchema` in play for future invite flows. */
export const inviteSchema = userSchema;
