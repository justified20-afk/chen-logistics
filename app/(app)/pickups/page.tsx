import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { listPickups, pickupFilterSchema, type PickupListFilter } from "@/lib/pickups";
import { getDb } from "@/lib/mongodb";
import { PageHeader } from "@/components/layout/page-header";
import { PickupsTable } from "@/components/pickups/pickups-table";
import { FilterBar, UrlDateFilter, UrlSelect } from "@/components/tables/url-filters";
import { PICKUP_STATUSES, type Driver, type Hub } from "@/types/domain";
import { humanise } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pickups",
  robots: { index: false, follow: false },
};

function readFilters(raw: Record<string, string | string[] | undefined>): PickupListFilter {
  const plain: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    plain[key] = Array.isArray(value) ? value[0] : value;
  }
  const parsed = pickupFilterSchema.safeParse(plain);
  return parsed.success ? parsed.data : {};
}

export default async function PickupsPage({
  searchParams,
}: PageProps<"/pickups">): Promise<React.JSX.Element> {
  const user = await requirePermission("shipments.view");
  const raw = await searchParams;
  const filter = readFilters(raw);
  const canManage = user.permissions.includes("pickups.manage");

  const db = await getDb();
  const [result, hubDocs, driverDocs] = await Promise.all([
    listPickups(filter, user),
    db.collection("hubs").find({}).sort({ name: 1 }).toArray(),
    canManage
      ? db
          .collection("drivers")
          .find({ status: { $nin: ["suspended", "inactive"] } } as never)
          .sort({ name: 1 })
          .toArray()
      : Promise.resolve([]),
  ]);

  const hubs = hubDocs as unknown as Hub[];
  const drivers = driverDocs as unknown as Driver[];

  const activeFilters = [filter.q, filter.status, filter.hubId, filter.from, filter.to].filter(Boolean).length;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Pickups"
        description="Every collection that has not been completed yet. Assign a driver, follow the run, and record what actually happened on site."
      />

      <div className="space-y-3">
        <FilterBar activeCount={activeFilters}>
          <UrlSelect
            param="status"
            label="Status"
            options={PICKUP_STATUSES.map((value) => ({ value, label: humanise(value) }))}
            allLabel="Any status"
          />
          <UrlSelect
            param="hubId"
            label="Hub"
            options={hubs.map((hub) => ({ value: hub.id, label: hub.name }))}
            allLabel="Any hub"
          />
          <UrlDateFilter param="from" label="Scheduled from" />
          <UrlDateFilter param="to" label="Scheduled to" />
        </FilterBar>

        <PickupsTable
          rows={result.rows}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
          sort={filter.sort}
          dir={filter.dir}
          drivers={drivers.map((driver) => ({ value: driver.id, label: `${driver.name} · ${driver.status}` }))}
          canManage={canManage}
        />
      </div>
    </div>
  );
}
