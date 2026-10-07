import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { getDb } from "@/lib/mongodb";
import { toDomainList } from "@/lib/db";
import { fleetFilterSchema } from "@/lib/schemas/fleet";
import { PageHeader } from "@/components/layout/page-header";
import { VehiclesTable } from "@/components/fleet/vehicles-table";
import { FilterBar, UrlSelect } from "@/components/tables/url-filters";
import { VEHICLE_STATUSES, type Hub, type Vehicle } from "@/types/domain";
import { humanise } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vehicles",
  robots: { index: false, follow: false },
};

export default async function VehiclesPage({
  searchParams,
}: PageProps<"/fleet/vehicles">): Promise<React.JSX.Element> {
  await requirePermission("fleet.view");
  const raw = await searchParams;
  const plain: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    plain[key] = Array.isArray(value) ? value[0] : value;
  }
  const parsed = fleetFilterSchema.safeParse(plain);
  const filter = parsed.success ? parsed.data : {};

  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? 20;

  const query: Record<string, unknown> = {};
  if (filter.q) {
    const escaped = filter.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [{ registrationNumber: regex }, { driverName: regex }, { type: regex }];
  }
  if (filter.status) query.status = filter.status;
  if (filter.hubId) query.hubId = filter.hubId;

  const SORTABLE: Record<string, string> = {
    registrationNumber: "registrationNumber",
    status: "status",
    insuranceExpiry: "insuranceExpiry",
    inspectionExpiry: "inspectionExpiry",
    odometerKm: "odometerKm",
  };
  const sortKey = SORTABLE[filter.sort ?? ""] ?? "registrationNumber";
  const direction = filter.dir === "asc" ? 1 : -1;

  const db = await getDb();
  const [total, docs, hubDocs, statusAgg] = await Promise.all([
    db.collection("vehicles").countDocuments(query as never),
    db
      .collection("vehicles")
      .find(query as never)
      .sort({ [sortKey]: direction } as never)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
    db.collection("hubs").find({}).sort({ name: 1 }).toArray(),
    db.collection("vehicles").aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]).toArray(),
  ]);

  const vehicles = toDomainList<Vehicle>(docs);
  const hubs = toDomainList<Hub>(hubDocs);
  const counts = new Map(statusAgg.map((row) => [String(row._id), Number(row.count ?? 0)]));

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Vehicles"
        description="Capacity, availability and compliance dates for every vehicle in the fleet."
      />

      <div className="flex flex-wrap gap-2">
        {VEHICLE_STATUSES.filter((status) => (counts.get(status) ?? 0) > 0).map((status) => (
          <span
            key={status}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs"
          >
            <span className="font-medium">{humanise(status)}</span>
            <span className="tabular-nums text-muted-foreground">{counts.get(status) ?? 0}</span>
          </span>
        ))}
      </div>

      <div className="space-y-3">
        <FilterBar activeCount={[filter.q, filter.status, filter.hubId].filter(Boolean).length}>
          <UrlSelect
            param="status"
            label="Status"
            options={VEHICLE_STATUSES.map((value) => ({ value, label: humanise(value) }))}
            allLabel="Any status"
          />
          <UrlSelect
            param="hubId"
            label="Hub"
            options={hubs.map((hub) => ({ value: hub.id, label: hub.name }))}
            allLabel="Any hub"
          />
        </FilterBar>

        <VehiclesTable
          rows={vehicles}
          total={total}
          page={page}
          pageSize={pageSize}
          sort={filter.sort}
          dir={filter.dir}
        />
      </div>
    </div>
  );
}
