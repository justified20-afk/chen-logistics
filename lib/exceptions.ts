import "server-only";
import { getDb } from "@/lib/mongodb";
import { oid, toDomain, toDomainList } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { fieldErrors } from "@/lib/schemas/common";
import { exceptionCreateSchema, exceptionUpdateSchema } from "@/lib/schemas/fleet";
import { allowedExceptionTransitions } from "@/lib/transitions";
import {
  fail,
  ok,
  CONFLICT,
  NOT_FOUND,
  type ActionResult,
} from "@/lib/actions/result";
import type { ActorContext } from "@/lib/actions/context";
import type { SessionUser } from "@/lib/session";
import type { Exception } from "@/types/domain";

const COLLECTION = "exceptions";

export interface ExceptionListFilter {
  q?: string;
  /** Comma-separated exception statuses. */
  status?: string;
  /** Comma-separated severities. */
  severity?: string;
  type?: string;
  from?: string;
  to?: string;
  sort?: string;
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

const SORTABLE: Record<string, string> = {
  reference: "reference",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  status: "status",
  severity: "severity",
  dueAt: "dueAt",
  title: "title",
};

function csv(value?: string): string[] {
  return (value ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
}

function buildFilter(filter: ExceptionListFilter, user: SessionUser) {
  const query: Record<string, unknown> = {};

  // A driver's portal only ever shows exceptions linked to their own work.
  if (user.role === "driver" && user.driverId) query.driverId = user.driverId;

  if (filter.q) {
    const escaped = filter.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [
      { reference: regex },
      { title: regex },
      { description: regex },
      { shipmentTrackingNumber: regex },
      { ownerName: regex },
    ];
  }
  const statuses = csv(filter.status);
  if (statuses.length) query.status = { $in: statuses };
  const severities = csv(filter.severity);
  if (severities.length) query.severity = { $in: severities };
  if (filter.type) query.type = filter.type;
  if (filter.from || filter.to) {
    const createdAt: Record<string, Date> = {};
    if (filter.from) createdAt.$gte = new Date(filter.from);
    if (filter.to) createdAt.$lte = new Date(`${filter.to}T23:59:59`);
    query.createdAt = createdAt;
  }
  return query;
}

export async function listExceptions(
  filter: ExceptionListFilter,
  user: SessionUser,
): Promise<{ rows: Exception[]; total: number; page: number; pageSize: number }> {
  const db = await getDb();
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filter.pageSize ?? 20));
  const query = buildFilter(filter, user);
  const sortKey = SORTABLE[filter.sort ?? ""] ?? "createdAt";
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

  return { rows: toDomainList<Exception>(docs), total, page, pageSize };
}

export async function getException(id: string): Promise<Exception | null> {
  const _id = oid(id);
  if (!_id) return null;
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ _id } as never);
  return doc ? toDomain<Exception>(doc) : null;
}

async function nextReference(db: Awaited<ReturnType<typeof getDb>>): Promise<string> {
  const docs = await db
    .collection(COLLECTION)
    .find({ reference: /^EX-\d+$/ } as never)
    .project({ reference: 1 })
    .sort({ reference: -1 })
    .limit(1)
    .toArray();
  const current = docs[0]
    ? Number(String((docs[0] as { reference: string }).reference).replace("EX-", ""))
    : 3000;
  return `EX-${(Number.isFinite(current) ? current : 3000) + 1}`;
}

async function linkLabels(input: {
  shipmentId?: string;
  tripId?: string;
  driverId?: string;
  vehicleId?: string;
  hubId?: string;
}) {
  const db = await getDb();
  const [shipment, trip, driver, vehicle, hub] = await Promise.all([
    input.shipmentId
      ? db.collection("shipments").findOne({ _id: oid(input.shipmentId) } as never)
      : null,
    input.tripId ? db.collection("trips").findOne({ _id: oid(input.tripId) } as never) : null,
    input.driverId ? db.collection("drivers").findOne({ _id: oid(input.driverId) } as never) : null,
    input.vehicleId
      ? db.collection("vehicles").findOne({ _id: oid(input.vehicleId) } as never)
      : null,
    input.hubId ? db.collection("hubs").findOne({ _id: oid(input.hubId) } as never) : null,
  ]);

  return {
    shipmentTrackingNumber: (shipment as { trackingNumber?: string } | null)?.trackingNumber,
    tripNumber: (trip as { tripNumber?: string } | null)?.tripNumber,
    driverName: (driver as { name?: string } | null)?.name,
    vehicleRegistration: (vehicle as { registrationNumber?: string } | null)?.registrationNumber,
    hubName: (hub as { name?: string } | null)?.name,
  };
}

export async function createException(
  raw: unknown,
  context: ActorContext,
): Promise<ActionResult<{ id: string; reference: string }>> {
  const parsed = exceptionCreateSchema.safeParse(raw);
  if (!parsed.success) return fail("Check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });

  const db = await getDb();
  const labels = await linkLabels(parsed.data);
  const reference = await nextReference(db);
  const now = new Date();

  const doc = {
    reference,
    type: parsed.data.type,
    severity: parsed.data.severity,
    status: "open",
    shipmentId: parsed.data.shipmentId,
    tripId: parsed.data.tripId,
    driverId: parsed.data.driverId,
    vehicleId: parsed.data.vehicleId,
    hubId: parsed.data.hubId,
    shipmentTrackingNumber: labels.shipmentTrackingNumber,
    tripNumber: labels.tripNumber,
    driverName: labels.driverName,
    vehicleRegistration: labels.vehicleRegistration,
    ownerId: parsed.data.ownerId,
    title: parsed.data.title,
    description: parsed.data.description,
    dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : undefined,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection(COLLECTION).insertOne(doc as never);

  await recordAudit({
    actorId: context.user.id,
    actorName: context.user.name,
    actorRole: context.user.role,
    action: "exception.created",
    entityType: "exception",
    entityId: result.insertedId.toString(),
    entityLabel: `${reference} — ${parsed.data.title}`,
    after: { reference, type: parsed.data.type, severity: parsed.data.severity, status: "open" },
    ip: context.ip,
    userAgent: context.userAgent,
  });

  if (parsed.data.severity === "critical" || parsed.data.severity === "high") {
    await createNotification({
      type: "exception_escalated",
      severity: parsed.data.severity,
      title: `${reference} raised: ${parsed.data.title}`,
      body: `${parsed.data.severity.toUpperCase()} exception raised by ${context.user.name}${labels.shipmentTrackingNumber ? ` on ${labels.shipmentTrackingNumber}` : ""}.`,
      actionHref: "/exceptions",
      actionLabel: "Open the queue",
      audienceRole: "operations_manager",
      dedupeKey: `exception:${reference}`,
    });
  }

  return ok({ id: result.insertedId.toString(), reference });
}

export async function updateException(
  raw: unknown,
  context: ActorContext,
): Promise<ActionResult<{ id: string; status: string; version: number }>> {
  const parsed = exceptionUpdateSchema.safeParse(raw);
  if (!parsed.success) return fail("Check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });

  const { exceptionId, status, severity, ownerId, resolution, expectedVersion } = parsed.data;
  const _id = oid(exceptionId);
  if (!_id) return fail(NOT_FOUND);

  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ _id } as never);
  if (!doc) return fail(NOT_FOUND);
  const current = toDomain<Exception>(doc);

  if (current.version !== expectedVersion) {
    return fail(CONFLICT, { conflict: true, currentVersion: current.version });
  }
  if (!allowedExceptionTransitions(current.status).includes(status)) {
    return fail(
      `An exception that is ${current.status.replace("_", " ")} cannot move to ${status.replace("_", " ")}.`,
    );
  }

  const closing = status === "resolved" || status === "closed";
  const text = (resolution ?? "").trim();
  if (status === "resolved" && text.length < 10) {
    return fail("Record how this exception was resolved before resolving it.", {
      fieldErrors: { resolution: ["Give at least a sentence describing the resolution"] },
    });
  }

  let ownerName: string | undefined;
  if (ownerId) {
    const owner = await db.collection("users").findOne({ _id: oid(ownerId) } as never);
    if (!owner) return fail("That owner no longer exists.", { fieldErrors: { ownerId: ["Unknown user"] } });
    ownerName = (owner as { name?: string }).name;
  }

  const $set: Record<string, unknown> = { status, severity, updatedAt: new Date() };
  if (ownerId !== undefined) {
    $set.ownerId = ownerId || null;
    $set.ownerName = ownerName ?? null;
  }
  if (text) $set.resolution = text;
  if (closing) {
    $set.resolvedAt = new Date();
    $set.resolvedBy = context.user.name;
  }
  if (!closing) {
    $set.resolvedAt = null;
    $set.resolvedBy = null;
  }

  await db
    .collection(COLLECTION)
    .updateOne({ _id, version: expectedVersion } as never, {
      $set: $set as never,
      $inc: { version: 1 },
    } as never);

  await recordAudit({
    actorId: context.user.id,
    actorName: context.user.name,
    actorRole: context.user.role,
    action: closing ? "exception.resolved" : "exception.updated",
    entityType: "exception",
    entityId: exceptionId,
    entityLabel: `${current.reference} — ${current.title}`,
    before: {
      status: current.status,
      severity: current.severity,
      ownerId: current.ownerId,
      resolution: current.resolution,
    },
    after: { status, severity, ownerId: ownerId ?? current.ownerId, resolution: text || undefined },
    ip: context.ip,
    userAgent: context.userAgent,
  });

  if (ownerId && ownerId !== current.ownerId) {
    await createNotification({
      type: "exception_escalated",
      severity,
      title: `${current.reference} assigned to you`,
      body: `${current.title} — assigned by ${context.user.name}.`,
      actionHref: "/exceptions",
      actionLabel: "Open the queue",
      userId: ownerId,
      dedupeKey: `exception-owner:${exceptionId}:${ownerId}`,
    });
  }

  return ok({ id: exceptionId, status, version: current.version + 1 });
}
