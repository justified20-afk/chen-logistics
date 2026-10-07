import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { listTrips, tripFilterSchema, type TripListFilter } from "@/lib/dispatch";
import { getDb } from "@/lib/mongodb";
import { PageHeader } from "@/components/layout/page-header";
import { TripsTable } from "@/components/dispatch/trips-table";
import { NewTripButton } from "@/components/dispatch/new-trip-button";
import { FilterBar, UrlDateFilter, UrlSelect } from "@/components/tables/url-filters";
import { TRIP_STATUSES, type Driver, type Hub, type Vehicle } from "@/types/domain";
import { humanise } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dispatch",
  robots: { index: false, follow: false },
};

function readFilters(raw: Record<string, string | string[] | undefined>): TripListFilter {
  const plain: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    plain[key] = Array.isArray(value) ? value[0] : value;
  }
  const parsed = tripFilterSchema.safeParse(plain);
  return parsed.success ? parsed.data : {};
}

export default async function DispatchPage({
  searchParams,
}: PageProps<"/dispatch">): Promise<React.JSX.Element> {
  const user = await requirePermission("dispatch.view");
  const raw = await searchParams;
  const filter = readFilters(raw);

  const canCreate = user.permissions.includes("dispatch.create");
  const canAssign = user.permissions.includes("dispatch.assign");
  const canDispatch = user.permissions.includes("dispatch.dispatch");

  const db = await getDb();
  const [result, statusAgg, hubDocs, driverDocs, vehicleDocs] = await Promise.all([
    listTrips(filter, user),
    db.collection("trips").aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]).toArray(),
    db.collection("hubs").find({}).sort({ name: 1 }).toArray(),
    canCreate || canAssign
      ? db
          .collection("drivers")
          .find({ status: { $nin: ["suspended", "inactive"] } } as never)
          .sort({ name: 1 })
          .toArray()
      : Promise.resolve([]),
    canCreate || canAssign
      ? db
          .collection("vehicles")
          .find({ status: { $nin: ["inactive"] } } as never)
          .sort({ registrationNumber: 1 })
          .toArray()
      : Promise.resolve([]),
  ]);

  const hubs = hubDocs as unknown as Hub[];
  const drivers = driverDocs as unknown as Driver[];
  const vehicles = vehicleDocs as unknown as Vehicle[];
  const counts = new Map(statusAgg.map((row) => [String(row._id), Number(row.count ?? 0)]));
  const activeFilters = [filter.q, filter.status, filter.hubId, filter.from, filter.to].filter(Boolean).length;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Dispatch"
        description="Plan trips between hubs, load shipments within capacity, assign driver and vehicle, then dispatch with an auditable history."
        actions={
          canCreate ? (
            <NewTripButton
              hubs={hubs.map((hub) => ({ value: hub.id, label: hub.name }))}
              drivers={drivers.map((driver) => ({
                value: driver.id,
                label: `${driver.name} · ${humanise(driver.status)}`,
              }))}
              vehicles={vehicles.map((vehicle) => ({
                value: vehicle.id,
                label: `${vehicle.registrationNumber} · ${humanise(vehicle.status)}`,
              }))}
            />
          ) : null
        }
      />

      <div className="flex flex-wrap gap-2">
        {TRIP_STATUSES.filter((status) => (counts.get(status) ?? 0) > 0).map((status) => (
          <span
            key={status}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs"
          >
            <span className="font-medium">{humanise(status)}</span>
            <span className="tabular-nums text-muted-foreground">{counts.get(status) ?? 0}</span>
          </span>
        ))}
        {counts.size === 0 ? (
          <span className="text-sm text-muted-foreground">No trips planned yet.</span>
        ) : null}
      </div>

      <div className="space-y-3">
        <FilterBar activeCount={activeFilters}>
          <UrlSelect
            param="status"
            label="Status"
            options={TRIP_STATUSES.map((value) => ({ value, label: humanise(value) }))}
            allLabel="Any status"
          />
          <UrlSelect
            param="hubId"
            label="Hub"
            options={hubs.map((hub) => ({ value: hub.id, label: hub.name }))}
            allLabel="Any hub"
          />
          <UrlDateFilter param="from" label="Date from" />
          <UrlDateFilter param="to" label="Date to" />
        </FilterBar>

        <TripsTable
          rows={result.rows}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
          sort={filter.sort}
          dir={filter.dir}
          canDispatch={canDispatch}
        />
      </div>
    </div>
  );
}
