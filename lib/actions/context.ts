import "server-only";
import { headers } from "next/headers";
import { getSessionUser, type SessionUser } from "@/lib/session";
import { UNAUTHORIZED, fail, type ActionResult } from "@/lib/actions/result";

export interface ActorContext {
  user: SessionUser;
  ip?: string;
  userAgent?: string;
}

export async function actorContext(): Promise<ActorContext | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const store = await headers();
  return {
    user,
    ip: store.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: store.get("user-agent") ?? undefined,
  };
}

export async function requireActor(): Promise<
  { ok: true; context: ActorContext } | { ok: false; error: ActionResult<never> }
> {
  const context = await actorContext();
  if (!context) return { ok: false, error: fail("You must be signed in to do that.") };
  return { ok: true, context };
}

export async function requirePermissionActor(
  permission: Parameters<SessionUser["permissions"]["includes"]>[0],
): Promise<
  { ok: true; context: ActorContext } | { ok: false; error: ActionResult<never> }
> {
  const context = await actorContext();
  if (!context) return { ok: false, error: fail(UNAUTHORIZED) };
  if (!context.user.permissions.includes(permission)) {
    return { ok: false, error: fail(UNAUTHORIZED) };
  }
  return { ok: true, context };
}
