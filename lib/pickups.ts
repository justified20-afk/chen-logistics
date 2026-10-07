import "server-only";
import { getDb } from "@/lib/mongodb";
import { oid, toDomain, toDomainList } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { fieldErrors } from "@/lib/schemas/common";
import { canPickupTransition } from "@/lib/transitions";
import { writeTrackingEvent, changeShipmentStatus } from "@/lib/shipments";
import {
  fail,
  ok,
  CONFLICT,
  NOT_FOUND,
  type ActionResult,
} from "@/lib/actions/result";
import type { ActorContext } from "@/lib/actions/context";
import type { SessionUser } from "@/lib/session";
import { z } from "zod";
import type { Pickup, PickupStatus } from "@/types/domain";

const COLLECTION = "pickups";

export interface PickupListFilter {
  q?: string;
  status?: string;
  hubId?: string;
  driverId?: string;
  from?: string;
  to?: string;
  sort?: string;
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export const pickupFilterSchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.string().optional(),
  hubId: z.string().optional(),
  driverId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.string().optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});
export type PickupFilterInput = z.infer<typeof pickupFilterSchema>;

const SORTABLE: Record<string, string> = {
  reference: "reference",
  scheduledFor: "scheduledFor",
  status: "status",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

function buildFilter(filter: PickupListFilter, user: SessionUser) {
  const query: Record<string, unknown> = {};
  if (user.role === "driver" && user.driverId) query.driverId = user.driverId;
  if (user.role === "warehouse" && user.hubId) query.hubId = user.hubId;

  if (filter.q) {
    const escaped = filter.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [
      { reference: regex },
      { trackingNumber: regex },
      { "address.name": regex },
      { "address.city": regex },
      { driverName: regex },
    ];
  }
  if (filter.status) {
    const list = filter.status.split(",").map((entry) => entry.trim()).filter(Boolean);
    if (list.length) query.status = { $in: list };
  }
  if (filter.hubId) query.hubId = filter.hubId;
  if (filter.driverId) query.driverId = filter.driverId;
  if (filter.from || filter.to) {
    const scheduledFor: Record<string, Date> = {};
    if (filter.from) scheduledFor.$gte = new Date(filter.from);
    if (filter.to) scheduledFor.$lte = new Date(`${filter.to}T23:59:59`);
    query.scheduledFor = scheduledFor;
  }
  return query;
}

export async function listPickups(
  filter: PickupListFilter,
  user: SessionUser,
): Promise<{ rows: Pickup[]; total: number; page: number; pageSize: number }> {
  const db = await getDb();
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filter.pageSize ?? 20));
  const query = buildFilter(filter, user);
  const sortKey = SORTABLE[filter.sort ?? ""] ?? "scheduledFor";
  const direction = filter.dir === "asc" ? 1 : -1;

  const [total, docs] = await Promise.all([
    db.collection(COLLECTION).countDocuments(query as never),
    db
      .collection(COLLECTION)
      .find(query as never)
      .sort({ [sortKey]: direction } as never)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
  ]);

  return { rows: toDomainList<Pickup>(docs), total, page, pageSize };
}

export async function getPickup(id: string): Promise<Pickup | null> {
  const _id = oid(id);
  if (!_id) return null;
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ _id } as never);
  return doc ? toDomain<Pickup>(doc) : null;
}

const pickupActionSchema = z
  .object({
    pickupId: z.string().min(1),
    expectedVersion: z.coerce.number().int(),
    /** Assignment fields — used on their own or alongside a status move. */
    driverId: z.string().optional(),
    vehicleId: z.string().optional(),
    status: z.enum([
      "scheduled",
      "driver_assigned",
      "en_route",
      "arrived",
      "picked_up",
      "failed",
      "cancelled",
    ]).optional(),
    failureReason: z.string().optional(),
    failureNote: z.string().optional(),
  })
  .refine((input) => input.status || input.driverId !== undefined || input.vehicleId !== undefined, {
    message: "Choose an assignment or a status change",
  });

export async function updatePickup(
  raw: unknown,
  context: ActorContext,
): Promise<ActionResult<{ id: string; status: string; version: number }>> {
  const parsed = pickupActionSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("Check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  }
  const { pickupId, expectedVersion, driverId, vehicleId, status, failureReason, failureNote } =
    parsed.data;

  const _id = oid(pickupId);
  if (!_id) return fail(NOT_FOUND);

  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ _id } as never);
  if (!doc) return fail(NOT_FOUND);
  const current = toDomain<Pickup>(doc);

  if (current.version !== expectedVersion) {
    return fail(CONFLICT, { conflict: true, currentVersion: current.version });
  }

  const $set: Record<string, unknown> = { updatedAt: new Date() };
  let assigned = false;

  if (driverId !== undefined) {
    if (driverId) {
      const driver = await db.collection("drivers").findOne({ _id: oid(driverId) } as never);
      if (!driver) return fail("That driver no longer exists.");
      const driverDoc = driver as { name?: string; status?: string };
      if (driverDoc.status === "suspended" || driverDoc.status === "inactive") {
        return fail(`${driverDoc.name ?? "That driver"} cannot take jobs (${driverDoc.status}).`);
      }
      $set.driverId = driverId;
      $set.driverName = driverDoc.name;
      assigned = true;
      if (!current.vehicleId && driver.vehicleId) {
        const vehicle = await db.collection("vehicles").findOne({ _id: oid(String(driver.vehicleId)) } as never);
        if (vehicle) {
          $set.vehicleId = String(vehicle._id);
          $set.vehicleRegistration = (vehicle as { registrationNumber?: string }).registrationNumber;
        }
      }
    } else {
      $set.driverId = null;
      $set.driverName = null;
    }
  }
  if (vehicleId !== undefined) {
    $set.vehicleId = vehicleId || null;
    $set.vehicleRegistration = vehicleId ? undefined : null;
    if (vehicleId) {
      const vehicle = await db.collection("vehicles").findOne({ _id: oid(vehicleId) } as never);
      if (!vehicle) return fail("That vehicle no longer exists.");
      $set.vehicleRegistration = (vehicle as { registrationNumber?: string }).registrationNumber;
    }
    assigned = true;
  }

  let nextStatus: PickupStatus = current.status;
  if (status) {
    if (!canPickupTransition(current.status, status)) {
      return fail(
        `A pickup that is ${current.status.replace("_", " ")} cannot move to ${status.replace("_", " ")}.`,
      );
    }
    if (status === "failed") {
      if (!failureReason) return fail("A failed pickup needs a reason.");
      $set.failureReason = failureReason;
      $set.failureNote = failureNote;
    }
    if (status === "driver_assigned" && !($set.driverId ?? current.driverId)) {
      return fail("Assign a driver before marking the pickup driver_assigned.");
    }
    if (status === "picked_up") {
      $set.completedAt = new Date();
      $set.startedAt = $set.startedAt ?? current.startedAt ?? new Date();
    }
    if (status === "en_route" && !current.startedAt) $set.startedAt = new Date();
    if (status === "cancelled") {
      $set.completedAt = new Date();
    }
    if (status === "failed" || status === "cancelled") {
      // nothing else — shipment stays put for an operator to decide
    }
    $set.status = status;
    nextStatus = status;
  } else if (assigned && current.status === "scheduled") {
    $set.status = "driver_assigned";
    nextStatus = "driver_assigned";
  }

  const updated = await db
    .collection(COLLECTION)
    .updateOne({ _id, version: expectedVersion } as never, {
      $set: $set as never,
      $inc: { version: 1 },
    } as never);

  if (updated.matchedCount === 0) {
    return fail(CONFLICT, { conflict: true, currentVersion: expectedVersion });
  }

  // Completing a pickup advances the linked shipment through its own state
  // machine — the two records must never disagree.
  if (nextStatus === "picked_up" && current.shipmentId) {
    const shipmentDoc = await db
      .collection("shipments")
      .findOne({ _id: oid(current.shipmentId) } as never);
    if (shipmentDoc) {
      const shipmentVersion = Number((shipmentDoc as { version?: number }).version ?? 0);
      const shipmentStatus = (shipmentDoc as { status?: string }).status;
      if (shipmentStatus === "awaiting_pickup") {
        const moved = await changeShipmentStatus(
          {
            shipmentId: current.shipmentId,
            to: "picked_up",
            expectedVersion: shipmentVersion,
            reason: `Pickup ${current.reference} completed`,
            location: current.address?.city,
          },
          context,
        );
        if (moved.ok) {
          await writeTrackingEvent({
            shipmentId: current.shipmentId,
            trackingNumber: current.trackingNumber,
            type: "pickup",
            label: `Collected from ${current.address?.city ?? "the pickup address"}`,
            location: current.address?.city,
            actorId: context.user.id,
            actorName: context.user.name,
            note: `Pickup ${current.reference}`,
          });
        }
      }
    }
  }

  await recordAudit({
    actorId: context.user.id,
    actorName: context.user.name,
    actorRole: context.user.role,
    action: assigned && !status ? "pickup.assigned" : "pickup.updated",
    entityType: "pickup",
    entityId: pickupId,
    entityLabel: `${current.reference} · ${current.trackingNumber}`,
    before: { status: current.status, driverId: current.driverId, vehicleId: current.vehicleId },
    after: { status: nextStatus, driverId: $set.driverId ?? current.driverId, vehicleId: $set.vehicleId ?? current.vehicleId },
    ip: context.ip,
    userAgent: context.userAgent,
  });

  if ($set.driverId && $set.driverId !== current.driverId) {
    const { createNotification } = await import("@/lib/notifications");
    await createNotification({
      type: "driver_assigned",
      severity: "low",
      title: `Pickup ${current.reference} assigned to you`,
      body: `Scheduled ${new Date(current.scheduledFor).toLocaleString("en-GB")} in ${current.address?.city ?? "the pickup city"}.`,
      actionHref: "/pickups",
      actionLabel: "Open pickups",
      userId: String($set.driverId),
      dedupeKey: `pickup:${pickupId}:${String($set.driverId)}`,
    });
  }

  return ok({ id: pickupId, status: nextStatus, version: current.version + 1 });
}
