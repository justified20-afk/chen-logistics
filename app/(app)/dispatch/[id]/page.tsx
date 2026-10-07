import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/session";
import { getTrip } from "@/lib/dispatch";
import { getDb } from "@/lib/mongodb";
import { oid, toDomainList } from "@/lib/db";
import { TripPanel } from "@/components/dispatch/trip-panel";
import { Card, humanise } from "@/components/ui/status-badge";
import type { AssignmentHistoryEntry, Driver, Vehicle } from "@/types/domain";

export const dynamic = "force-dynamic";

interface TripParams {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: TripParams): Promise<Metadata> {
  const { id } = await params;
  const trip = await getTrip(id);
  return {
    title: trip ? `${trip.tripNumber} — Dispatch` : "Trip",
    robots: { index: false, follow: false },
  };
}

function formatStamp(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function TripDetailPage({ params }: TripParams): Promise<React.JSX.Element> {
  const user = await requirePermission("dispatch.view");
  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip) notFound();

  const canAssign = user.permissions.includes("dispatch.assign");
  const canDispatch = user.permissions.includes("dispatch.dispatch");

  const db = await getDb();
  const [driverDocs, vehicleDocs, historyDocs, shipmentDocs] = await Promise.all([
    db
      .collection("drivers")
      .find({ status: { $nin: ["suspended", "inactive"] } } as never)
      .sort({ name: 1 })
      .toArray(),
    db
      .collection("vehicles")
      .find({ status: { $ne: "inactive" } } as never)
      .sort({ registrationNumber: 1 })
      .toArray(),
    db
      .collection("assignmentHistory")
      .find({ entityType: "trip", entityId: trip.id } as never)
      .sort({ createdAt: -1 })
      .limit(12)
      .toArray(),
    trip.shipments.length > 0
      ? db
          .collection("shipments")
          .find({ _id: { $in: trip.shipments.map((entry) => oid(entry.shipmentId)) } } as never)
          .project({ status: 1, delayedReason: 1 })
          .toArray()
      : Promise.resolve([]),
  ]);

  const drivers = driverDocs as unknown as Driver[];
  const vehicles = vehicleDocs as unknown as Vehicle[];
  const history = toDomainList<AssignmentHistoryEntry>(historyDocs as never[]);
  const statuses = new Map<string, { status: string; delayed?: boolean }>();
  for (const row of shipmentDocs as { _id: unknown; status?: string; delayedReason?: string | null }[]) {
    statuses.set(String(row._id), {
      status: row.status ?? "booked",
      delayed: Boolean(row.delayedReason),
    });
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <Link
        href="/dispatch"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Back to the dispatch board
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="heading font-mono text-2xl font-semibold tracking-tight">
              {trip.tripNumber}
            </h1>
            <span className="rounded border border-border bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {humanise(trip.date)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {trip.originHubName ?? "—"} → {trip.destinationHubName ?? "—"} ·{" "}
            {trip.totalPackages} package{trip.totalPackages === 1 ? "" : "s"} · {trip.totalWeightKg} kg
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <TripPanel
            trip={trip}
            shipmentStatuses={Object.fromEntries(statuses)}
            drivers={drivers.map((driver) => ({
              value: driver.id,
              label: `${driver.name} · ${humanise(driver.status)}`,
            }))}
            vehicles={vehicles.map((vehicle) => ({
              value: vehicle.id,
              label: `${vehicle.registrationNumber} · ${humanise(vehicle.status)}`,
            }))}
            canAssign={canAssign}
            canDispatch={canDispatch}
          />

          <Card title="Assignment history" description="Every reassignment, with who and why">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No reassignments recorded — this trip still has its original plan.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {history.map((entry) => (
                  <li key={entry.id} className="py-2.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <p className="text-sm">
                        <span className="font-medium capitalize">{entry.field}</span>{" "}
                        <span className="text-muted-foreground">
                          {entry.previousValue ? `${entry.previousValue} → ` : "unassigned → "}
                          {entry.newValue || "unassigned"}
                        </span>
                      </p>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatStamp(entry.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      by {entry.actorName ?? "system"}
                      {entry.reason ? ` · ${entry.reason}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Facts">
            <dl className="space-y-3 text-sm">
              <Fact label="Status" value={humanise(trip.status)} />
              <Fact label="Trip date" value={trip.date} />
              <Fact
                label="Planned departure"
                value={trip.plannedDepartureAt ? formatStamp(trip.plannedDepartureAt) : "—"}
              />
              <Fact
                label="Actual departure"
                value={trip.actualDepartureAt ? formatStamp(trip.actualDepartureAt) : "—"}
              />
              <Fact label="Driver" value={trip.driverName ?? "Unassigned"} />
              <Fact label="Vehicle" value={trip.vehicleRegistration ?? "Unassigned"} />
              <Fact
                label="Capacity"
                value={
                  trip.capacityPackages > 0
                    ? `${trip.totalPackages}/${trip.capacityPackages} pkg · ${trip.totalWeightKg}/${trip.capacityWeightKg} kg`
                    : "No vehicle assigned"
                }
              />
              <Fact label="Version" value={String(trip.version)} />
            </dl>
          </Card>

          {trip.notes ? (
            <Card title="Notes">
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{trip.notes}</p>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
