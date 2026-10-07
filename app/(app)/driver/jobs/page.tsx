import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { listShipments } from "@/lib/shipments";
import { getDb } from "@/lib/mongodb";
import { toDomainList } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card, PickupStatusBadge, ShipmentStatusBadge, TripStatusBadge } from "@/components/ui/status-badge";
import type { Pickup, Trip } from "@/types/domain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My jobs",
  robots: { index: false, follow: false },
};

export default async function DriverJobsPage(): Promise<React.JSX.Element> {
  const user = await requirePermission("driver.portal");
  const db = await getDb();
  const driverId = user.driverId ?? "__none__";

  const [trips, pickupDocs, shipmentResult] = await Promise.all([
    db
      .collection("trips")
      .find({ driverId } as never)
      .sort({ date: -1 })
      .limit(50)
      .toArray(),
    db
      .collection("pickups")
      .find({ driverId, status: { $nin: ["picked_up", "cancelled"] } } as never)
      .sort({ scheduledFor: 1 })
      .limit(50)
      .toArray(),
    listShipments({ pageSize: 50 }, user),
  ]);
  const tripRows = toDomainList<Trip>(trips as never[]);
  const pickupRows = toDomainList<Pickup>(pickupDocs as never[]);
  const shipments = shipmentResult.rows.filter((shipment) => !["delivered", "returned", "cancelled"].includes(shipment.status));

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="My jobs"
        description="Every open assignment on your record — trips, pickups and parcels. Completed work stays in the system for audit."
      />

      <Card title="Trips" description={`${tripRows.length} trip(s) on record`}>
        {tripRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trips assigned yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {tripRows.map((trip) => (
              <li key={trip.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link href={`/dispatch/${trip.id}`} className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline">
                    {trip.tripNumber}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {trip.originHubName ?? "—"} → {trip.destinationHubName ?? "—"} ·{" "}
                    {new Date(trip.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                  </p>
                </div>
                <TripStatusBadge status={trip.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Pickups" description={`${pickupRows.length} open pickup(s)`}>
        {pickupRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open pickups.</p>
        ) : (
          <ul className="divide-y divide-border">
            {pickupRows.map((pickup) => (
              <li key={pickup.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link href={`/shipments/${pickup.shipmentId}`} className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline">
                    {pickup.reference}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {pickup.address.street}, {pickup.address.city} ·{" "}
                    {new Date(pickup.scheduledFor).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <PickupStatusBadge status={pickup.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Parcels" description={`${shipments.length} active shipment(s)`}>
        {shipments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active shipments assigned.</p>
        ) : (
          <ul className="divide-y divide-border">
            {shipments.map((shipment) => (
              <li key={shipment.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link href={`/shipments/${shipment.id}`} className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline">
                    {shipment.trackingNumber}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {shipment.recipient.name} · {shipment.recipient.city}
                  </p>
                </div>
                <ShipmentStatusBadge status={shipment.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
