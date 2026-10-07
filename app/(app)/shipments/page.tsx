import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { listShipments, type ShipmentListFilter } from "@/lib/shipments";
import { shipmentFilterSchema } from "@/lib/schemas/shipment";
import { getDb } from "@/lib/mongodb";
import { toDomainList } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { ShipmentsTable } from "@/components/shipments/shipments-table";
import { FilterBar, UrlDateFilter, UrlSelect } from "@/components/tables/url-filters";
import {
  SHIPMENT_STATUSES,
  SERVICE_LEVELS,
  PAYMENT_STATUSES,
  type Hub,
} from "@/types/domain";
import { humanise } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shipments",
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

export default async function ShipmentsPage({
  searchParams,
}: PageProps<"/shipments">): Promise<React.JSX.Element> {
  const user = await requirePermission("shipments.view");
  const raw = await searchParams;
  const filter = readFilters(raw);

  const db = await getDb();
  const [result, hubDocs, settingsDoc] = await Promise.all([
    listShipments(filter, user),
    db.collection("hubs").find({}).sort({ name: 1 }).toArray(),
    db.collection("settings").findOne({ _id: "system" } as never),
  ]);

  const hubs = toDomainList<Hub>(hubDocs);
  const currency =
    (settingsDoc as unknown as { currency?: string } | null)?.currency ?? "NGN";

  const activeFilters = [
    filter.q,
    filter.status,
    filter.hubId,
    filter.serviceLevel,
    filter.paymentStatus,
    filter.driverId,
    filter.customerId,
    filter.from,
    filter.to,
    filter.delayedOnly,
    filter.exceptionOnly,
  ].filter(Boolean).length;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Shipments"
        description="Every shipment in the system, from booking to settlement. Filters persist in the URL so a view can be shared or reloaded."
        actions={
          user.permissions.includes("shipments.create") ? (
            <Link
              href="/shipments/new"
              className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              New shipment
            </Link>
          ) : null
        }
      />

      <div className="space-y-3">
        <FilterBar activeCount={activeFilters}>
          <UrlSelect
            param="status"
            label="Status"
            options={SHIPMENT_STATUSES.map((status) => ({
              value: status,
              label: humanise(status),
            }))}
          />
          <UrlSelect
            param="hubId"
            label="Hub"
            options={hubs.map((hub) => ({ value: hub.id, label: hub.name }))}
            allLabel="Any hub"
          />
          <UrlSelect
            param="serviceLevel"
            label="Service level"
            options={SERVICE_LEVELS.map((level) => ({
              value: level,
              label: humanise(level),
            }))}
            allLabel="Any service"
          />
          <UrlSelect
            param="paymentStatus"
            label="Payment"
            options={PAYMENT_STATUSES.map((status) => ({
              value: status,
              label: humanise(status),
            }))}
            allLabel="Any payment"
          />
          <UrlSelect
            param="delayedOnly"
            label="Delayed only"
            options={[{ value: "true", label: "Delayed only" }]}
            allLabel="Any timing"
          />
          <UrlSelect
            param="exceptionOnly"
            label="Exceptions only"
            options={[{ value: "true", label: "Has exception" }]}
            allLabel="Any exception state"
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
          canEdit={user.permissions.includes("shipments.edit")}
          canCreate={user.permissions.includes("shipments.create")}
          hubs={hubs.map((hub) => ({ value: hub.id, label: hub.name }))}
          currency={currency}
        />
      </div>
    </div>
  );
}
