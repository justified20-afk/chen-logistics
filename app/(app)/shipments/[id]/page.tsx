import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getShipment, listTrackingEvents } from "@/lib/shipments";
import { getDb } from "@/lib/mongodb";
import { oid, toDomain, toDomainList } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { humanise } from "@/components/ui/status-badge";
import {
  Card,
  DelayBadge,
  PaymentStatusBadge,
  ShipmentStatusBadge,
} from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { ShipmentTimeline } from "@/components/shipments/shipment-timeline";
import { ShipmentActionMenu, ShipmentActions } from "@/components/shipments/shipment-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  AuditLog,
  DeliveryAttempt,
  Invoice,
  Pickup,
  ProofOfDelivery,
  Trip,
} from "@/types/domain";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/shipments/[id]">): Promise<Metadata> {
  const { id } = await params;
  const shipment = await getShipment(id);
  return {
    title: shipment ? `Shipment ${shipment.trackingNumber}` : "Shipment",
    robots: { index: false, follow: false },
  };
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium break-words">{value}</dd>
    </div>
  );
}

function formatWhen(value?: string, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export default async function ShipmentDetailPage({
  params,
}: PageProps<"/shipments/[id]">): Promise<React.JSX.Element> {
  const user = await requireUser();
  const { id } = await params;

  if (
    !user.permissions.includes("shipments.view") &&
    user.role !== "customer" &&
    user.role !== "driver"
  ) {
    redirect("/denied");
  }

  const shipment = await getShipment(id);
  if (!shipment) notFound();

  const db = await getDb();
  const isCustomerOwner =
    user.role === "customer" && user.customerId === shipment.customerId;
  const isAssignedDriver = user.role === "driver" && user.driverId === shipment.driverId;
  if (user.role === "customer" && !isCustomerOwner) notFound();
  if (user.role === "driver" && !isAssignedDriver) notFound();

  const [events, attemptDocs, podDoc, auditDocs, invoiceDoc, tripDoc, pickupDoc] =
    await Promise.all([
      listTrackingEvents(shipment.id),
      db
        .collection("deliveryAttempts")
        .find({ shipmentId: shipment.id } as never)
        .sort({ attemptedAt: -1 })
        .toArray(),
      db.collection("proofOfDelivery").findOne({ shipmentId: shipment.id } as never),
      db
        .collection("auditLogs")
        .find({ entityType: "shipment", entityId: shipment.id } as never)
        .sort({ createdAt: -1 })
        .limit(30)
        .toArray(),
      shipment.invoiceId
        ? db.collection("invoices").findOne({ _id: oid(shipment.invoiceId) } as never)
        : Promise.resolve(null),
      shipment.tripId
        ? db.collection("trips").findOne({ _id: oid(shipment.tripId) } as never)
        : Promise.resolve(null),
      shipment.pickupId
        ? db.collection("pickups").findOne({ _id: oid(shipment.pickupId) } as never)
        : Promise.resolve(null),
    ]);

  const attempts = toDomainList<DeliveryAttempt>(attemptDocs);
  const pod = podDoc ? toDomain<ProofOfDelivery>(podDoc) : null;
  const audits = toDomainList<AuditLog>(auditDocs);
  const invoice = invoiceDoc ? toDomain<Invoice>(invoiceDoc) : null;
  const trip = tripDoc ? toDomain<Trip>(tripDoc) : null;
  const pickup = pickupDoc ? toDomain<Pickup>(pickupDoc) : null;

  const canStatus = user.permissions.includes("shipments.status");
  const canCorrect = ["administrator", "operations_manager"].includes(user.role);
  const showFinancials = user.permissions.includes("finance.view") || isCustomerOwner;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title={shipment.trackingNumber}
        badge={
          <span className="flex flex-wrap items-center gap-2">
            <ShipmentStatusBadge status={shipment.status} />
            <StatusBadge label={humanise(shipment.priority)} tone={shipment.priority === "urgent" ? "danger" : shipment.priority === "high" ? "warning" : "neutral"} />
            <DelayBadge reason={shipment.delayedReason} />
          </span>
        }
        description={
          <>
            {shipment.customerName} · {shipment.originHubName} → {shipment.destinationHubName}
            {shipment.tripNumber ? (
              <>
                {" · "}
                <Link href={`/dispatch/${shipment.tripId}`} className="text-primary underline-offset-4 hover:underline">
                  {shipment.tripNumber}
                </Link>
              </>
            ) : null}
          </>
        }
        actions={
          <>
            <ShipmentActions
              shipment={shipment}
              canStatus={canStatus}
              canCorrect={canCorrect}
            />
            {!isCustomerOwner ? <ShipmentActionMenu shipment={shipment} /> : null}
          </>
        }
      />

      {/* Summary */}
      <Card title="Shipment summary">
        <div className="grid gap-x-8 gap-y-1 md:grid-cols-3">
          <dl>
            <Row label="Sender" value={shipment.sender.name} />
            <Row label="Sender phone" value={<span className="font-mono text-xs">{shipment.sender.phone}</span>} />
            <Row label="Origin" value={`${shipment.sender.city}, ${shipment.sender.state}`} />
            <Row label="Service" value={<span className="capitalize">{shipment.serviceLevel.replace("_", " ")}</span>} />
          </dl>
          <dl>
            <Row label="Recipient" value={shipment.recipient.name} />
            <Row label="Recipient phone" value={<span className="font-mono text-xs">{shipment.recipient.phone}</span>} />
            <Row label="Destination" value={`${shipment.recipient.city}, ${shipment.recipient.state}`} />
            <Row
              label="Landmark"
              value={shipment.recipient.landmark ?? "—"}
            />
          </dl>
          <dl>
            <Row label="Packages" value={`${shipment.totalPackages} (${shipment.packages.length} line${shipment.packages.length === 1 ? "" : "s"})`} />
            <Row label="Weight" value={`${shipment.totalWeightKg.toFixed(1)} kg`} />
            <Row
              label="Dimensions"
              value={shipment.packages
                .slice(0, 2)
                .map((pkg) => `${pkg.lengthCm}×${pkg.widthCm}×${pkg.heightCm} cm`)
                .join(", ")}
            />
            <Row label="Promised by" value={formatWhen(shipment.promisedDeliveryAt, true)} />
          </dl>
        </div>
        {shipment.notes ? (
          <p className="mt-3 rounded-md border border-border bg-muted/60 px-3 py-2 text-sm">
            {shipment.notes}
          </p>
        ) : null}
      </Card>

      {/* Timeline + assignment */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card
          title="Tracking timeline"
          description={`${events.length} event${events.length === 1 ? "" : "s"} — newest first. History is never rewritten.`}
        >
          <ShipmentTimeline events={events} />
        </Card>

        <div className="space-y-5">
          <Card title="Assignment">
            <dl>
              <Row
                label="Driver"
                value={
                  shipment.driverId ? (
                    <Link href={`/fleet/drivers/${shipment.driverId}`} className="text-primary underline-offset-4 hover:underline">
                      {shipment.driverName}
                    </Link>
                  ) : (
                    <StatusBadge label="Unassigned" tone="warning" />
                  )
                }
              />
              <Row
                label="Vehicle"
                value={
                  shipment.vehicleRegistration ? (
                    <Link href={`/fleet/vehicles/${shipment.vehicleId}`} className="text-primary underline-offset-4 hover:underline">
                      {shipment.vehicleRegistration}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <Row
                label="Trip"
                value={
                  trip ? (
                    <Link href={`/dispatch/${trip.id}`} className="text-primary underline-offset-4 hover:underline">
                      {trip.tripNumber}
                    </Link>
                  ) : (
                    <StatusBadge label="Not on a trip" tone="neutral" />
                  )
                }
              />
              <Row
                label="Pickup"
                value={
                  pickup ? (
                    <Link href={`/pickups/${pickup.id}`} className="text-primary underline-offset-4 hover:underline">
                      {pickup.reference}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <Row label="Origin hub" value={shipment.originHubName} />
              <Row label="Destination hub" value={shipment.destinationHubName} />
              <Row label="Picked up" value={formatWhen(shipment.pickedUpAt, true)} />
              <Row label="Delivered" value={formatWhen(shipment.deliveredAt, true)} />
            </dl>
          </Card>

          {showFinancials ? (
            <Card title="Financial">
              <dl>
                <Row label="Shipping fee" value={formatMoney(shipment.shippingFeeMinor, "NGN")} />
                <Row
                  label="Declared value"
                  value={
                    shipment.declaredValueMinor
                      ? formatMoney(shipment.declaredValueMinor, "NGN")
                      : "—"
                  }
                />
                <Row
                  label="COD amount"
                  value={
                    shipment.codAmountMinor ? (
                      <span className="font-semibold">{formatMoney(shipment.codAmountMinor, "NGN")}</span>
                    ) : (
                      "—"
                    )
                  }
                />
                <Row label="Payment" value={<PaymentStatusBadge status={shipment.paymentStatus} />} />
                <Row
                  label="Invoice"
                  value={
                    invoice ? (
                      <Link href={`/finance/invoices?highlight=${invoice.invoiceNumber}`} className="text-primary underline-offset-4 hover:underline">
                        {invoice.invoiceNumber}
                      </Link>
                    ) : (
                      <Link href="/finance/invoices" className="text-primary underline-offset-4 hover:underline">
                        Create invoice
                      </Link>
                    )
                  }
                />
              </dl>
            </Card>
          ) : null}
        </div>
      </div>

      {/* Delivery attempts + POD */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          title="Delivery attempts"
          description={`${shipment.attemptCount} attempt${shipment.attemptCount === 1 ? "" : "s"} recorded`}
        >
          {attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No delivery attempt has been recorded yet.{" "}
              {user.permissions.includes("deliveries.manage")
                ? "Record one from the deliveries workspace."
                : ""}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {attempts.map((attempt) => (
                <li key={attempt.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">Attempt {attempt.attemptNumber}</span>
                    <StatusBadge
                      label={attempt.outcome === "delivered" ? "Delivered" : "Failed"}
                      tone={attempt.outcome === "delivered" ? "success" : "danger"}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatWhen(attempt.attemptedAt, true)} · {attempt.driverName ?? "Unknown driver"}
                  </p>
                  {attempt.reason ? (
                    <p className="mt-1 text-sm">
                      <span className="text-muted-foreground">Reason:</span>{" "}
                      <span className="font-medium">{humanise(attempt.reason)}</span>
                    </p>
                  ) : null}
                  {attempt.note ? <p className="mt-1 text-sm text-muted-foreground">{attempt.note}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Proof of delivery" description="Recipient confirmation captured at the door">
          {!pod ? (
            <p className="text-sm text-muted-foreground">
              {shipment.status === "delivered"
                ? "Delivered without a stored proof-of-delivery record."
                : "No proof of delivery yet — it is recorded when a delivery succeeds."}
            </p>
          ) : (
            <dl>
              <Row label="Recipient" value={pod.recipientName} />
              <Row label="Relationship" value={pod.relationship ?? "—"} />
              <Row label="Delivered at" value={formatWhen(pod.deliveredAt, true)} />
              <Row label="Driver" value={pod.driverName ?? "—"} />
              <Row label="Location" value={pod.location} />
              <Row
                label="Signature"
                value={pod.signatureRef ? <span className="font-mono text-xs">{pod.signatureRef}</span> : "—"}
              />
              <Row
                label="Photo"
                value={pod.photoRef ? <span className="font-mono text-xs">{pod.photoRef}</span> : "—"}
              />
              {pod.note ? <Row label="Note" value={pod.note} /> : null}
            </dl>
          )}
        </Card>
      </div>

      {/* Audit */}
      <Card
        title="Audit history"
        description="Who changed what, with the before and after values. Credential-shaped fields are never stored."
      >
        {audits.length === 0 ? (
          <p className="text-sm text-muted-foreground">No audited changes recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {audits.map((entry) => (
              <li key={entry.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">{entry.action}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatWhen(entry.createdAt, true)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {entry.actorName ?? "System"} {entry.actorRole ? `(${humanise(entry.actorRole)})` : ""}
                </p>
                {entry.before || entry.after ? (
                  <pre className="mt-1.5 overflow-x-auto rounded-md border border-border bg-muted/60 p-2 text-[11px] leading-relaxed">
                    {JSON.stringify({ before: entry.before, after: entry.after }, null, 2)}
                  </pre>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
