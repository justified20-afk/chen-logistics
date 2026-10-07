import "server-only";
import { z } from "zod";
import { getDb } from "@/lib/mongodb";
import { oid, toDomain, toDomainList } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { fieldErrors } from "@/lib/schemas/common";
import {
  tripAssignmentSchema,
  tripCreateSchema,
  tripShipmentSelectionSchema,
  tripStatusSchema,
} from "@/lib/schemas/dispatch";
import { canTripTransition, TRIP_TRANSITIONS } from "@/lib/transitions";
import {
  fail,
  ok,
  CONFLICT,
  NOT_FOUND,
  type ActionResult,
} from "@/lib/actions/result";
import type { ActorContext } from "@/lib/actions/context";
import type { SessionUser } from "@/lib/session";
import type { Trip, TripShipment, TripStatus } from "@/types/domain";

const COLLECTION = "trips";

export const tripFilterSchema = z.object({
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
export type TripFilterInput = z.infer<typeof tripFilterSchema>;

export type TripListFilter = TripFilterInput;

const SORTABLE: Record<string, string> = {
  tripNumber: "tripNumber",
  date: "date",
  status: "status",
  createdAt: "createdAt",
  plannedDepartureAt: "plannedDepartureAt",
};

function buildFilter(filter: TripListFilter, user: SessionUser) {
  const query: Record<string, unknown> = {};
  const clauses: Record<string, unknown>[] = [];

  if (user.role === "driver" && user.driverId) query.driverId = user.driverId;
  if (user.role === "warehouse" && user.hubId) {
    clauses.push({ $or: [{ originHubId: user.hubId }, { destinationHubId: user.hubId }] });
  }

  if (filter.q) {
    const escaped = filter.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    clauses.push({
      $or: [
        { tripNumber: regex },
        { driverName: regex },
        { vehicleRegistration: regex },
        { originHubName: regex },
        { destinationHubName: regex },
      ],
    });
  }
  if (filter.status) {
    const list = filter.status.split(",").map((entry) => entry.trim()).filter(Boolean);
    if (list.length) query.status = { $in: list };
  }
  if (filter.hubId) {
    clauses.push({ $or: [{ originHubId: filter.hubId }, { destinationHubId: filter.hubId }] });
  }
  if (filter.driverId) query.driverId = filter.driverId;
  if (filter.from || filter.to) {
    const date: Record<string, Date | string> = {};
    if (filter.from) date.$gte = filter.from;
    if (filter.to) date.$lte = filter.to;
    query.date = date;
  }
  if (clauses.length > 1) query.$and = clauses;
  else if (clauses.length === 1) Object.assign(query, clauses[0]);
  return query;
}

export async function listTrips(
  filter: TripListFilter,
  user: SessionUser,
): Promise<{ rows: Trip[]; total: number; page: number; pageSize: number }> {
  const db = await getDb();
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filter.pageSize ?? 20));
  const query = buildFilter(filter, user);
  const sortKey = SORTABLE[filter.sort ?? ""] ?? "date";
  const direction = filter.dir === "asc" ? 1 : -1;

  const [total, docs] = await Promise.all([
    db.collection(COLLECTION).countDocuments(query as never),
    db
      .collection(COLLECTION)
      .find(query as never)
      .sort({ [sortKey]: direction, tripNumber: 1 } as never)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
  ]);

  return { rows: toDomainList<Trip>(docs), total, page, pageSize };
}

export async function getTrip(id: string): Promise<Trip | null> {
  const _id = oid(id);
  if (!_id) return null;
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ _id } as never);
  return doc ? toDomain<Trip>(doc) : null;
}

async function nextTripNumber(db: Awaited<ReturnType<typeof getDb>>): Promise<string> {
  const docs = await db
    .collection(COLLECTION)
    .find({ tripNumber: /^TRIP-\d+$/ } as never)
    .project({ tripNumber: 1 })
    .sort({ tripNumber: -1 })
    .limit(1)
    .toArray();
  const current = docs[0]
    ? Number(String((docs[0] as { tripNumber: string }).tripNumber).replace("TRIP-", ""))
    : 1000;
  return `TRIP-${(Number.isFinite(current) ? current : 1000) + 1}`;
}

async function hubLabel(db: Awaited<ReturnType<typeof getDb>>, hubId?: string) {
  if (!hubId) return undefined;
  const hub = await db.collection("hubs").findOne({ _id: oid(hubId) } as never);
  return hub ? (hub as { name?: string }).name : undefined;
}

/** Recomputes totals and capacity flags from the shipment manifest and vehicle. */
async function recomputeTrip(
  db: Awaited<ReturnType<typeof getDb>>,
  tripId: string,
): Promise<Trip | null> {
  const doc = await db.collection(COLLECTION).findOne({ _id: oid(tripId) } as never);
  if (!doc) return null;
  const trip = toDomain<Trip>(doc);

  let capacityPackages = 0;
  let capacityWeightKg = 0;
  if (trip.vehicleId) {
    const vehicle = await db.collection("vehicles").findOne({ _id: oid(trip.vehicleId) } as never);
    if (vehicle) {
      capacityPackages = Number((vehicle as { capacityPackages?: number }).capacityPackages ?? 0);
      capacityWeightKg = Number((vehicle as { capacityWeightKg?: number }).capacityWeightKg ?? 0);
    }
  }

  const totalPackages = trip.shipments.reduce((sum, entry) => sum + (entry.packages || 0), 0);
  const totalWeightKg = Number(
    trip.shipments.reduce((sum, entry) => sum + (entry.weightKg || 0), 0).toFixed(1),
  );
  const overCapacity =
    capacityPackages > 0
      ? totalPackages > capacityPackages || totalWeightKg > capacityWeightKg
      : false;

  await db.collection(COLLECTION).updateOne(
    { _id: oid(tripId) } as never,
    {
      $set: {
        totalPackages,
        totalWeightKg,
        capacityPackages,
        capacityWeightKg,
        overCapacity,
        updatedAt: new Date(),
      } as never,
    } as never,
  );

  const updated = await db.collection(COLLECTION).findOne({ _id: oid(tripId) } as never);
  return updated ? toDomain<Trip>(updated) : null;
}

/** Keeps the trip's driver/vehicle denormalised onto every loaded shipment. */
async function syncTripToShipments(db: Awaited<ReturnType<typeof getDb>>, trip: Trip) {
  if (trip.shipments.length === 0) return;
  const ids = trip.shipments.map((entry) => oid(entry.shipmentId));
  const moving =
    trip.status === "dispatched" || trip.status === "in_transit" || trip.status === "arrived";

  await db.collection("shipments").updateMany(
    { _id: { $in: ids } } as never,
    {
      $set: {
        tripId: trip.id,
        tripNumber: trip.tripNumber,
        driverId: trip.driverId ?? null,
        driverName: trip.driverName ?? null,
        vehicleId: trip.vehicleId ?? null,
        vehicleRegistration: trip.vehicleRegistration ?? null,
        updatedAt: new Date(),
      } as never,
      $inc: { version: 1 },
    } as never,
  );
  if (moving) {
    // nothing else: hub scans drive the shipment lifecycle
  }
}

async function recordAssignment(
  db: Awaited<ReturnType<typeof getDb>>,
  input: {
    entityType: "trip" | "shipment" | "pickup";
    entityId: string;
    field: "driver" | "vehicle" | "trip";
    previousValue?: string;
    newValue?: string;
    reason?: string;
    context: ActorContext;
  },
) {
  await db.collection("assignmentHistory").insertOne({
    entityType: input.entityType,
    entityId: input.entityId,
    field: input.field,
    previousValue: input.previousValue,
    newValue: input.newValue,
    reason: input.reason,
    actorId: input.context.user.id,
    actorName: input.context.user.name,
    createdAt: new Date(),
  } as never);
}

export async function createTrip(
  raw: unknown,
  context: ActorContext,
): Promise<ActionResult<{ id: string; tripNumber: string }>> {
  const parsed = tripCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("Check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  }
  const input = parsed.data;
  const db = await getDb();

  const [origin, destination] = await Promise.all([
    db.collection("hubs").findOne({ _id: oid(input.originHubId) } as never),
    db.collection("hubs").findOne({ _id: oid(input.destinationHubId) } as never),
  ]);
  if (!origin || !destination) return fail("Choose valid hubs for both ends of the trip.");

  let driverName: string | undefined;
  let vehicleRegistration: string | undefined;
  if (input.driverId) {
    const driver = await db.collection("drivers").findOne({ _id: oid(input.driverId) } as never);
    if (!driver) return fail("That driver no longer exists.");
    driverName = (driver as { name?: string }).name;
  }
  if (input.vehicleId) {
    const vehicle = await db.collection("vehicles").findOne({ _id: oid(input.vehicleId) } as never);
    if (!vehicle) return fail("That vehicle no longer exists.");
    vehicleRegistration = (vehicle as { registrationNumber?: string }).registrationNumber;
  }

  const tripNumber = await nextTripNumber(db);
  const now = new Date();
  const status: TripStatus = input.driverId && input.vehicleId ? "assigned" : "planned";

  const result = await db.collection(COLLECTION).insertOne({
    tripNumber,
    date: input.date,
    originHubId: input.originHubId,
    originHubName: (origin as { name?: string }).name,
    destinationHubId: input.destinationHubId,
    destinationHubName: (destination as { name?: string }).name,
    driverId: input.driverId,
    driverName,
    vehicleId: input.vehicleId,
    vehicleRegistration,
    shipments: [],
    status,
    plannedDepartureAt: input.plannedDepartureAt ? new Date(input.plannedDepartureAt) : undefined,
    totalPackages: 0,
    totalWeightKg: 0,
    capacityPackages: 0,
    capacityWeightKg: 0,
    overCapacity: false,
    notes: input.notes,
    version: 1,
    createdAt: now,
    updatedAt: now,
  } as never);

  const id = result.insertedId.toString();
  const trip = await recomputeTrip(db, id);
  if (trip) await syncTripToShipments(db, trip);

  await recordAudit({
    actorId: context.user.id,
    actorName: context.user.name,
    actorRole: context.user.role,
    action: "trip.created",
    entityType: "trip",
    entityId: id,
    entityLabel: tripNumber,
    after: {
      origin: (origin as { name?: string }).name,
      destination: (destination as { name?: string }).name,
      date: input.date,
      status,
    },
    ip: context.ip,
    userAgent: context.userAgent,
  });

  return ok({ id, tripNumber });
}

export async function assignTrip(
  raw: unknown,
  context: ActorContext,
): Promise<ActionResult<{ id: string; version: number }>> {
  const parsed = tripAssignmentSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("Check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  }
  const { tripId, driverId, vehicleId, expectedVersion, reason } = parsed.data;
  const db = await getDb();

  const doc = await db.collection(COLLECTION).findOne({ _id: oid(tripId) } as never);
  if (!doc) return fail(NOT_FOUND);
  const trip = toDomain<Trip>(doc);
  if (trip.version !== expectedVersion) {
    return fail(CONFLICT, { conflict: true, currentVersion: trip.version });
  }
  if (["completed", "cancelled", "arrived"].includes(trip.status)) {
    return fail(`A ${trip.status.replace("_", " ")} trip can no longer be reassigned.`);
  }

  const $set: Record<string, unknown> = { updatedAt: new Date() };

  if (driverId !== undefined) {
    if (driverId) {
      const driver = await db.collection("drivers").findOne({ _id: oid(driverId) } as never);
      if (!driver) return fail("That driver no longer exists.");
      const driverDoc = driver as { name?: string; status?: string };
      if (["suspended", "inactive", "off_duty"].includes(driverDoc.status ?? "")) {
        return fail(`${driverDoc.name ?? "That driver"} is ${String(driverDoc.status).replace("_", " ")} and cannot take this trip.`);
      }
      $set.driverId = driverId;
      $set.driverName = driverDoc.name;
      if (trip.driverId && trip.driverId !== driverId) {
        await db.collection("drivers").updateOne(
          { _id: oid(trip.driverId) } as never,
          { $set: { activeTripId: null, status: "available" } } as never,
        );
      }
      await db.collection("drivers").updateOne(
        { _id: oid(driverId) } as never,
        { $set: { activeTripId: tripId, status: "assigned", updatedAt: new Date() } } as never,
      );
      if (driver.vehicleId && !($set.vehicleId ?? trip.vehicleId)) {
        const vehicle = await db
          .collection("vehicles")
          .findOne({ _id: oid(String(driver.vehicleId)) } as never);
        if (vehicle) {
          $set.vehicleId = String(vehicle._id);
          $set.vehicleRegistration = (vehicle as { registrationNumber?: string }).registrationNumber;
        }
      }
      if (trip.driverId !== driverId) {
        await recordAssignment(db, {
          entityType: "trip",
          entityId: tripId,
          field: "driver",
          previousValue: trip.driverName,
          newValue: String(driverDoc.name ?? ""),
          reason,
          context,
        });
      }
    } else {
      if (trip.driverId) {
        await db.collection("drivers").updateOne(
          { _id: oid(trip.driverId) } as never,
          { $set: { activeTripId: null, status: "available", updatedAt: new Date() } } as never,
        );
      }
      await recordAssignment(db, {
        entityType: "trip",
        entityId: tripId,
        field: "driver",
        previousValue: trip.driverName,
        newValue: undefined,
        reason,
        context,
      });
      $set.driverId = null;
      $set.driverName = null;
    }
  }

  if (vehicleId !== undefined) {
    if (vehicleId) {
      const vehicle = await db.collection("vehicles").findOne({ _id: oid(vehicleId) } as never);
      if (!vehicle) return fail("That vehicle no longer exists.");
      const vehicleStatus = (vehicle as { status?: string }).status;
      if (vehicleStatus === "maintenance" || vehicleStatus === "inactive") {
        return fail(`That vehicle is ${vehicleStatus} and cannot be dispatched.`);
      }
      $set.vehicleId = vehicleId;
      $set.vehicleRegistration = (vehicle as { registrationNumber?: string }).registrationNumber;
      await db.collection("vehicles").updateOne(
        { _id: oid(vehicleId) } as never,
        { $set: { driverId: $set.driverId ?? trip.driverId ?? null, status: "assigned", updatedAt: new Date() } } as never,
      );
      if (trip.vehicleId !== vehicleId) {
        await recordAssignment(db, {
          entityType: "trip",
          entityId: tripId,
          field: "vehicle",
          previousValue: trip.vehicleRegistration,
          newValue: (vehicle as { registrationNumber?: string }).registrationNumber,
          reason,
          context,
        });
      }
    } else {
      $set.vehicleId = null;
      $set.vehicleRegistration = null;
    }
  }

  const nextStatus: TripStatus =
    ($set.driverId ?? trip.driverId) && ($set.vehicleId ?? trip.vehicleId)
      ? trip.status === "planned" || trip.status === "draft"
        ? "assigned"
        : trip.status
      : trip.status === "assigned"
        ? "planned"
        : trip.status;
  $set.status = nextStatus;

  const updated = await db.collection(COLLECTION).findOneAndUpdate(
    { _id: oid(tripId), version: expectedVersion } as never,
    { $set: $set as never, $inc: { version: 1 } } as never,
    { returnDocument: "after" },
  );
  if (!updated) return fail(CONFLICT, { conflict: true, currentVersion: expectedVersion });

  const reloaded = toDomain<Trip>(updated);
  await recomputeTrip(db, tripId);
  const fresh = (await getTrip(tripId)) ?? reloaded;
  await syncTripToShipments(db, fresh);

  await recordAudit({
    actorId: context.user.id,
    actorName: context.user.name,
    actorRole: context.user.role,
    action: "trip.assigned",
    entityType: "trip",
    entityId: tripId,
    entityLabel: trip.tripNumber,
    before: { driverName: trip.driverName, vehicleRegistration: trip.vehicleRegistration },
    after: { driverName: $set.driverName, vehicleRegistration: $set.vehicleRegistration, reason },
    ip: context.ip,
    userAgent: context.userAgent,
  });

  if ($set.driverId && $set.driverId !== trip.driverId) {
    await createNotification({
      type: "driver_assigned",
      severity: "low",
      title: `You are assigned to ${trip.tripNumber}`,
      body: `${trip.originHubName ?? "Origin"} → ${trip.destinationHubName ?? "destination"} on ${trip.date}.`,
      actionHref: `/dispatch/${tripId}`,
      actionLabel: "Open trip",
      userId: String($set.driverId),
      dedupeKey: `trip-driver:${tripId}:${String($set.driverId)}`,
    });
  }

  return ok({ id: tripId, version: fresh.version });
}

const shipmentSelectionSchema = tripShipmentSelectionSchema.extend({
  mode: z.enum(["add", "remove"]).default("add"),
});

const LOADABLE_STATUSES = ["booked", "awaiting_pickup", "at_origin_hub"];

export async function setTripShipments(
  raw: unknown,
  context: ActorContext,
): Promise<ActionResult<{ id: string; loaded: number; version: number }>> {
  const parsed = shipmentSelectionSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("Check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  }
  const { tripId, shipmentIds, expectedVersion, mode } = parsed.data;
  const db = await getDb();

  const doc = await db.collection(COLLECTION).findOne({ _id: oid(tripId) } as never);
  if (!doc) return fail(NOT_FOUND);
  const trip = toDomain<Trip>(doc);
  if (trip.version !== expectedVersion) {
    return fail(CONFLICT, { conflict: true, currentVersion: trip.version });
  }
  if (["dispatched", "in_transit", "arrived", "completed", "cancelled"].includes(trip.status)) {
    return fail("The manifest is locked once a trip has left the hub.");
  }

  if (mode === "remove") {
    const removeSet = new Set(shipmentIds);
    const remaining = trip.shipments.filter((entry) => !removeSet.has(entry.shipmentId));
    await db.collection("shipments").updateMany(
      { _id: { $in: shipmentIds.map((id) => oid(id)) } } as never,
      {
        $set: { tripId: null, tripNumber: null, driverId: null, driverName: null, vehicleId: null, vehicleRegistration: null, updatedAt: new Date() } as never,
        $inc: { version: 1 },
      } as never,
    );
    await db.collection(COLLECTION).updateOne(
      { _id: oid(tripId) } as never,
      { $set: { shipments: remaining, updatedAt: new Date() } as never, $inc: { version: 1 } } as never,
    );
    const after = await recomputeTrip(db, tripId);
    if (after) await syncTripToShipments(db, after);
    await recordAudit({
      actorId: context.user.id,
      actorName: context.user.name,
      actorRole: context.user.role,
      action: "trip.manifest_updated",
      entityType: "trip",
      entityId: tripId,
      entityLabel: trip.tripNumber,
      before: { count: trip.shipments.length },
      after: { count: remaining.length, mode: "remove" },
      ip: context.ip,
      userAgent: context.userAgent,
    });
    return ok({ id: tripId, loaded: remaining.length, version: (after?.version ?? trip.version + 1) });
  }

  const candidates = await db
    .collection("shipments")
    .find({ _id: { $in: shipmentIds.map((id) => oid(id)) } } as never)
    .toArray();

  const skipped: Record<string, number> = {};
  const bump = (reason: string) => (skipped[reason] = (skipped[reason] ?? 0) + 1);
  const existingIds = new Set(trip.shipments.map((entry) => entry.shipmentId));
  const entries: TripShipment[] = [...trip.shipments];

  for (const candidate of candidates) {
    const shipment = toDomain<{
      id: string;
      trackingNumber: string;
      status: string;
      tripId?: string;
      destinationHubId: string;
      totalPackages: number;
      totalWeightKg: number;
      totalVolumeCm3: number;
    }>(candidate);

    if (existingIds.has(shipment.id)) {
      bump("Already loaded");
      continue;
    }
    if (!LOADABLE_STATUSES.includes(shipment.status)) {
      bump(`Not loadable (${shipment.status.replace("_", " ")})`);
      continue;
    }
    if (shipment.tripId && shipment.tripId !== tripId) {
      bump("Already on another trip");
      continue;
    }
    if (shipment.destinationHubId !== trip.destinationHubId) {
      bump("Wrong destination hub");
      continue;
    }
    entries.push({
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
      packages: shipment.totalPackages,
      weightKg: shipment.totalWeightKg,
      volumeCm3: shipment.totalVolumeCm3,
      addedAt: new Date().toISOString(),
      addedBy: context.user.name,
    });
  }

  const loaded = entries.length - trip.shipments.length;
  if (candidates.length === 0) return fail("Those shipments no longer exist.");
  if (loaded === 0) {
    const detail = Object.entries(skipped)
      .map(([reason, count]) => `${reason} ×${count}`)
      .join(", ");
    return fail(`Nothing was loaded: ${detail || "no matching shipments"}.`);
  }

  await db.collection(COLLECTION).updateOne(
    { _id: oid(tripId) } as never,
    { $set: { shipments: entries, updatedAt: new Date() } as never, $inc: { version: 1 } } as never,
  );
  await db.collection("shipments").updateMany(
    { _id: { $in: candidates.map((doc) => doc._id) } } as never,
    {
      $set: {
        tripId,
        tripNumber: trip.tripNumber,
        driverId: trip.driverId ?? null,
        driverName: trip.driverName ?? null,
        vehicleId: trip.vehicleId ?? null,
        vehicleRegistration: trip.vehicleRegistration ?? null,
        updatedAt: new Date(),
      } as never,
      $inc: { version: 1 },
    } as never,
  );

  const after = await recomputeTrip(db, tripId);
  if (after) await syncTripToShipments(db, after);

  await recordAudit({
    actorId: context.user.id,
    actorName: context.user.name,
    actorRole: context.user.role,
    action: "trip.manifest_updated",
    entityType: "trip",
    entityId: tripId,
    entityLabel: trip.tripNumber,
    before: { count: trip.shipments.length },
    after: { count: entries.length, loaded, skipped },
    ip: context.ip,
    userAgent: context.userAgent,
  });

  return ok({
    id: tripId,
    loaded,
    version: (after?.version ?? trip.version + 1),
  });
}

export async function changeTripStatus(
  raw: unknown,
  context: ActorContext,
): Promise<ActionResult<{ id: string; status: string; version: number }>> {
  const parsed = tripStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("Check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  }
  const { tripId, to, expectedVersion, reason, location } = parsed.data;
  const db = await getDb();

  const doc = await db.collection(COLLECTION).findOne({ _id: oid(tripId) } as never);
  if (!doc) return fail(NOT_FOUND);
  const trip = toDomain<Trip>(doc);
  if (trip.version !== expectedVersion) {
    return fail(CONFLICT, { conflict: true, currentVersion: expectedVersion });
  }
  if (!canTripTransition(trip.status, to)) {
    return fail(
      `A trip that is ${trip.status.replace("_", " ")} cannot move to ${to.replace("_", " ")}. Valid next steps: ${
        (TRIP_TRANSITIONS[trip.status] ?? []).map((value) => value.replace("_", " ")).join(", ") || "none"
      }.`,
    );
  }

  if (to === "ready" && (!trip.driverId || !trip.vehicleId)) {
    return fail("Assign a driver and a vehicle before marking the trip ready.");
  }
  if (to === "dispatched") {
    if (!trip.driverId || !trip.vehicleId) {
      return fail("A trip cannot leave the hub without a driver and a vehicle.");
    }
    if (trip.shipments.length === 0) {
      return fail("Load at least one shipment before dispatching.");
    }
    if (trip.overCapacity) {
      return fail("This trip exceeds the assigned vehicle capacity. Re-plan before dispatching.");
    }
  }
  if (to === "dispatched" && trip.status !== "ready") {
    return fail("Mark the trip ready first, then dispatch it.");
  }

  const $set: Record<string, unknown> = { status: to, updatedAt: new Date() };
  const now = new Date();
  if (to === "dispatched") $set.actualDepartureAt = now;
  if (to === "arrived") $set.arrivedAt = now;
  if (to === "completed") $set.completedAt = now;
  if (to === "cancelled" && trip.driverId) {
    await db.collection("drivers").updateOne(
      { _id: oid(trip.driverId) } as never,
      { $set: { activeTripId: null, status: "available", updatedAt: now } } as never,
    );
    if (trip.vehicleId) {
      await db.collection("vehicles").updateOne(
        { _id: oid(trip.vehicleId) } as never,
        { $set: { status: "available", updatedAt: now } } as never,
      );
    }
  }

  const updated = await db.collection(COLLECTION).findOneAndUpdate(
    { _id: oid(tripId), version: expectedVersion } as never,
    { $set: $set as never, $inc: { version: 1 } } as never,
    { returnDocument: "after" },
  );
  if (!updated) return fail(CONFLICT, { conflict: true, currentVersion: expectedVersion });

  const fresh = toDomain<Trip>(updated);
  await syncTripToShipments(db, fresh);

  if (to === "dispatched" || to === "completed" || to === "arrived") {
    const driverStatus = to === "dispatched" ? "on_trip" : "available";
    if (trip.driverId) {
      await db.collection("drivers").updateOne(
        { _id: oid(trip.driverId) } as never,
        {
          $set: {
            status: driverStatus,
            activeTripId: to === "dispatched" ? tripId : null,
            updatedAt: now,
          },
        } as never,
      );
    }
    if (trip.vehicleId) {
      await db.collection("vehicles").updateOne(
        { _id: oid(trip.vehicleId) } as never,
        {
          $set: {
            status: to === "dispatched" ? "on_trip" : "available",
            driverId: to === "dispatched" ? trip.driverId ?? null : null,
            updatedAt: now,
          },
        } as never,
      );
    }
  }

  await recordAudit({
    actorId: context.user.id,
    actorName: context.user.name,
    actorRole: context.user.role,
    action: `trip.${to}`,
    entityType: "trip",
    entityId: tripId,
    entityLabel: trip.tripNumber,
    before: { status: trip.status },
    after: { status: to, reason, location },
    ip: context.ip,
    userAgent: context.userAgent,
  });

  if (to === "dispatched" && trip.driverId) {
    await createNotification({
      type: "trip_dispatched",
      severity: "low",
      title: `${trip.tripNumber} has departed`,
      body: `${trip.originHubName ?? "Origin"} → ${trip.destinationHubName ?? "destination"} with ${trip.totalPackages} package${trip.totalPackages === 1 ? "" : "s"}.`,
      actionHref: `/dispatch/${tripId}`,
      actionLabel: "Open trip",
      audienceRole: "operations_manager",
      dedupeKey: `trip-dispatched:${tripId}`,
    });
  }

  return ok({ id: tripId, status: to, version: fresh.version });
}

export interface LoadableShipment {
  id: string;
  trackingNumber: string;
  recipientCity: string;
  status: string;
  packages: number;
  weightKg: number;
}

/** Shipments waiting at the origin hub that can be loaded onto a trip. */
export async function listLoadableShipments(
  tripId: string,
  q?: string,
  limit = 25,
): Promise<LoadableShipment[]> {
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ _id: oid(tripId) } as never);
  if (!doc) return [];
  const trip = toDomain<Trip>(doc);

  const query: Record<string, unknown> = {
    status: { $in: LOADABLE_STATUSES },
    destinationHubId: trip.destinationHubId,
    $or: [{ tripId: null }, { tripId: { $exists: false } }, { tripId: tripId }],
  };
  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$and = [{ $or: [{ trackingNumber: regex }, { "recipient.city": regex }, { "recipient.name": regex }] }];
  }

  const docs = await db
    .collection("shipments")
    .find(query as never)
    .project({
      trackingNumber: 1,
      status: 1,
      totalPackages: 1,
      totalWeightKg: 1,
      "recipient.city": 1,
      tripId: 1,
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return docs.map((row) => {
    const source = row as unknown as {
      _id: unknown;
      trackingNumber?: string;
      status?: string;
      totalPackages?: number;
      totalWeightKg?: number;
      tripId?: string;
      recipient?: { city?: string };
    };
    return {
      id: String(source._id),
      trackingNumber: source.trackingNumber ?? "—",
      recipientCity: source.recipient?.city ?? "—",
      status: source.status ?? "booked",
      packages: Number(source.totalPackages ?? 0),
      weightKg: Number(source.totalWeightKg ?? 0),
    };
  });
}
