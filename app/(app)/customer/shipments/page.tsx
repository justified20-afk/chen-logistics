import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { listShipments, type ShipmentListFilter } from "@/lib/shipments";
import { shipmentFilterSchema } from "@/lib/schemas/shipment";
import { getDb } from "@/lib/mongodb";
import { toDomainList } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { ShipmentsTable } from "@/components/shipments/shipments-table";
import { FilterBar, UrlDateFilter, UrlSelect } from "@/components/tables/url-filters";
import { SHIPMENT_STATUSES, type Hub } from "@/types/domain";
import { humanise } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My shipments",
  robots: { index: false, follow: false },
};

function readFilters(raw: Record<string, string | string[] | undefined>): ShipmentListFilter {
  const plain: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    plain[key] = Array.isArray(value) ? value[0] : value;
  }
  const parsed = shipmentFilterSchema.safeParse(plain);
  return parsed.success ? parsed.data : {};
}

export default async function CustomerShipmentsPage({
  searchParams,
}: PageProps<"/customer/shipments">): Promise<React.JSX.Element> {
  const user = await requirePermission("customer.portal");
  const raw = await searchParams;
  const filter = readFilters(raw);

  const db = await getDb();
  const [result, hubDocs, settingsDoc] = await Promise.all([
    listShipments(filter, user),
    db.collection("hubs").find({}).sort({ name: 1 }).toArray(),
    db.collection("settings").findOne({ _id: "system" } as never),
  ]);
  const hubs = toDomainList<Hub>(hubDocs);
  const currency = (settingsDoc as unknown as { currency?: string } | null)?.currency ?? "NGN";

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="My shipments"
        description="Every shipment on your account. Filters persist in the URL so a view can be shared or reloaded."
      />
      <div className="space-y-3">
        <FilterBar
          activeCount={[filter.q, filter.status, filter.hubId, filter.serviceLevel, filter.paymentStatus, filter.from, filter.to].filter(Boolean).length}
        >
          <UrlSelect
            param="status"
            label="Status"
            options={SHIPMENT_STATUSES.map((status) => ({ value: status, label: humanise(status) }))}
          />
          <UrlDateFilter param="from" label="Created from" />
          <UrlDateFilter param="to" label="Created to" />
        </FilterBar>
        <ShipmentsTable
          rows={result.rows}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
          sort={filter.sort}
          dir={filter.dir}
          canEdit={false}
          canCreate={true}
          createHref="/customer/shipments/new"
          hubs={hubs.map((hub) => ({ value: hub.id, label: hub.name }))}
          currency={currency}
        />
      </div>
    </div>
  );
}
