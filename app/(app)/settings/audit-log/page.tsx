import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { auditFilterSchema, listAudit } from "@/lib/system";
import { PageHeader } from "@/components/layout/page-header";
import { AuditTable } from "@/components/settings/audit-table";
import { FilterBar, UrlDateFilter, UrlSelect } from "@/components/tables/url-filters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Audit log",
  robots: { index: false, follow: false },
};

const ENTITY_TYPES = [
  "shipment",
  "trip",
  "pickup",
  "exception",
  "invoice",
  "payment",
  "cod",
  "hub",
  "user",
  "settings",
];

const ACTIONS = [
  "shipment.created",
  "shipment.updated",
  "shipment.status_changed",
  "shipment.status_corrected",
  "trip.created",
  "trip.assigned",
  "trip.dispatched",
  "trip.manifest_updated",
  "pickup.assigned",
  "pickup.updated",
  "exception.created",
  "exception.updated",
  "exception.resolved",
  "invoice.created",
  "invoice.payment_recorded",
  "invoice.void",
  "payment.recorded",
  "cod.collected",
  "cod.reconciled",
  "hub.received",
  "hub.handed_over",
  "user.updated",
  "settings.updated",
];

export default async function AuditLogPage({
  searchParams,
}: PageProps<"/settings/audit-log">): Promise<React.JSX.Element> {
  await requirePermission("audit.view");
  const raw = await searchParams;
  const plain: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    plain[key] = Array.isArray(value) ? value[0] : value;
  }
  const parsed = auditFilterSchema.safeParse(plain);
  const filter = parsed.success ? parsed.data : {};

  const result = await listAudit(filter);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Audit log"
        description="Append-only record of who changed what, when, with the before and after values. Entries are never rewritten and credential-shaped fields are redacted."
      />

      <div className="space-y-3">
        <FilterBar
          activeCount={[filter.q, filter.action, filter.entityType, filter.actor, filter.from, filter.to].filter(
            Boolean,
          ).length}
        >
          <UrlSelect
            param="entityType"
            label="Record type"
            options={ENTITY_TYPES.map((value) => ({ value, label: value }))}
            allLabel="Any record type"
          />
          <UrlSelect
            param="action"
            label="Action"
            options={ACTIONS.map((value) => ({ value, label: value.replace(/\./g, " · ") }))}
            allLabel="Any action"
          />
          <UrlDateFilter param="from" label="From" />
          <UrlDateFilter param="to" label="To" />
        </FilterBar>

        <AuditTable
          rows={result.rows}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
        />
      </div>
    </div>
  );
}
