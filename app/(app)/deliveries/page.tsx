import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { listShipments, type ShipmentListFilter } from "@/lib/shipments";
import { shipmentFilterSchema } from "@/lib/schemas/shipment";
import { getDb } from "@/lib/mongodb";
import { toDomainList } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { ShipmentsTable } from "@/components/shipments/shipments-table";
import { FilterBar, UrlSelect } from "@/components/tables/url-filters";
import { SHIPMENT_STATUSES, type Hub } from "@/types/domain";
import { humanise } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Deliveries",
  robots: { index: false, follow: false },
};

const ACTIVE = "out_for_delivery,delivery_attempted";

const TABS = [
  { label: "On the road", value: ACTIVE },
  { label: "Delivered", value: "delivered" },
  { label: "Failed", value: "failed" },
  { label: "Returned", value: "returned" },
  { label: "All", value: "" },
];

function readFilters(raw: Record<string, string | string[] | undefined>): ShipmentListFilter {
  const plain: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    plain[key] = Array.isArray(value) ? value[0] : value;
  }
  const parsed = shipmentFilterSchema.safeParse(plain);
  const filter = parsed.success ? parsed.data : {};
  if (!filter.status) filter.status = ACTIVE;
  return filter;
}

export default async function DeliveriesPage({
  searchParams,
}: PageProps<"/deliveries">): Promise<React.JSX.Element> {
  const user = await requirePermission("shipments.view");
  const raw = await searchParams;
  const filter = readFilters(raw);

  const db = await getDb();
  const [result, hubDocs, settingsDoc, counts] = await Promise.all([
    listShipments(filter, user),
    db.collection("hubs").find({}).sort({ name: 1 }).toArray(),
    db.collection("settings").findOne({ _id: "system" } as never),
    db
      .collection("shipments")
      .aggregate([
        { $match: { status: { $in: ["out_for_delivery", "delivery_attempted", "delivered", "failed"] } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const hubs = toDomainList<Hub>(hubDocs);
  const currency = (settingsDoc as unknown as { currency?: string } | null)?.currency ?? "NGN";
  const countMap = new Map(counts.map((row) => [String(row._id), Number(row.count ?? 0)]));
  const activeTab = filter.status ?? ACTIVE;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Deliveries"
        description="The final leg: what is with a driver right now, what landed, and what needs another attempt. Proof of delivery is recorded from the shipment page."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Out for delivery" value={countMap.get("out_for_delivery") ?? 0} />
        <Stat
          label="Attempted, not delivered"
          value={countMap.get("delivery_attempted") ?? 0}
          tone={(countMap.get("delivery_attempted") ?? 0) > 0 ? "warning" : undefined}
        />
        <Stat label="Delivered" value={countMap.get("delivered") ?? 0} />
        <Stat
          label="Failed"
          value={countMap.get("failed") ?? 0}
          tone={(countMap.get("failed") ?? 0) > 0 ? "danger" : undefined}
        />
      </div>

      <div className="space-y-3">
        <nav className="flex flex-wrap gap-1.5" aria-label="Delivery views">
          {TABS.map((tab) => (
            <Link
              key={tab.label}
              href={tab.value ? `/deliveries?status=${tab.value}` : "/deliveries"}
              className={
                activeTab === tab.value
                  ? "inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
                  : "inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-surface-hover"
              }
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <FilterBar
          activeCount={["q", "hubId", "driverId", "from", "to"].filter((key) =>
            (filter as Record<string, unknown>)[key],
          ).length}
        >
          <UrlSelect
            param="status"
            label="Status"
            options={[
              { value: ACTIVE, label: "On the road + attempted" },
              ...SHIPMENT_STATUSES.map((value) => ({ value, label: humanise(value) })),
            ]}
            allLabel="Any status"
          />
          <UrlSelect
            param="hubId"
            label="Hub"
            options={hubs.map((hub) => ({ value: hub.id, label: hub.name }))}
            allLabel="Any hub"
          />
        </FilterBar>

        <ShipmentsTable
          rows={result.rows}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
          sort={filter.sort}
          dir={filter.dir}
          canEdit={user.permissions.includes("shipments.edit")}
          hubs={hubs.map((hub) => ({ value: hub.id, label: hub.name }))}
          currency={currency}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warning" | "danger" }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={
          tone === "danger"
            ? "mt-1 text-xl font-semibold tabular-nums text-danger"
            : tone === "warning"
              ? "mt-1 text-xl font-semibold tabular-nums text-warning"
              : "mt-1 text-xl font-semibold tabular-nums"
        }
      >
        {value}
      </p>
    </div>
  );
}
