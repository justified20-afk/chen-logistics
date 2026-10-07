"use server";

import { revalidatePath } from "next/cache";
import { requirePermissionActor } from "@/lib/actions/context";
import { type ActionResult } from "@/lib/actions/result";
import { recordHubOperation } from "@/lib/hubs";

export async function recordHubOperationAction(
  raw: unknown,
): Promise<ActionResult<{ id: string; operation: string }>> {
  const gate = await requirePermissionActor("hubs.manage");
  if (!gate.ok) return gate.error;

  const result = await recordHubOperation(raw, gate.context);
  if (result.ok) {
    revalidatePath("/hubs", "layout");
    revalidatePath("/dashboard", "layout");
    revalidatePath("/shipments", "layout");
  }
  return result;
}
