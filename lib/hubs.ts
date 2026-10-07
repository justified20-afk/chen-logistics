import "server-only";
import { getDb } from "@/lib/mongodb";
import { oid, toDomain, toDomainList } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { fieldErrors } from "@/lib/schemas/common";
import { hubOperationSchema } from "@/lib/schemas/dispatch";
import { changeShipmentStatus, writeTrackingEvent } from "@/lib/shipments";
import { createException } from "@/lib/exceptions";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import type { ActorContext } from "@/lib/actions/context";
import type { Hub, HubOperation, Shipment, ShipmentStatus } from "@/types/domain";

export interface HubWorkload {
  hub: Hub;
  /** Shipments whose current leg starts or ends at this hub and is still open. */
  active: number;
  awaitingPickup: number;
  inTransit: number;
  outForDelivery: number;
  delayed: number;
}

export async function listHubWorkload(): Promise<HubWorkload[]> {
  const db = await getDb();
  const [hubDocs, groups] = await Promise.all([
    db.collection("hubs").find({}).sort({ name: 1 }).toArray(),
    db
      .collection("shipments")
      .aggregate([
        {
          $match: {
            status: { $nin: ["delivered", "returned", "cancelled"] },
          },
        },
        {
          $group: {
            _id: {
              hub: { $ifNull: ["$destinationHubId", "$originHubId"] },
              status: "$status",
              delayed: { $cond: [{ $ne: ["$delayedReason", null] }, 1, 0] },
            },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),
  ]);

  const byHub = new Map<string, { active: number; awaiting: number; transit: number; out: number; delayed: number }>();
  for (const row of groups) {
    const key = String((row._id as { hub?: unknown })?.hub ?? "");
    const status = String((row._id as { status?: unknown })?.status ?? "");
    const delayed = Number((row._id as { delayed?: number })?.delayed ?? 0);
    const entry = byHub.get(key) ?? { active: 0, awaiting: 0, transit: 0, out: 0, delayed: 0 };
    const count = Number(row.count ?? 0);
    entry.active += count;
    if (["booked", "awaiting_pickup", "picked_up", "at_origin_hub"].includes(status)) entry.awaiting += count;
    if (["in_transit", "at_destination_hub"].includes(status)) entry.transit += count;
    if (["out_for_delivery", "delivery_attempted"].includes(status)) entry.out += count;
    entry.delayed += delayed;
    byHub.set(key, entry);
  }

  const hubs = toDomainList<Hub>(hubDocs);
  return hubs.map((hub) => {
    const entry = byHub.get(hub.id);
    return {
      hub,
      active: entry?.active ?? 0,
      awaitingPickup: entry?.awaiting ?? 0,
      inTransit: entry?.transit ?? 0,
      outForDelivery: entry?.out ?? 0,
      delayed: entry?.delayed ?? 0,
    };
  });
}

export interface HubOperationFilter {
  hubId?: string;
  operation?: string;
  q?: string;
  limit?: number;
}

export async function listHubOperations(filter: HubOperationFilter): Promise<HubOperation[]> {
  const db = await getDb();
  const query: Record<string, unknown> = {};
  if (filter.hubId) query.hubId = filter.hubId;
  if (filter.operation) query.operation = filter.operation;
  if (filter.q) {
    const escaped = filter.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [{ trackingNumber: regex }, { note: regex }, { actorName: regex }];
  }
  const docs = await db
    .collection("hubOperations")
    .find(query as never)
    .sort({ createdAt: -1 })
    .limit(Math.min(200, filter.limit ?? 50))
    .toArray();
  return toDomainList<HubOperation>(docs);
}

interface MovePlan {
  hubRole: "origin" | "destination";
  from: ShipmentStatus[];
  to: ShipmentStatus;
}

const MOVES: Record<string, MovePlan[]> = {
  received: [
    { hubRole: "origin", from: ["picked_up"], to: "at_origin_hub" },
    { hubRole: "destination", from: ["in_transit"], to: "at_destination_hub" },
  ],
  handed_over: [
    { hubRole: "origin", from: ["at_origin_hub"], to: "in_transit" },
    { hubRole: "destination", from: ["at_destination_hub"], to: "out_for_delivery" },
  ],
};

/**
 * Records a hub scan. Receive and hand-over scans advance the shipment through
 * its state machine; sorting, staging and holds are logged as history.
 */
export async function recordHubOperation(
  raw: unknown,
  context: ActorContext,
): Promise<ActionResult<{ id: string; operation: string }>> {
  const parsed = hubOperationSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("Check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  }
  const { trackingNumber, operation, hubId, note } = parsed.data;
  const db = await getDb();

  const shipmentDoc = await db
    .collection("shipments")
    .findOne({ trackingNumber: trackingNumber.trim().toUpperCase() } as never);
  if (!shipmentDoc) return fail("No shipment has that tracking number.", {
    fieldErrors: { trackingNumber: ["Unknown tracking number"] },
  });

  const shipment = toDomain<Shipment>(shipmentDoc);
  const hubDoc = await db.collection("hubs").findOne({ _id: oid(hubId) } as never);
  if (!hubDoc) return fail("That hub no longer exists.");
  const hubName = (hubDoc as { name?: string }).name ?? "hub";

  if (shipment.status === "draft") {
    return fail("A draft shipment has not been booked yet and cannot be scanned.");
  }
  if (hubId !== shipment.originHubId && hubId !== shipment.destinationHubId) {
    return fail(
      `${shipment.trackingNumber} is routed ${shipment.originHubName ?? "origin"} → ${shipment.destinationHubName ?? "destination"} and is not expected at ${hubName}.`,
    );
  }

  const plans = MOVES[operation] ?? [];
  const hubRole: "origin" | "destination" =
    hubId === shipment.destinationHubId ? "destination" : "origin";
  const plan = plans.find((entry) => entry.hubRole === hubRole);

  let moved = false;
  if (plan) {
    if (!plan.from.includes(shipment.status)) {
      return fail(
        `Cannot record “${operation}” at ${hubName}: the shipment is currently ${shipment.status.replace("_", " ")}. Expected ${plan.from.join(" or ").replace(/_/g, " ")}.`,
      );
    }

    const result = await changeShipmentStatus(
      {
        shipmentId: shipment.id,
        to: plan.to,
        expectedVersion: shipment.version,
        reason: `Hub ${operation} at ${hubName}`,
        hubId,
        location: hubName,
      },
      context,
    );
    if (!result.ok) return fail(result.error);
    moved = true;
  }

  const now = new Date();
  const inserted = await db.collection("hubOperations").insertOne({
    hubId,
    shipmentId: shipment.id,
    trackingNumber: shipment.trackingNumber,
    operation,
    previousStatus: shipment.status,
    newStatus: moved ? (plan?.to ?? shipment.status) : shipment.status,
    note,
    actorId: context.user.id,
    actorName: context.user.name,
    createdAt: now,
  } as never);

  await writeTrackingEvent({
    shipmentId: shipment.id,
    trackingNumber: shipment.trackingNumber,
    type: "hub_operation",
    previousStatus: shipment.status,
    newStatus: moved ? plan?.to : undefined,
    label: `${operation.replace(/^./, (char) => char.toUpperCase())} at ${hubName}`,
    location: hubName,
    hubId,
    actorId: context.user.id,
    actorName: context.user.name,
    note,
  });

  await recordAudit({
    actorId: context.user.id,
    actorName: context.user.name,
    actorRole: context.user.role,
    action: `hub.${operation}`,
    entityType: "shipment",
    entityId: shipment.id,
    entityLabel: shipment.trackingNumber,
    before: { status: shipment.status },
    after: { status: moved ? plan?.to : shipment.status, hub: hubName, note },
    ip: context.ip,
    userAgent: context.userAgent,
  });

  // Damaged and missing scans raise an exception immediately — a floor problem
  // must not depend on someone remembering to report it.
  if (operation === "damaged" || operation === "missing") {
    await createException(
      {
        type: operation === "damaged" ? "damaged" : "lost",
        severity: operation === "damaged" ? "high" : "critical",
        title:
          operation === "damaged"
            ? `Damage recorded at ${hubName}`
            : `Shipment missing at ${hubName}`,
        description:
          note ??
          `${operation.replace(/^./, (char) => char.toUpperCase())} recorded at ${hubName} during floor scanning.`,
        shipmentId: shipment.id,
        hubId,
      },
      context,
    );
  }

  return ok({ id: inserted.insertedId.toString(), operation });
}

export async function getHub(id: string): Promise<Hub | null> {
  const _id = oid(id);
  if (!_id) return null;
  const db = await getDb();
  const doc = await db.collection("hubs").findOne({ _id } as never);
  return doc ? toDomain<Hub>(doc) : null;
}
