"use server";

import { revalidatePath } from "next/cache";
import { requirePermissionActor } from "@/lib/actions/context";
import { type ActionResult } from "@/lib/actions/result";
import { updatePickup } from "@/lib/pickups";

function refreshed(paths: string[] = ["/pickups", "/dashboard"]) {
  for (const path of paths) revalidatePath(path, "layout");
}

export async function updatePickupAction(
  raw: unknown,
): Promise<ActionResult<{ id: string; status: string; version: number }>> {
  const gate = await requirePermissionActor("pickups.manage");
  if (!gate.ok) return gate.error;

  const result = await updatePickup(raw, gate.context);
  if (result.ok) refreshed();
  return result;
}
