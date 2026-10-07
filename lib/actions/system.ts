"use server";

import { revalidatePath } from "next/cache";
import { requirePermissionActor } from "@/lib/actions/context";
import { type ActionResult } from "@/lib/actions/result";
import { updateSettings, updateUser } from "@/lib/system";

export async function updateSettingsAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const gate = await requirePermissionActor("settings.manage");
  if (!gate.ok) return gate.error;

  const result = await updateSettings(raw, gate.context);
  if (result.ok) {
    revalidatePath("/settings", "layout");
    revalidatePath("/dashboard", "layout");
  }
  return result;
}

export async function updateUserAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const gate = await requirePermissionActor("users.manage");
  if (!gate.ok) return gate.error;

  const result = await updateUser(raw, gate.context);
  if (result.ok) {
    revalidatePath("/settings/users", "layout");
    revalidatePath("/settings/audit-log", "layout");
  }
  return result;
}
