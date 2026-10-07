import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { oid, toDomain, toDomainList } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { computeShippingFee, promisedTransitHours } from "@/lib/pricing";
import { allowedTransitions, canTransition, labelFor } from "@/lib/transitions";
import { fieldErrors } from "@/lib/schemas/common";
import {
  shipmentCreateSchema,
  shipmentStatusSchema,
  shipmentUpdateSchema,
} from "@/lib/schemas/shipment";
import { fail, ok, CONFLICT, NOT_FOUND, type ActionResult } from "@/lib/actions/result";
import type { SessionUser } from "@/lib/session";
import type {
  Shipment,
  ShipmentPackage,
  ShipmentStatus,
  TrackingEvent,
} from "@/types/domain";

const COLLECTION = "shipments";

export interface ShipmentListFilter {
  q?: string;
  status?: string;
  hubId?: string;
  driverId?: string;
  tripId?: string;
  customerId?: string;
  serviceLevel?: string;
  paymentStatus?: string;
  exceptionOnly?: string;
  delayedOnly?: string;
  from?: string;
  to?: string;
  sort?: string;
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

const SORTABLE: Record<string, string> = {
  trackingNumber: "trackingNumber",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  promisedDeliveryAt: "promisedDeliveryAt",
  status: "status",
  customer: "customerName",
  destination: "recipient.city",
  cod: "codAmountMinor",
};

function buildFilter(filter: ShipmentListFilter, user: SessionUser) {
  const query: Record<string, unknown> = {};

  if (user.role === "customer" && user.customerId) query.customerId = user.customerId;
  if (user.role === "driver" && user.driverId) query.driverId = user.driverId;

  if (filter.q) {
    const escaped = filter.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [
      { trackingNumber: regex },
      { "recipient.name": regex },
      { "recipient.phone": regex },
      { "sender.name": regex },
      { customerName: regex },
    ];
  }
  if (filter.status) {
    const list = filter.status.split(",").filter(Boolean);
    if (list.length) query.status = { $in: list };
  }
  if (filter.hubId) {
    query.$or = [{ originHubId: filter.hubId }, { destinationHubId: filter.hubId }];
  }
  if (filter.driverId) query.driverId = filter.driverId;
  if (filter.tripId) query.tripId = filter.tripId;
  if (filter.customerId) query.customerId = filter.customerId;
  if (filter.serviceLevel) query.serviceLevel = filter.serviceLevel;
  if (filter.paymentStatus) query.paymentStatus = filter.paymentStatus;
  if (filter.delayedOnly === "true") query.delayedReason = { $exists: true, $ne: null };
  if (filter.from || filter.to) {
    const createdAt: Record<string, Date> = {};
    if (filter.from) createdAt.$gte = new Date(filter.from);
    if (filter.to) createdAt.$lte = new Date(`${filter.to}T23:59:59`);
    query.createdAt = createdAt;
  }
  return query;
}

export async function listShipments(
  filter: ShipmentListFilter,
  user: SessionUser,
): Promise<{ rows: Shipment[]; total: number; page: number; pageSize: number }> {
  const db = await getDb();
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filter.pageSize ?? 20));
  const query = buildFilter(filter, user);

  let finalQuery: Record<string, unknown> = query;
  if (filter.exceptionOnly === "true") {
    const flagged = await db
      .collection(COLLECTION)
      .find({ ...query, failureReason: { $exists: true } } as never)
      .project({ _id: 1 })
      .toArray();
    const delayed = await db
      .collection(COLLECTION)
      .find({ ...query, delayedReason: { $exists: true, $ne: null } } as never)
      .project({ _id: 1 })
      .toArray();
    const ids = new Set([...flagged, ...delayed].map((doc) => String(doc._id)));
    finalQuery = { ...query, _id: { $in: [...ids] } };
  }

  const sortKey = SORTABLE[filter.sort ?? ""] ?? "createdAt";
  const direction = filter.dir === "asc" ? 1 : -1;

  const [docs, total] = await Promise.all([
    db
      .collection(COLLECTION)
      .find(finalQuery as never)
      .sort({ [sortKey]: direction } as never)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
    db.collection(COLLECTION).countDocuments(finalQuery as never),
  ]);

  return { rows: toDomainList<Shipment>(docs), total, page, pageSize };
}

export async function getShipment(id: string): Promise<Shipment | null> {
  const _id = oid(id);
  if (!_id) return null;
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ _id } as never);
  return doc ? toDomain<Shipment>(doc) : null;
}

export async function getShipmentByTracking(trackingNumber: string): Promise<Shipment | null> {
  const db = await getDb();
  const doc = await db
    .collection(COLLECTION)
    .findOne({ trackingNumber: trackingNumber.toUpperCase().trim() } as never);
  return doc ? toDomain<Shipment>(doc) : null;
}

export async function listTrackingEvents(shipmentId: string): Promise<TrackingEvent[]> {
  const _id = oid(shipmentId);
  if (!_id) return [];
  const db = await getDb();
  const docs = await db
    .collection("trackingEvents")
    .find({ shipmentId: _id.toString() } as never)
    .sort({ createdAt: 1 })
    .toArray();
  return toDomainList<TrackingEvent>(docs);
}

async function nextTrackingNumber(): Promise<string> {
  const db = await getDb();
  const latest = await db
    .collection(COLLECTION)
    .find({ trackingNumber: /^AV-\d+$/ } as never)
    .project({ trackingNumber: 1 })
    .sort({ trackingNumber: -1 })
    .limit(1)
    .toArray();

  const current = latest[0]
    ? Number(String((latest[0] as { trackingNumber: string }).trackingNumber).replace("AV-", ""))
    : 10000;
  return `AV-${(Number.isFinite(current) ? current : 10000) + 1}`;
}

function normalisePackages(
  input: { description: string; quantity: number; weightKg: number; lengthCm: number; widthCm: number; heightCm: number; declaredValue?: string }[],
): ShipmentPackage[] {
  return input.map((pkg, index) => ({
    id: `pkg-${Date.now().toString(36)}-${index}`,
    description: pkg.description,
    quantity: pkg.quantity,
    weightKg: pkg.weightKg,
    lengthCm: pkg.lengthCm,
    widthCm: pkg.widthCm,
    heightCm: pkg.heightCm,
  }));
}

interface MutatorContext {
  user: SessionUser;
  ip?: string;
  userAgent?: string;
}

export async function createShipment(
  rawInput: unknown,
  context: MutatorContext,
): Promise<ActionResult<{ id: string; trackingNumber: string }>> {
  const parsed = shipmentCreateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return fail("Check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  }
  const input = parsed.data;
  // Portal bookings can only ever be filed against the caller's own account.
  if (context.user.role === "customer" && context.user.customerId) {
    input.customerId = context.user.customerId;
  }
  const db = await getDb();

  const [originDoc, destinationDoc, customerDoc] = await Promise.all([
    db.collection("hubs").findOne({ _id: oid(input.originHubId) } as never),
    db.collection("hubs").findOne({ _id: oid(input.destinationHubId) } as never),
    db.collection("customers").findOne({ _id: oid(input.customerId) } as never),
  ]);
  if (!originDoc || !destinationDoc) return fail("Select a valid origin and destination hub.");
  if (!customerDoc) return fail("Select a valid customer.");

  const origin = toDomain<{ id: string; name: string }>(originDoc);
  const destination = toDomain<{ id: string; name: string }>(destinationDoc);
  const customer = toDomain<{ id: string; name: string; email: string; phone: string }>(customerDoc);

  const packages = normalisePackages(input.packages);
  const totalPackages = packages.reduce((sum, pkg) => sum + pkg.quantity, 0);
  const totalWeightKg = Number(
    packages.reduce((sum, pkg) => sum + pkg.weightKg * pkg.quantity, 0).toFixed(1),
  );
  const totalVolumeCm3 = packages.reduce(
    (sum, pkg) => sum + pkg.lengthCm * pkg.widthCm * pkg.heightCm * pkg.quantity,
    0,
  );

  const codAmountMinor = input.codAmount ? Number(input.codAmount.replace(/[^0-9.]/g, "")) * 100 : 0;
  const codRounded = Math.round(codAmountMinor);
  // Server-derived: the form never posts a shipping fee.
  const shippingFeeMinor = computeShippingFee({
    serviceLevel: input.serviceLevel,
    totalWeightKg,
    codAmountMinor: codRounded,
  });

  const promisedDeliveryAt = new Date(input.promisedDeliveryAt);
  const now = new Date();
  const status: ShipmentStatus = "booked";

  const trackingNumber = await nextTrackingNumber();
  const shipmentId = new ObjectId();

  const record: Record<string, unknown> = {
    _id: shipmentId,
    trackingNumber,
    customerId: customer.id,
    customerName: customer.name,
    sender: { ...input.sender, country: input.sender.country || "Nigeria" },
    recipient: { ...input.recipient, country: input.recipient.country || "Nigeria" },
    packages,
    serviceLevel: input.serviceLevel,
    status,
    originHubId: origin.id,
    originHubName: origin.name,
    destinationHubId: destination.id,
    destinationHubName: destination.name,
    promisedDeliveryAt,
    totalPackages,
    totalWeightKg,
    totalVolumeCm3,
    shippingFeeMinor,
    declaredValueMinor: input.declaredValue
      ? Math.round(Number(input.declaredValue.replace(/[^0-9.]/g, "")) * 100)
      : undefined,
    codAmountMinor: codRounded > 0 ? codRounded : undefined,
    paymentStatus: codRounded > 0 ? "cod_pending" : input.prepaid ? "paid" : "unpaid",
    priority: input.priority,
    notes: input.notes,
    attemptCount: 0,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db.collection(COLLECTION).insertOne(record as never);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("E11000")) {
      // unique trackingNumber collision — surface as a retryable conflict
      return fail("Could not allocate a tracking number. Try again.");
    }
    throw error;
  }

  await writeTrackingEvent({
    shipmentId: shipmentId.toString(),
    trackingNumber,
    type: "status_changed",
    newStatus: "booked",
    label: "Booked",
    location: origin.name,
    hubId: origin.id,
    actorId: context.user.id,
    actorName: context.user.name,
    note: `Service: ${input.serviceLevel}. Promised by ${promisedDeliveryAt.toISOString()}.`,
  });

  await recordAudit({
    actorId: context.user.id,
    actorName: context.user.name,
    actorRole: context.user.role,
    action: "shipment.created",
    entityType: "shipment",
    entityId: shipmentId.toString(),
    entityLabel: trackingNumber,
    after: {
      status,
      destination: destination.name,
      shippingFeeMinor,
      totalWeightKg,
      totalPackages,
    },
    ip: context.ip,
    userAgent: context.userAgent,
  });

  await createNotification({
    type: "driver_assigned",
    severity: "low",
    title: `Shipment ${trackingNumber} booked`,
    body: `${customer.name} → ${destination.name}. ${totalPackages} package(s), promised ${promisedDeliveryAt.toLocaleDateString("en-GB")}.`,
    actionHref: `/shipments/${shipmentId.toString()}`,
    actionLabel: "Open shipment",
    audienceRole: "dispatcher",
  });

  return ok({ id: shipmentId.toString(), trackingNumber });
}

export async function writeTrackingEvent(input: {
  shipmentId: string;
  trackingNumber: string;
  type: TrackingEvent["type"];
  previousStatus?: ShipmentStatus;
  newStatus?: ShipmentStatus;
  label: string;
  location?: string;
  hubId?: string;
  actorId?: string;
  actorName?: string;
  note?: string;
  createdAt?: Date;
}): Promise<void> {
  const db = await getDb();
  await db.collection("trackingEvents").insertOne({
    shipmentId: input.shipmentId,
    trackingNumber: input.trackingNumber,
    type: input.type,
    previousStatus: input.previousStatus,
    newStatus: input.newStatus,
    label: input.label,
    location: input.location,
    hubId: input.hubId,
    actorId: input.actorId,
    actorName: input.actorName,
    note: input.note,
    createdAt: input.createdAt ?? new Date(),
  } as never);
}

export async function updateShipment(
  rawInput: unknown,
  context: MutatorContext,
): Promise<ActionResult<{ id: string }>> {
  const parsed = shipmentUpdateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return fail("Check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  }
  const input = parsed.data;
  const db = await getDb();

  const existing = await db.collection(COLLECTION).findOne({ _id: oid(input.shipmentId) } as never);
  if (!existing) return fail(NOT_FOUND);
  const current = toDomain<Shipment>(existing);

  if (["delivered", "returned", "cancelled"].includes(current.status)) {
    return fail(`${labelFor(current.status)} shipments cannot be edited. Use a status correction if the record is wrong.`);
  }

  const packages = normalisePackages(input.packages);
  const totalPackages = packages.reduce((sum, pkg) => sum + pkg.quantity, 0);
  const totalWeightKg = Number(
    packages.reduce((sum, pkg) => sum + pkg.weightKg * pkg.quantity, 0).toFixed(1),
  );
  const totalVolumeCm3 = packages.reduce(
    (sum, pkg) => sum + pkg.lengthCm * pkg.widthCm * pkg.heightCm * pkg.quantity,
    0,
  );
  const codRounded = input.codAmount
    ? Math.round(Number(input.codAmount.replace(/[^0-9.]/g, "")) * 100)
    : 0;
  const shippingFeeMinor = computeShippingFee({
    serviceLevel: input.serviceLevel,
    totalWeightKg,
    codAmountMinor: codRounded,
  });

  const [originDoc, destinationDoc, customerDoc] = await Promise.all([
    db.collection("hubs").findOne({ _id: oid(input.originHubId) } as never),
    db.collection("hubs").findOne({ _id: oid(input.destinationHubId) } as never),
    db.collection("customers").findOne({ _id: oid(input.customerId) } as never),
  ]);
  if (!originDoc || !destinationDoc || !customerDoc) {
    return fail("Select a valid customer and hub pair.");
  }
  const origin = toDomain<{ id: string; name: string }>(originDoc);
  const destination = toDomain<{ id: string; name: string }>(destinationDoc);
  const customer = toDomain<{ id: string; name: string }>(customerDoc);

  const patch: Record<string, unknown> = {
    customerId: customer.id,
    customerName: customer.name,
    sender: input.sender,
    recipient: input.recipient,
    packages,
    serviceLevel: input.serviceLevel,
    originHubId: origin.id,
    originHubName: origin.name,
    destinationHubId: destination.id,
    destinationHubName: destination.name,
    promisedDeliveryAt: new Date(input.promisedDeliveryAt),
    totalPackages,
    totalWeightKg,
    totalVolumeCm3,
    shippingFeeMinor,
    declaredValueMinor: input.declaredValue
      ? Math.round(Number(input.declaredValue.replace(/[^0-9.]/g, "")) * 100)
      : undefined,
    codAmountMinor: codRounded > 0 ? codRounded : undefined,
    priority: input.priority,
    notes: input.notes,
    updatedAt: new Date(),
  };

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    {
      _id: oid(current.id),
      version: input.expectedVersion ?? current.version,
    } as never,
    { $set: patch, $inc: { version: 1 } } as never,
    { returnDocument: "after" },
  );

  if (!result) {
    return fail(CONFLICT, { conflict: true, currentVersion: current.version });
  }

  await recordAudit({
    actorId: context.user.id,
    actorName: context.user.name,
    actorRole: context.user.role,
    action: "shipment.updated",
    entityType: "shipment",
    entityId: current.id,
    entityLabel: current.trackingNumber,
    before: {
      recipient: current.recipient,
      serviceLevel: current.serviceLevel,
      shippingFeeMinor: current.shippingFeeMinor,
      promisedDeliveryAt: current.promisedDeliveryAt,
    },
    after: {
      recipient: input.recipient,
      serviceLevel: input.serviceLevel,
      shippingFeeMinor,
      promisedDeliveryAt: patch.promisedDeliveryAt,
    },
    ip: context.ip,
    userAgent: context.userAgent,
  });

  return ok({ id: current.id });
}

export interface StatusChangeInput {
  shipmentId: string;
  to: ShipmentStatus;
  expectedVersion: number;
  reason?: string;
  hubId?: string;
  location?: string;
}

/**
 * The single doorway for canonical status transitions. Validates the state
 * machine, enforces optimistic concurrency and records an immutable event.
 */
export async function changeShipmentStatus(
  rawInput: unknown,
  context: MutatorContext,
): Promise<ActionResult<{ id: string; status: ShipmentStatus; version: number }>> {
  const parsed = shipmentStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    return fail("Check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  }
  return applyStatusChange(parsed.data, context, false);
}

/** Manager-only correction: never rewrites history, always audited with a reason. */
export async function correctShipmentStatus(
  rawInput: unknown,
  context: MutatorContext,
): Promise<ActionResult<{ id: string; status: ShipmentStatus; version: number }>> {
  const parsed = shipmentStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    return fail("Check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  }
  if (!parsed.data.reason || parsed.data.reason.trim().length < 8) {
    return fail("A correction requires a written reason of at least 8 characters.", {
      fieldErrors: { reason: ["Explain why this correction is needed."] },
    });
  }
  if (!context.user.permissions.includes("shipments.status")) {
    return fail("You do not have permission to correct shipment status.");
  }
  return applyStatusChange(parsed.data, context, true);
}

async function applyStatusChange(
  input: {
    shipmentId: string;
    to: ShipmentStatus;
    expectedVersion: number;
    reason?: string;
    hubId?: string;
    location?: string;
  },
  context: MutatorContext,
  isCorrection: boolean,
): Promise<ActionResult<{ id: string; status: ShipmentStatus; version: number }>> {
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ _id: oid(input.shipmentId) } as never);
  if (!doc) return fail(NOT_FOUND);

  const shipment = toDomain<Shipment>(doc);

  if (!isCorrection && !canTransition(shipment.status, input.to)) {
    const allowed = allowedTransitions(shipment.status);
    return fail(
      allowed.length === 0
        ? `${labelFor(shipment.status)} is a final state. An authorised correction is required.`
        : `Cannot move from ${labelFor(shipment.status)} to ${labelFor(input.to)}. Valid next steps: ${allowed
            .map(labelFor)
            .join(", ")}.`,
    );
  }

  if (input.to === "out_for_delivery" && !shipment.driverId) {
    return fail("Assign a driver and vehicle before sending this shipment out for delivery.");
  }

  const now = new Date();
  const patch: Record<string, unknown> = { status: input.to, updatedAt: now };

  if (input.to === "picked_up") patch.pickedUpAt = shipment.pickedUpAt ?? now;
  if (input.to === "delivered") patch.deliveredAt = now;
  if (input.to === "failed") {
    patch.failureReason = input.reason ?? shipment.failureReason ?? "other";
    if (input.reason) patch.failureReason = input.reason;
    if (input.location) patch.failureNote = input.location;
  } else if (shipment.status === "failed") {
    patch.failureReason = null;
    patch.failureNote = null;
  }
  if (input.to === "delivered" || input.to === "returned" || input.to === "cancelled") {
    patch.delayedReason = null;
  }

  const updated = await db.collection(COLLECTION).findOneAndUpdate(
    { _id: oid(shipment.id), version: input.expectedVersion } as never,
    { $set: patch, $inc: { version: 1 } } as never,
    { returnDocument: "after" },
  );

  if (!updated) {
    const latest = await db.collection(COLLECTION).findOne({ _id: oid(shipment.id) } as never);
    const currentVersion = latest ? Number((latest as { version?: number }).version ?? 0) : 0;
    return fail(CONFLICT, { conflict: true, currentVersion });
  }

  const hubName = input.hubId ? await hubLabel(input.hubId) : undefined;
  await writeTrackingEvent({
    shipmentId: shipment.id,
    trackingNumber: shipment.trackingNumber,
    type: "status_changed",
    previousStatus: shipment.status,
    newStatus: input.to,
    label: labelFor(input.to).replace(/^./, (c) => c.toUpperCase()),
    location: input.location ?? hubName ?? shipment.recipient.city,
    hubId: input.hubId,
    actorId: context.user.id,
    actorName: context.user.name,
    note: input.reason,
  });

  await recordAudit({
    actorId: context.user.id,
    actorName: context.user.name,
    actorRole: context.user.role,
    action: isCorrection ? "shipment.status_corrected" : "shipment.status_changed",
    entityType: "shipment",
    entityId: shipment.id,
    entityLabel: shipment.trackingNumber,
    before: { status: shipment.status },
    after: { status: input.to, reason: input.reason },
    ip: context.ip,
    userAgent: context.userAgent,
  });

  if (input.to === "failed") {
    await openExceptionFromFailure(shipment, input.reason, context);
    await createNotification({
      type: "delivery_failed",
      severity: "high",
      title: `Delivery failed — ${shipment.trackingNumber}`,
      body: `Reason: ${String(input.reason ?? "unspecified")}. Owner: dispatch.`,
      actionHref: `/shipments/${shipment.id}`,
      actionLabel: "Review shipment",
      audienceRole: "operations_manager",
      dedupeKey: `failed:${shipment.trackingNumber}`,
    });
  }

  if (isCorrection) {
    await writeTrackingEvent({
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
      type: "note",
      previousStatus: shipment.status,
      newStatus: input.to,
      label: "Authorised status correction",
      actorId: context.user.id,
      actorName: context.user.name,
      note: input.reason,
    });
  }

  const version = Number((updated as { version?: number }).version ?? input.expectedVersion + 1);
  return ok({ id: shipment.id, status: input.to, version });
}

async function hubLabel(hubId: string): Promise<string | undefined> {
  const db = await getDb();
  const hub = await db.collection("hubs").findOne({ _id: oid(hubId) } as never);
  return hub ? String((hub as unknown as { name: string }).name) : undefined;
}

async function openExceptionFromFailure(
  shipment: Shipment,
  reason: string | undefined,
  context: MutatorContext,
) {
  const db = await getDb();
  const count = await db.collection("exceptions").countDocuments();
  const reference = `EX-${4000 + count + 1}`;
  await db.collection("exceptions").insertOne({
    reference,
    type: "failed_delivery",
    severity: shipment.priority === "urgent" ? "critical" : "high",
    status: "open",
    shipmentId: shipment.id,
    shipmentTrackingNumber: shipment.trackingNumber,
    title: `Delivery failed — ${shipment.trackingNumber}`,
    description: `Structured reason: ${reason ?? "unspecified"}. Destination: ${shipment.recipient.city}, ${shipment.recipient.state}.`,
    dueAt: new Date(Date.now() + 12 * 3600_000),
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    ownerId: context.user.id,
    ownerName: context.user.name,
  } as never);
}

export async function addShipmentNote(
  rawInput: unknown,
  context: MutatorContext,
): Promise<ActionResult> {
  const { z } = await import("zod");
  const schema = z.object({
    shipmentId: z.string().min(1),
    note: z.string().trim().min(2).max(2000),
  });
  const parsed = schema.safeParse(rawInput);
  if (!parsed.success) return fail("Write a note of at least 2 characters.");

  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ _id: oid(parsed.data.shipmentId) } as never);
  if (!doc) return fail(NOT_FOUND);
  const shipment = toDomain<Shipment>(doc);

  await writeTrackingEvent({
    shipmentId: shipment.id,
    trackingNumber: shipment.trackingNumber,
    type: "note",
    label: "Operational note",
    actorId: context.user.id,
    actorName: context.user.name,
    note: parsed.data.note,
    location: shipment.destinationHubName,
  });

  await recordAudit({
    actorId: context.user.id,
    actorName: context.user.name,
    actorRole: context.user.role,
    action: "shipment.note_added",
    entityType: "shipment",
    entityId: shipment.id,
    entityLabel: shipment.trackingNumber,
    after: { note: parsed.data.note.slice(0, 200) },
    ip: context.ip,
  });

  return ok();
}
