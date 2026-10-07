import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { getDb } from "@/lib/mongodb";
import { toDomainList } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card, PickupStatusBadge, ShipmentStatusBadge, TripStatusBadge } from "@/components/ui/status-badge";
import type { Pickup, Shipment, Trip } from "@/types/domain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Today",
  robots: { index: false, follow: false },
};

export default async function DriverTodayPage(): Promise<React.JSX.Element> {
  const user = await requirePermission("driver.portal");
  const db = await getDb();
  const driverId = user.driverId ?? "__none__";

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 3600_000);

  const [tripDocs, pickupDocs, shipmentDocs] = await Promise.all([
    db
      .collection("trips")
      .find({
        driverId,
        status: { $in: ["assigned", "ready", "dispatched", "in_transit", "arrived"] },
      } as never)
      .sort({ date: 1 })
      .limit(10)
      .toArray(),
    db
      .collection("pickups")
      .find({
        driverId,
        status: { $in: ["driver_assigned", "en_route", "arrived", "scheduled"] },
        scheduledFor: { $lt: endOfDay },
      } as never)
      .sort({ scheduledFor: 1 })
      .limit(10)
      .toArray(),
    db
      .collection("shipments")
      .find({
        driverId,
        status: { $in: ["picked_up", "out_for_delivery", "delivery_attempted", "failed", "awaiting_pickup"] },
      } as never)
      .sort({ promisedDeliveryAt: 1 })
      .limit(10)
      .toArray(),
  ]);

  const trips = toDomainList<Trip>(tripDocs as never[]);
  const pickups = toDomainList<Pickup>(pickupDocs as never[]);
  const shipments = toDomainList<Partial<Shipment>>(shipmentDocs as never[]);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title={`Today, ${user.name.split(" ")[0]}`}
        description={`${now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} · trips, pickups and deliveries currently assigned to you.`}
      />

      {!user.driverId ? (
        <Card title="No driver record linked" description="Your login is not linked to a driver record yet. Contact operations.">
          <p className="text-sm text-muted-foreground">Once linked, your jobs will appear here and in My jobs.</p>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Active trips" value={String(trips.length)} />
        <Stat label="Pickups due" value={String(pickups.length)} />
        <Stat label="Parcels with you" value={String(shipments.length)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          title="Trips"
          description="Assigned, ready or on the road today"
          actions={
            <Link href="/driver/jobs" className="text-xs font-medium text-primary underline-offset-4 hover:underline">
              All jobs
            </Link>
          }
        >
          {trips.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active trips assigned right now.</p>
          ) : (
            <ul className="divide-y divide-border">
              {trips.map((trip) => (
                <li key={trip.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/dispatch/${trip.id}`} className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline">
                      {trip.tripNumber}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {trip.originHubName ?? "—"} → {trip.destinationHubName ?? "—"} · {trip.totalPackages} package(s)
                    </p>
                  </div>
                  <TripStatusBadge status={trip.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Pickups" description="Collections you are assigned to">
          {pickups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pickups on your list.</p>
          ) : (
            <ul className="divide-y divide-border">
              {pickups.map((pickup) => (
                <li key={pickup.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/shipments/${pickup.shipmentId}`} className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline">
                      {pickup.reference}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {pickup.address.street}, {pickup.address.city} ·{" "}
                      {new Date(pickup.scheduledFor).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <PickupStatusBadge status={pickup.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Parcels on you" description="Assigned shipments being collected or delivered">
        {shipments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No parcels currently assigned.</p>
        ) : (
          <ul className="divide-y divide-border">
            {shipments.map((shipment) => (
              <li key={shipment.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link href={`/shipments/${shipment.id ?? ""}`} className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline">
                    {shipment.trackingNumber}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {shipment.recipient?.name ?? "—"} · {shipment.recipient?.city ?? ""}
                  </p>
                </div>
                {shipment.status ? <ShipmentStatusBadge status={shipment.status} /> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
