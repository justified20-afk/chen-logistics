"use server";

import { revalidatePath } from "next/cache";
import { actorContext, requirePermissionActor } from "@/lib/actions/context";
import { fail, ok, UNAUTHORIZED, type ActionResult } from "@/lib/actions/result";
import {
  addShipmentNote,
  changeShipmentStatus,
  correctShipmentStatus,
  createShipment,
  updateShipment,
} from "@/lib/shipments";
import { getDb } from "@/lib/mongodb";
import { oid, toDomain } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { writeTrackingEvent } from "@/lib/shipments";
import type { Shipment } from "@/types/domain";

function refreshed(paths: string[] = ["/shipments", "/dashboard"]) {
  for (const path of paths) revalidatePath(path, "layout");
}

export async function createShipmentAction(raw: unknown): Promise<ActionResult<{ id: string; trackingNumber: string }>> {
  const context = await actorContext();
  if (!context) return fail(UNAUTHORIZED);
  const { user } = context;
  if (!user.permissions.includes("shipments.create") && user.role !== "customer") {
    return fail(UNAUTHORIZED);
  }
  if (user.role === "customer" && !user.customerId) {
    return fail("Your account is not linked to a customer record yet.");
  }
  const result = await createShipment(raw, context);
  if (result.ok) refreshed([`/shipments/${result.data.id}`, "/shipments", "/dashboard", "/customer/shipments"]);
  return result;
}

export async function updateShipmentAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const gate = await requirePermissionActor("shipments.edit");
  if (!gate.ok) return gate.error;

  const result = await updateShipment(raw, gate.context);
  if (result.ok) refreshed([`/shipments/${result.data.id}`, "/shipments"]);
  return result;
}

export async function changeShipmentStatusAction(
  raw: unknown,
): Promise<ActionResult<{ id: string; status: string; version: number }>> {
  const gate = await requirePermissionActor("shipments.status");
  if (!gate.ok) return gate.error;

  const result = await changeShipmentStatus(raw, gate.context);
  if (result.ok) refreshed([`/shipments/${result.data.id}`, "/shipments", "/dashboard", "/deliveries"]);
  return result;
}

export async function correctShipmentStatusAction(
  raw: unknown,
): Promise<ActionResult<{ id: string; status: string; version: number }>> {
  const gate = await requirePermissionActor("shipments.status");
  if (!gate.ok) return gate.error;
  if (!["administrator", "operations_manager"].includes(gate.context.user.role)) {
    return fail("Only administrators and operations managers may correct a status.");
  }

  const result = await correctShipmentStatus(raw, gate.context);
  if (result.ok) refreshed([`/shipments/${result.data.id}`, "/shipments", "/settings/audit-log"]);
  return result;
}

export async function addShipmentNoteAction(raw: unknown): Promise<ActionResult> {
  const gate = await requirePermissionActor("shipments.view");
  if (!gate.ok) return gate.error;

  const result = await addShipmentNote(raw, gate.context);
  if (result.ok) {
    const shipmentId = (raw as { shipmentId?: string })?.shipmentId;
    if (shipmentId) refreshed([`/shipments/${shipmentId}`]);
  }
  return result;
}

export interface BulkShipmentResult {
  succeeded: number;
  failed: number;
  skipped: number;
  reasons: Record<string, number>;
}

export async function bulkShipmentPriorityAction(
  raw: unknown,
): Promise<ActionResult<BulkShipmentResult>> {
  const gate = await requirePermissionActor("shipments.edit");
  if (!gate.ok) return gate.error;

  const { z } = await import("zod");
  const schema = z.object({
    shipmentIds: z.array(z.string().min(1)).min(1),
    priority: z.enum(["normal", "high", "urgent"]),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fail("Select at least one shipment and a priority.");

  const db = await getDb();
  const summary: BulkShipmentResult = { succeeded: 0, failed: 0, skipped: 0, reasons: {} };
  const bump = (reason: string) => {
    summary.reasons[reason] = (summary.reasons[reason] ?? 0) + 1;
  };

  for (const id of parsed.data.shipmentIds) {
    const doc = await db.collection("shipments").findOne({ _id: oid(id) } as never);
    if (!doc) {
      summary.skipped += 1;
      bump("No longer exists");
      continue;
    }
    const shipment = toDomain<Shipment>(doc);
    if (["delivered", "returned", "cancelled"].includes(shipment.status)) {
      summary.skipped += 1;
      bump(`Final state (${shipment.status})`);
      continue;
    }
    if (shipment.priority === parsed.data.priority) {
      summary.skipped += 1;
      bump("Already that priority");
      continue;
    }

    await db.collection("shipments").updateOne(
      { _id: oid(id) } as never,
      { $set: { priority: parsed.data.priority, updatedAt: new Date() }, $inc: { version: 1 } } as never,
    );
    await writeTrackingEvent({
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
      type: "note",
      label: `Priority changed to ${parsed.data.priority}`,
      actorId: gate.context.user.id,
      actorName: gate.context.user.name,
    });
    summary.succeeded += 1;
  }

  await recordAudit({
    actorId: gate.context.user.id,
    actorName: gate.context.user.name,
    actorRole: gate.context.user.role,
    action: "shipment.bulk_priority",
    entityType: "shipment",
    entityId: "bulk",
    entityLabel: `${summary.succeeded} shipments`,
    after: { priority: parsed.data.priority, ...summary },
  });

  refreshed(["/shipments"]);
  return ok(summary);
}

export async function bulkShipmentHubAction(
  raw: unknown,
): Promise<ActionResult<BulkShipmentResult>> {
  const gate = await requirePermissionActor("shipments.edit");
  if (!gate.ok) return gate.error;

  const { z } = await import("zod");
  const schema = z.object({
    shipmentIds: z.array(z.string().min(1)).min(1),
    hubId: z.string().min(1),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fail("Select at least one shipment and a hub.");

  const db = await getDb();
  const hub = await db.collection("hubs").findOne({ _id: oid(parsed.data.hubId) } as never);
  if (!hub) return fail("That hub no longer exists.");
  const hubDoc = toDomain<{ id: string; name: string }>(hub);

  const summary: BulkShipmentResult = { succeeded: 0, failed: 0, skipped: 0, reasons: {} };
  const bump = (reason: string) => {
    summary.reasons[reason] = (summary.reasons[reason] ?? 0) + 1;
  };

  for (const id of parsed.data.shipmentIds) {
    const doc = await db.collection("shipments").findOne({ _id: oid(id) } as never);
    if (!doc) {
      summary.skipped += 1;
      bump("No longer exists");
      continue;
    }
    const shipment = toDomain<Shipment>(doc);
    if (shipment.originHubId === hubDoc.id && shipment.destinationHubId === hubDoc.id) {
      summary.skipped += 1;
      bump("Already assigned to this hub");
      continue;
    }
    if (["in_transit", "delivered", "returned", "cancelled"].includes(shipment.status)) {
      summary.skipped += 1;
      bump(`Cannot re-hub a ${shipment.status.replace(/_/g, " ")} shipment`);
      continue;
    }

    const isOrigin = shipment.status === "booked" || shipment.status === "awaiting_pickup";
    await db.collection("shipments").updateOne(
      { _id: oid(id) } as never,
      {
        $set: isOrigin
          ? { originHubId: hubDoc.id, originHubName: hubDoc.name, updatedAt: new Date() }
          : { destinationHubId: hubDoc.id, destinationHubName: hubDoc.name, updatedAt: new Date() },
        $inc: { version: 1 },
      } as never,
    );
    await writeTrackingEvent({
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
      type: "hub_operation",
      label: `${isOrigin ? "Origin" : "Destination"} hub set to ${hubDoc.name}`,
      hubId: hubDoc.id,
      location: hubDoc.name,
      actorId: gate.context.user.id,
      actorName: gate.context.user.name,
    });
    summary.succeeded += 1;
  }

  await recordAudit({
    actorId: gate.context.user.id,
    actorName: gate.context.user.name,
    actorRole: gate.context.user.role,
    action: "shipment.bulk_hub",
    entityType: "shipment",
    entityId: "bulk",
    entityLabel: hubDoc.name,
    after: { ...summary },
  });

  refreshed(["/shipments"]);
  return ok(summary);
}

