import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { oid, toDomain } from "@/lib/db";
import type { Permission, RoleKey } from "@/types/permissions";
import { permissionsFor } from "@/lib/permissions";
import type { UserRecord } from "@/types/domain";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: RoleKey;
  permissions: Permission[];
  hubId?: string;
  driverId?: string;
  customerId?: string;
  status: string;
}

/**
 * Resolves the authenticated operator against the `users` collection on every
 * request. The session carries only the user id — role and permissions are read
 * server-side so a stale or tampered cookie cannot grant access.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const db = await getDb();
  const users = db.collection("users");
  const _id = oid(userId);
  const raw =
    (await users.findOne(_id ? { _id } : ({ email: session.user.email ?? "" } as never))) ??
    (await users.findOne({ email: session.user.email ?? "" } as never));
  if (!raw) return null;

  const user = toDomain<UserRecord>(raw);
  if (user.status !== "active") return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: permissionsFor(user.role),
    hubId: user.hubId,
    driverId: user.driverId,
    customerId: user.customerId,
    status: user.status,
  };
});

/** Page guard: redirects anonymous visitors to sign-in. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/signin");
  return user;
}

/** Page guard: redirects to the dashboard when the role lacks the permission. */
export async function requirePermission(
  permission: Permission,
  options: { redirectTo?: string } = {},
): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.permissions.includes(permission)) {
    redirect(options.redirectTo ?? "/denied");
  }
  return user;
}

export async function currentUserCan(permission: Permission): Promise<boolean> {
  const user = await getSessionUser();
  return Boolean(user?.permissions.includes(permission));
}
