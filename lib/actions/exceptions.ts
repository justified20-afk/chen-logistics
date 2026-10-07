"use server";

import { revalidatePath } from "next/cache";
import { requirePermissionActor } from "@/lib/actions/context";
import { type ActionResult, fail } from "@/lib/actions/result";
import { createException, updateException } from "@/lib/exceptions";

function refreshed(paths: string[] = ["/exceptions", "/dashboard"]) {
  for (const path of paths) revalidatePath(path, "layout");
}

export async function createExceptionAction(
  raw: unknown,
): Promise<ActionResult<{ id: string; reference: string }>> {
  const gate = await requirePermissionActor("exceptions.manage");
  if (!gate.ok) return gate.error;

  const payload = (raw ?? {}) as Record<string, unknown>;

  // Operators link by tracking number; resolve it to the shipment id here so
  // the schema stays a plain id contract.
  if (!payload.shipmentId && typeof payload.trackingNumber === "string" && payload.trackingNumber.trim()) {
    const { getDb } = await import("@/lib/mongodb");
    const db = await getDb();
    const shipment = await db
      .collection("shipments")
      .findOne({ trackingNumber: payload.trackingNumber.trim().toUpperCase() } as never);
    if (!shipment) {
      return fail("No shipment has that tracking number.", {
        fieldErrors: { trackingNumber: ["Unknown tracking number"] },
      });
    }
    payload.shipmentId = String(shipment._id);
  }

  const result = await createException(payload, gate.context);
  if (result.ok) refreshed();
  return result;
}

export async function updateExceptionAction(
  raw: unknown,
): Promise<ActionResult<{ id: string; status: string; version: number }>> {
  const gate = await requirePermissionActor("exceptions.manage");
  if (!gate.ok) return gate.error;

  const result = await updateException(raw, gate.context);
  if (result.ok) refreshed([`/exceptions`, "/exceptions", "/dashboard"]);
  return result;
}

/** Owner picker helper: users who can be assigned exception ownership. */
export async function listExceptionOwners(): Promise<{ id: string; name: string }[]> {
  const gate = await requirePermissionActor("exceptions.view");
  if (!gate.ok) return [];

  const { getDb } = await import("@/lib/mongodb");
  const db = await getDb();
  const docs = await db
    .collection("users")
    .find({ role: { $in: ["administrator", "operations_manager", "dispatcher", "warehouse", "support"] } } as never)
    .project({ name: 1, email: 1 })
    .sort({ name: 1 })
    .limit(100)
    .toArray();
  return docs.map((doc) => ({
    id: String(doc._id),
    name: String(doc.name ?? doc.email ?? "Unknown"),
  }));
}
