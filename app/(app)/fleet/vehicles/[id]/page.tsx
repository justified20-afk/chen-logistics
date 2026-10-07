import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/session";
import { getDb } from "@/lib/mongodb";
import { oid, toDomain, toDomainList } from "@/lib/db";
import { Card, ShipmentStatusBadge, VehicleStatusBadge } from "@/components/ui/status-badge";
import type { Shipment, Vehicle } from "@/types/domain";

export const dynamic = "force-dynamic";

interface VehicleParams {
  params: Promise<{ id: string }>;
}

async function findVehicle(id: string): Promise<Vehicle | null> {
  const _id = oid(id);
  if (!_id) return null;
  const db = await getDb();
  const doc = await db.collection("vehicles").findOne({ _id } as never);
  return doc ? toDomain<Vehicle>(doc) : null;
}

export async function generateMetadata({ params }: VehicleParams): Promise<Metadata> {
  const { id } = await params;
  const vehicle = await findVehicle(id);
  return {
    title: vehicle ? `${vehicle.registrationNumber} — Vehicles` : "Vehicle",
    robots: { index: false, follow: false },
  };
}

export default async function VehicleDetailPage({ params }: VehicleParams): Promise<React.JSX.Element> {
  await requirePermission("fleet.view");
  const { id } = await params;
  const vehicle = await findVehicle(id);
  if (!vehicle) notFound();

  const db = await getDb();
  const [statusAgg, recentDocs] = await Promise.all([
    db
      .collection("shipments")
      .aggregate([{ $match: { vehicleId: vehicle.id } }, { $group: { _id: "$status", count: { $sum: 1 } } }])
      .toArray(),
    db
      .collection("shipments")
      .find({ vehicleId: vehicle.id } as never)
      .project({ trackingNumber: 1, status: 1, createdAt: 1, "recipient.city": 1, promisedDeliveryAt: 1 })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray(),
  ]);
  const counts = new Map(statusAgg.map((row) => [String(row._id), Number(row.count ?? 0)]));
  const shipments = toDomainList<Partial<Shipment>>(recentDocs as never[]);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <Link
        href="/fleet/vehicles"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Back to vehicles
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="heading text-2xl font-semibold tracking-tight">{vehicle.registrationNumber}</h1>
            <VehicleStatusBadge status={vehicle.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {vehicle.type} · {vehicle.capacityWeightKg} kg capacity · base hub {vehicle.hubName ?? "—"}
          </p>
        </div>
        <Link
          href={`/dispatch?q=${encodeURIComponent(vehicle.registrationNumber)}`}
          className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-surface-hover"
        >
          Open on dispatch board
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Packages on this vehicle" value={String([...counts.values()].reduce((a, b) => a + b, 0))} />
        <Stat label="In transit" value={String(counts.get("in_transit") ?? 0)} />
        <Stat label="Out for delivery" value={String(counts.get("out_for_delivery") ?? 0)} />
        <Stat label="Capacity" value={`${vehicle.capacityPackages} pkgs`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Recent shipments" description="Newest movements on this vehicle" className="lg:col-span-2">
          {shipments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shipments on record for this vehicle.</p>
          ) : (
            <ul className="divide-y divide-border">
              {shipments.map((shipment) => (
                <li key={shipment.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link
                      href={`/shipments/${shipment.id ?? ""}`}
                      className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      {shipment.trackingNumber}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {shipment.recipient?.city ?? "—"} · promised{" "}
                      {shipment.promisedDeliveryAt
                        ? new Date(shipment.promisedDeliveryAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
                        : "—"}
                    </p>
                  </div>
                  {shipment.status ? <ShipmentStatusBadge status={shipment.status} /> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Record">
          <dl className="space-y-3 text-sm">
            <Fact label="Driver" value={vehicle.driverName ?? "—"} />
            <Fact label="Year" value={vehicle.year ? String(vehicle.year) : "—"} />
            <Fact label="Odometer" value={vehicle.odometerKm ? `${vehicle.odometerKm.toLocaleString("en-US")} km` : "—"} />
            <Fact
              label="Insurance expires"
              value={vehicle.insuranceExpiry ? new Date(vehicle.insuranceExpiry).toLocaleDateString("en-GB") : "—"}
            />
            <Fact
              label="Inspection expires"
              value={vehicle.inspectionExpiry ? new Date(vehicle.inspectionExpiry).toLocaleDateString("en-GB") : "—"}
            />
            <Fact
              label="Maintenance due"
              value={vehicle.maintenanceDueAt ? new Date(vehicle.maintenanceDueAt).toLocaleDateString("en-GB") : "—"}
            />
          </dl>
        </Card>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
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
