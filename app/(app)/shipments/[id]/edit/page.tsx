import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/session";
import { getShipment } from "@/lib/shipments";
import { getDb } from "@/lib/mongodb";
import { toDomainList } from "@/lib/db";
import { labelFor } from "@/lib/transitions";
import { PageHeader } from "@/components/layout/page-header";
import { ShipmentForm } from "@/components/shipments/shipment-form";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Customer, Hub } from "@/types/domain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit shipment",
  robots: { index: false, follow: false },
};

const READ_ONLY = ["delivered", "returned", "cancelled"];

export default async function EditShipmentPage({
  params,
}: PageProps<"/shipments/[id]/edit">): Promise<React.JSX.Element> {
  await requirePermission("shipments.edit");
  const { id } = await params;

  const shipment = await getShipment(id);
  if (!shipment) notFound();

  const db = await getDb();
  const [customerDocs, hubDocs] = await Promise.all([
    db.collection("customers").find({}).sort({ name: 1 }).limit(500).toArray(),
    db.collection("hubs").find({}).sort({ name: 1 }).toArray(),
  ]);
  const customers = toDomainList<Customer>(customerDocs);
  const hubs = toDomainList<Hub>(hubDocs);

  if (READ_ONLY.includes(shipment.status)) {
    return (
      <div className="space-y-5 p-4 sm:p-6">
        <PageHeader
          title={`Edit ${shipment.trackingNumber}`}
          badge={<StatusBadge label={labelFor(shipment.status)} tone="neutral" />}
        />
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
          <p className="font-medium text-warning">
            {labelFor(shipment.status)} shipments are read-only.
          </p>
          <p className="mt-1 text-muted-foreground">
            Final states are protected so history stays truthful. If the record itself is wrong, an
            authorised user can correct the status from the shipment page — the correction is
            audited and the previous state is preserved.
          </p>
          <Link
            href={`/shipments/${shipment.id}`}
            className="mt-2 inline-block font-medium text-primary underline-offset-4 hover:underline"
          >
            Open the shipment
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title={`Edit ${shipment.trackingNumber}`}
        description="Changes are recorded in the audit log with before and after values."
        badge={<StatusBadge label={labelFor(shipment.status)} tone="neutral" />}
        actions={
          <Link
            href={`/shipments/${shipment.id}`}
            className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-surface-hover"
          >
            Back to shipment
          </Link>
        }
      />

      <div className="max-w-5xl">
        <ShipmentForm
          customers={customers.map((customer) => ({ value: customer.id, label: `${customer.code} · ${customer.name}` }))}
          hubs={hubs.map((hub) => ({ value: hub.id, label: `${hub.code} · ${hub.name}` }))}
          shipment={shipment}
        />
      </div>
    </div>
  );
}
