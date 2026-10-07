import "server-only";
import { z } from "zod";
import { getDb } from "@/lib/mongodb";
import { oid, toDomain, toDomainList } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { fieldErrors } from "@/lib/schemas/common";
import {
  codCollectSchema,
  codReconciliationSchema,
  invoiceSchema,
  invoiceStatusSchema,
  paymentSchema,
} from "@/lib/schemas/finance";
import { computeInvoiceTotals, TAX_RATE_PERCENT } from "@/lib/pricing";
import { parseMoneyToMinor } from "@/lib/money";
import {
  fail,
  ok,
  CONFLICT,
  NOT_FOUND,
  type ActionResult,
} from "@/lib/actions/result";
import type { ActorContext } from "@/lib/actions/context";
import type { SessionUser } from "@/lib/session";
import type { CodRecord, Invoice, InvoiceLine, Payment } from "@/types/domain";

const moneyToMinor = (value: string): number => parseMoneyToMinor(value) ?? 0;

/* ------------------------------------------------------------------ filters */

export const invoiceFilterSchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.string().optional(),
  customerId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.string().optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});
export type InvoiceFilterInput = z.infer<typeof invoiceFilterSchema>;

export const paymentFilterSchema = z.object({
  q: z.string().trim().max(120).optional(),
  method: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.string().optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});
export type PaymentFilterInput = z.infer<typeof paymentFilterSchema>;

export const codFilterSchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.string().optional(),
  sort: z.string().optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});
export type CodFilterInput = z.infer<typeof codFilterSchema>;

const INVOICE_SORTABLE: Record<string, string> = {
  invoiceNumber: "invoiceNumber",
  createdAt: "createdAt",
  dueAt: "dueAt",
  totalMinor: "totalMinor",
  balanceMinor: "balanceMinor",
  status: "status",
};

function customerScope(user: SessionUser, query: Record<string, unknown>) {
  if (user.role === "customer" && user.customerId) query.customerId = user.customerId;
}

function csv(value?: string): string[] {
  return (value ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
}

/* -------------------------------------------------------------------- lists */

export async function listInvoices(
  filter: InvoiceFilterInput,
  user: SessionUser,
): Promise<{ rows: Invoice[]; total: number; page: number; pageSize: number }> {
  const db = await getDb();
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filter.pageSize ?? 20));
  const query: Record<string, unknown> = {};
  customerScope(user, query);

  if (filter.q) {
    const escaped = filter.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [{ invoiceNumber: regex }, { customerName: regex }];
  }
  const statuses = csv(filter.status);
  if (statuses.length) query.status = { $in: statuses };
  if (filter.customerId) query.customerId = filter.customerId;
  if (filter.from || filter.to) {
    const createdAt: Record<string, Date> = {};
    if (filter.from) createdAt.$gte = new Date(filter.from);
    if (filter.to) createdAt.$lte = new Date(`${filter.to}T23:59:59`);
    query.createdAt = createdAt;
  }

  const sortKey = INVOICE_SORTABLE[filter.sort ?? ""] ?? "createdAt";
  const direction = filter.dir === "asc" ? 1 : -1;

  const [total, docs] = await Promise.all([
    db.collection("invoices").countDocuments(query as never),
    db
      .collection("invoices")
      .find(query as never)
      .sort({ [sortKey]: direction } as never)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
  ]);
  return { rows: toDomainList<Invoice>(docs), total, page, pageSize };
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const _id = oid(id);
  if (!_id) return null;
  const db = await getDb();
  const doc = await db.collection("invoices").findOne({ _id } as never);
  return doc ? toDomain<Invoice>(doc) : null;
}

export async function listPayments(
  filter: PaymentFilterInput,
  user: SessionUser,
): Promise<{ rows: Payment[]; total: number; page: number; pageSize: number }> {
  const db = await getDb();
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filter.pageSize ?? 20));
  const query: Record<string, unknown> = {};
  customerScope(user, query);

  if (filter.q) {
    const escaped = filter.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [
      { reference: regex },
      { customerName: regex },
      { invoiceNumber: regex },
      { notes: regex },
    ];
  }
  if (filter.method) query.method = filter.method;
  if (filter.from || filter.to) {
    const receivedAt: Record<string, Date> = {};
    if (filter.from) receivedAt.$gte = new Date(filter.from);
    if (filter.to) receivedAt.$lte = new Date(`${filter.to}T23:59:59`);
    query.receivedAt = receivedAt;
  }

  const SORTABLE: Record<string, string> = {
    reference: "reference",
    receivedAt: "receivedAt",
    amountMinor: "amountMinor",
    method: "method",
  };
  const sortKey = SORTABLE[filter.sort ?? ""] ?? "receivedAt";
  const direction = filter.dir === "asc" ? 1 : -1;

  const [total, docs] = await Promise.all([
    db.collection("payments").countDocuments(query as never),
    db
      .collection("payments")
      .find(query as never)
      .sort({ [sortKey]: direction } as never)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
  ]);
  return { rows: toDomainList<Payment>(docs), total, page, pageSize };
}

export async function listCodRecords(
  filter: CodFilterInput,
  user: SessionUser,
): Promise<{ rows: CodRecord[]; total: number; page: number; pageSize: number }> {
  const db = await getDb();
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filter.pageSize ?? 20));
  const query: Record<string, unknown> = {};
  customerScope(user, query);

  if (filter.q) {
    const escaped = filter.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [{ trackingNumber: regex }, { customerName: regex }];
  }
  const statuses = csv(filter.status);
  if (statuses.length) query.status = { $in: statuses };

  const direction = filter.dir === "asc" ? 1 : -1;
  const [total, docs] = await Promise.all([
    db.collection("codRecords").countDocuments(query as never),
    db
      .collection("codRecords")
      .find(query as never)
      .sort({ updatedAt: direction, trackingNumber: 1 } as never)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
  ]);
  return { rows: toDomainList<CodRecord>(docs), total, page, pageSize };
}

/* ----------------------------------------------------------------- overview */

export interface FinanceOverview {
  outstandingMinor: number;
  overdueMinor: number;
  overdueCount: number;
  collected30dMinor: number;
  codPendingCount: number;
  codPendingMinor: number;
  codGapMinor: number;
  paidInvoices: number;
  openInvoices: number;
}

export async function financeOverview(user: SessionUser): Promise<FinanceOverview> {
  const db = await getDb();
  const since = new Date(Date.now() - 30 * 86_400_000);
  const now = new Date();
  const scope = user.role === "customer" && user.customerId ? { customerId: user.customerId } : {};

  const [outstanding, overdue, collected, cod, invoiceCounts] = await Promise.all([
    db
      .collection("invoices")
      .aggregate([
        { $match: { ...scope, status: { $in: ["issued", "partially_paid"] } } },
        { $group: { _id: null, total: { $sum: "$balanceMinor" }, count: { $sum: 1 } } },
      ])
      .toArray(),
    db
      .collection("invoices")
      .aggregate([
        { $match: { ...scope, status: { $in: ["issued", "partially_paid"] }, dueAt: { $lt: now } } },
        { $group: { _id: null, total: { $sum: "$balanceMinor" }, count: { $sum: 1 } } },
      ])
      .toArray(),
    db
      .collection("payments")
      .aggregate([
        { $match: { ...scope, status: "recorded", receivedAt: { $gte: since } } },
        { $group: { _id: null, total: { $sum: "$amountMinor" } } },
      ])
      .toArray(),
    db
      .collection("codRecords")
      .aggregate([
        { $match: { ...scope, status: { $in: ["pending", "partially_collected", "not_collected"] } } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            expected: { $sum: "$expectedMinor" },
            collected: { $sum: "$collectedMinor" },
          },
        },
      ])
      .toArray(),
    db
      .collection("invoices")
      .aggregate([
        { $match: scope },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const codRow = (cod[0] as { count?: number; expected?: number; collected?: number }) ?? {};
  const counts = new Map(invoiceCounts.map((row) => [String(row._id), Number(row.count ?? 0)]));

  return {
    outstandingMinor: (outstanding[0] as { total?: number } | undefined)?.total ?? 0,
    overdueMinor: (overdue[0] as { total?: number } | undefined)?.total ?? 0,
    overdueCount: (overdue[0] as { count?: number } | undefined)?.count ?? 0,
    collected30dMinor: (collected[0] as { total?: number } | undefined)?.total ?? 0,
    codPendingCount: codRow.count ?? 0,
    codPendingMinor: Math.max(0, (codRow.expected ?? 0) - (codRow.collected ?? 0)),
    codGapMinor: Math.max(0, (codRow.expected ?? 0) - (codRow.collected ?? 0)),
    paidInvoices: counts.get("paid") ?? 0,
    openInvoices: (counts.get("issued") ?? 0) + (counts.get("partially_paid") ?? 0),
  };
}

/* ------------------------------------------------------------------ mutations */

async function nextPaymentReference(db: Awaited<ReturnType<typeof getDb>>): Promise<string> {
  const docs = await db
    .collection("payments")
    .find({ reference: /^PAY-\d+$/ } as never)
    .project({ reference: 1 })
    .sort({ reference: -1 })
    .limit(1)
    .toArray();
  const current = docs[0]
    ? Number(String((docs[0] as { reference: string }).reference).replace("PAY-", ""))
    : 7000;
  return `PAY-${(Number.isFinite(current) ? current : 7000) + 1}`;
}

export async function createInvoice(
  raw: unknown,
  context: ActorContext,
): Promise<ActionResult<{ id: string; invoiceNumber: string; totalMinor: number }>> {
  const parsed = invoiceSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("Check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  }
  const input = parsed.data;
  const db = await getDb();

  const customer = await db
    .collection("customers")
    .findOne({ _id: oid(input.customerId) } as never);
  if (!customer) return fail("That customer no longer exists.");

  const lines: InvoiceLine[] = input.lines.map((line, index) => {
    const unitAmountMinor = moneyToMinor(line.unitAmount);
    return {
      id: `line-${index + 1}`,
      description: line.description,
      quantity: line.quantity,
      unitAmountMinor,
      totalMinor: unitAmountMinor * line.quantity,
    };
  });

  // Totals are derived here — the client never supplies them.
  const totals = computeInvoiceTotals({
    lines: lines.map((line) => ({ quantity: line.quantity, unitAmountMinor: line.unitAmountMinor })),
    taxRatePercent: input.taxRatePercent ?? TAX_RATE_PERCENT,
    discountMinor: input.discount ? moneyToMinor(input.discount) : 0,
  });

  const latest = await db
    .collection("invoices")
    .find({ invoiceNumber: /^INV-\d+$/ } as never)
    .project({ invoiceNumber: 1 })
    .sort({ invoiceNumber: -1 })
    .limit(1)
    .toArray();
  const current = latest[0]
    ? Number(String((latest[0] as { invoiceNumber: string }).invoiceNumber).replace("INV-", ""))
    : 5000;
  const invoiceNumber = `INV-${(Number.isFinite(current) ? current : 5000) + 1}`;

  const now = new Date();
  const result = await db.collection("invoices").insertOne({
    invoiceNumber,
    customerId: input.customerId,
    customerName: (customer as { name?: string }).name,
    shipmentIds: input.shipmentIds,
    lines,
    subtotalMinor: totals.subtotalMinor,
    taxRatePercent: input.taxRatePercent ?? TAX_RATE_PERCENT,
    taxMinor: totals.taxMinor,
    discountMinor: totals.discountMinor,
    totalMinor: totals.totalMinor,
    amountPaidMinor: 0,
    balanceMinor: totals.totalMinor,
    currency: "NGN",
    status: "issued",
    dueAt: new Date(input.dueAt),
    issuedAt: now,
    notes: input.notes,
    version: 1,
    createdAt: now,
    updatedAt: now,
  } as never);

  const id = result.insertedId.toString();

  if (input.shipmentIds.length > 0) {
    await db.collection("shipments").updateMany(
      { _id: { $in: input.shipmentIds.map((shipmentId) => oid(shipmentId)) } } as never,
      { $set: { invoiceId: id, updatedAt: now }, $inc: { version: 1 } } as never,
    );
  }

  await recordAudit({
    actorId: context.user.id,
    actorName: context.user.name,
    actorRole: context.user.role,
    action: "invoice.created",
    entityType: "invoice",
    entityId: id,
    entityLabel: invoiceNumber,
    after: {
      customer: (customer as { name?: string }).name,
      totalMinor: totals.totalMinor,
      dueAt: input.dueAt,
      lines: lines.length,
    },
    ip: context.ip,
    userAgent: context.userAgent,
  });

  return ok({ id, invoiceNumber, totalMinor: totals.totalMinor });
}

export async function recordPayment(
  raw: unknown,
  context: ActorContext,
): Promise<ActionResult<{ id: string; reference: string; invoiceStatus?: string }>> {
  const parsed = paymentSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("Check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  }
  const input = parsed.data;
  const amountMinor = moneyToMinor(input.amount);
  if (amountMinor <= 0) return fail("The payment amount must be greater than zero.");

  const db = await getDb();
  const customer = await db
    .collection("customers")
    .findOne({ _id: oid(input.customerId) } as never);
  if (!customer) return fail("That customer no longer exists.");

  let invoice: Invoice | null = null;
  if (input.invoiceId) {
    const doc = await db.collection("invoices").findOne({ _id: oid(input.invoiceId) } as never);
    if (!doc) return fail(NOT_FOUND);
    invoice = toDomain<Invoice>(doc);
    if (invoice.customerId !== input.customerId) {
      return fail("That invoice belongs to a different customer.");
    }
    if (invoice.status === "void" || invoice.status === "draft") {
      return fail(`A ${invoice.status} invoice cannot take payments.`);
    }
    if (invoice.status === "paid") {
      return fail("That invoice is already fully paid.");
    }
    if (amountMinor > invoice.balanceMinor) {
      return fail(
        `The payment exceeds the outstanding balance of ${Math.round(invoice.balanceMinor)} minor units.`,
        { fieldErrors: { amount: ["Amount is larger than the balance"] } },
      );
    }
  }

  const reference = input.reference || (await nextPaymentReference(db));
  const now = new Date();
  const receivedAt = new Date(input.receivedAt);

  const payment = await db.collection("payments").insertOne({
    reference,
    invoiceId: input.invoiceId,
    invoiceNumber: invoice?.invoiceNumber,
    shipmentId: input.shipmentId,
    customerId: input.customerId,
    customerName: (customer as { name?: string }).name,
    amountMinor,
    currency: invoice?.currency ?? "NGN",
    method: input.method,
    collectedByRole: "finance",
    collectedById: context.user.id,
    receivedAt,
    recordedBy: context.user.name,
    notes: input.notes,
    status: "recorded",
    createdAt: now,
  } as never);

  let invoiceStatus: string | undefined;
  if (invoice) {
    const paid = invoice.amountPaidMinor + amountMinor;
    const balance = Math.max(0, invoice.totalMinor - paid);
    invoiceStatus = balance === 0 ? "paid" : "partially_paid";
    const updated = await db.collection("invoices").findOneAndUpdate(
      { _id: oid(invoice.id), version: invoice.version } as never,
      {
        $set: {
          amountPaidMinor: paid,
          balanceMinor: balance,
          status: invoiceStatus,
          paidAt: balance === 0 ? now : null,
          updatedAt: now,
        } as never,
        $inc: { version: 1 },
      } as never,
      { returnDocument: "after" },
    );
    if (!updated) {
      return fail(CONFLICT, { conflict: true, currentVersion: invoice.version });
    }

    await recordAudit({
      actorId: context.user.id,
      actorName: context.user.name,
      actorRole: context.user.role,
      action: "invoice.payment_recorded",
      entityType: "invoice",
      entityId: invoice.id,
      entityLabel: invoice.invoiceNumber,
      before: { amountPaidMinor: invoice.amountPaidMinor, status: invoice.status },
      after: { amountPaidMinor: paid, status: invoiceStatus, payment: reference },
      ip: context.ip,
      userAgent: context.userAgent,
    });

    if (balance === 0) {
      await createNotification({
        type: "payment_discrepancy",
        severity: "low",
        title: `${invoice.invoiceNumber} settled in full`,
        body: `${(customer as { name?: string }).name} cleared ${invoice.invoiceNumber}.`,
        actionHref: "/finance/invoices",
        actionLabel: "Open invoices",
        audienceRole: "finance",
        dedupeKey: `invoice-paid:${invoice.id}`,
      });
    }
  }

  await recordAudit({
    actorId: context.user.id,
    actorName: context.user.name,
    actorRole: context.user.role,
    action: "payment.recorded",
    entityType: "payment",
    entityId: payment.insertedId.toString(),
    entityLabel: reference,
    after: {
      amountMinor,
      method: input.method,
      customer: (customer as { name?: string }).name,
      invoice: invoice?.invoiceNumber,
    },
    ip: context.ip,
    userAgent: context.userAgent,
  });

  return ok({ id: payment.insertedId.toString(), reference, invoiceStatus });
}

export async function changeInvoiceStatus(
  raw: unknown,
  context: ActorContext,
): Promise<ActionResult<{ id: string; status: string; version: number }>> {
  const parsed = invoiceStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("Check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  }
  const { invoiceId, status, expectedVersion, reason } = parsed.data;
  const db = await getDb();

  const doc = await db.collection("invoices").findOne({ _id: oid(invoiceId) } as never);
  if (!doc) return fail(NOT_FOUND);
  const invoice = toDomain<Invoice>(doc);
  if (invoice.version !== expectedVersion) {
    return fail(CONFLICT, { conflict: true, currentVersion: invoice.version });
  }

  if (status === "void" && invoice.amountPaidMinor > 0) {
    return fail("An invoice with payments recorded cannot be voided — issue a credit note instead.");
  }
  if (status === "issued" && invoice.status !== "draft" && invoice.status !== "void") {
    return fail("That invoice has already been issued.");
  }
  if (status === "void" && !reason) {
    return fail("Voiding an invoice needs a written reason.", {
      fieldErrors: { reason: ["Explain why this invoice is being voided"] },
    });
  }

  const updated = await db.collection("invoices").findOneAndUpdate(
    { _id: oid(invoiceId), version: expectedVersion } as never,
    {
      $set: { status, updatedAt: new Date(), notes: reason ?? invoice.notes } as never,
      $inc: { version: 1 },
    } as never,
    { returnDocument: "after" },
  );
  if (!updated) return fail(CONFLICT, { conflict: true, currentVersion: expectedVersion });

  await recordAudit({
    actorId: context.user.id,
    actorName: context.user.name,
    actorRole: context.user.role,
    action: `invoice.${status}`,
    entityType: "invoice",
    entityId: invoiceId,
    entityLabel: invoice.invoiceNumber,
    before: { status: invoice.status },
    after: { status, reason },
    ip: context.ip,
    userAgent: context.userAgent,
  });

  return ok({ id: invoiceId, status, version: invoice.version + 1 });
}

export async function collectCod(
  raw: unknown,
  context: ActorContext,
): Promise<ActionResult<{ id: string; status: string; version: number }>> {
  const parsed = codCollectSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("Check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  }
  const amountMinor = moneyToMinor(parsed.data.amount);
  if (amountMinor <= 0) return fail("The collected amount must be greater than zero.");

  const db = await getDb();
  const doc = await db
    .collection("codRecords")
    .findOne({ shipmentId: parsed.data.shipmentId } as never);
  if (!doc) return fail(NOT_FOUND);
  const record = toDomain<CodRecord>(doc);

  const collected = record.collectedMinor + amountMinor;
  if (collected > record.expectedMinor) {
    return fail(
      "Collecting that amount would exceed the COD expected on this shipment.",
      { fieldErrors: { amount: ["Amount is larger than the expected COD"] } },
    );
  }

  const status = collected >= record.expectedMinor ? "collected" : "partially_collected";
  const updated = await db.collection("codRecords").findOneAndUpdate(
    { _id: oid(record.id), version: record.version } as never,
    {
      $set: {
        collectedMinor: collected,
        driverCollectedMinor: record.driverCollectedMinor + amountMinor,
        status,
        updatedAt: new Date(),
      } as never,
      $inc: { version: 1 },
    } as never,
    { returnDocument: "after" },
  );
  if (!updated) return fail(CONFLICT, { conflict: true, currentVersion: record.version });

  await db.collection("payments").insertOne({
    reference: await nextPaymentReference(db),
    shipmentId: record.shipmentId,
    customerId: record.customerId,
    customerName: record.customerName,
    amountMinor,
    currency: record.currency,
    method: "cash",
    collectedByRole: "driver",
    collectedById: context.user.id,
    receivedAt: new Date(),
    recordedBy: context.user.name,
    notes: parsed.data.note,
    status: "recorded",
    createdAt: new Date(),
  } as never);

  await recordAudit({
    actorId: context.user.id,
    actorName: context.user.name,
    actorRole: context.user.role,
    action: "cod.collected",
    entityType: "cod",
    entityId: record.id,
    entityLabel: record.trackingNumber,
    before: { collectedMinor: record.collectedMinor, status: record.status },
    after: { collectedMinor: collected, status },
    ip: context.ip,
    userAgent: context.userAgent,
  });

  return ok({ id: record.id, status, version: record.version + 1 });
}

export async function reconcileCod(
  raw: unknown,
  context: ActorContext,
): Promise<ActionResult<{ id: string; status: string; version: number }>> {
  const parsed = codReconciliationSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("Check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  }
  const { codId, expectedMinor, settledMinor, discrepancyReason, expectedVersion } = parsed.data;

  const db = await getDb();
  const doc = await db.collection("codRecords").findOne({ _id: oid(codId) } as never);
  if (!doc) return fail(NOT_FOUND);
  const record = toDomain<CodRecord>(doc);
  if (record.version !== expectedVersion) {
    return fail(CONFLICT, { conflict: true, currentVersion: record.version });
  }
  if (record.status === "reconciled") {
    return fail("That COD record has already been reconciled.");
  }
  if (expectedMinor !== record.expectedMinor) {
    return fail("The expected COD changed while you were reconciling. Reload and try again.", {
      conflict: true,
      currentVersion: record.version,
    });
  }

  const hasDiscrepancy = settledMinor !== record.collectedMinor;
  const now = new Date();

  const updated = await db.collection("codRecords").findOneAndUpdate(
    { _id: oid(codId), version: expectedVersion } as never,
    {
      $set: {
        status: "reconciled",
        collectedMinor: settledMinor,
        reconciledAt: now,
        reconciledBy: context.user.name,
        discrepancyReason: hasDiscrepancy ? discrepancyReason ?? undefined : undefined,
        updatedAt: now,
      } as never,
      $inc: { version: 1 },
    } as never,
    { returnDocument: "after" },
  );
  if (!updated) return fail(CONFLICT, { conflict: true, currentVersion: expectedVersion });

  if (record.shipmentId) {
    await db.collection("shipments").updateOne(
      { _id: oid(record.shipmentId) } as never,
      { $set: { paymentStatus: "reconciled", updatedAt: now }, $inc: { version: 1 } } as never,
    );
  }

  await recordAudit({
    actorId: context.user.id,
    actorName: context.user.name,
    actorRole: context.user.role,
    action: "cod.reconciled",
    entityType: "cod",
    entityId: codId,
    entityLabel: record.trackingNumber,
    before: { status: record.status, collectedMinor: record.collectedMinor },
    after: { status: "reconciled", settledMinor, discrepancyReason },
    ip: context.ip,
    userAgent: context.userAgent,
  });

  if (hasDiscrepancy) {
    const { createException } = await import("@/lib/exceptions");
    await createException(
      {
        type: "payment_issue",
        severity: "high",
        title: `COD discrepancy on ${record.trackingNumber}`,
        description: discrepancyReason
          ? `Expected ${record.expectedMinor} minor units, settled ${settledMinor}. Reason: ${discrepancyReason}`
          : `Expected ${record.expectedMinor} minor units, settled ${settledMinor}.`,
        shipmentId: record.shipmentId,
        hubId: undefined,
      },
      context,
    ).catch(() => undefined);
    await createNotification({
      type: "payment_discrepancy",
      severity: "high",
      title: `COD discrepancy on ${record.trackingNumber}`,
      body: `Settled ${settledMinor} against ${record.expectedMinor} expected.`,
      actionHref: "/finance/cod",
      actionLabel: "Open COD",
      audienceRole: "finance",
      dedupeKey: `cod-gap:${codId}`,
    });
  }

  return ok({ id: codId, status: "reconciled", version: record.version + 1 });
}
