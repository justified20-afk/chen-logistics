import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { getDb } from "@/lib/mongodb";
import { toDomainList } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { ShipmentForm } from "@/components/shipments/shipment-form";
import type { Customer, Hub } from "@/types/domain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New shipment",
  robots: { index: false, follow: false },
};

export default async function NewShipmentPage(): Promise<React.JSX.Element> {
  await requirePermission("shipments.create");
  const db = await getDb();

  const [customerDocs, hubDocs] = await Promise.all([
    db.collection("customers").find({ accountStatus: "active" } as never).sort({ name: 1 }).limit(500).toArray(),
    db.collection("hubs").find({ status: { $ne: "inactive" } } as never).sort({ name: 1 }).toArray(),
  ]);

  const customers = toDomainList<Customer>(customerDocs);
  const hubs = toDomainList<Hub>(hubDocs);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="New shipment"
        description="Book a shipment from order intake. Charges are calculated by the server from the rate card — you never type a price."
        actions={
          <Link
            href="/shipments"
            className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-surface-hover"
          >
            Back to shipments
          </Link>
        }
      />

      <div className="max-w-5xl">
        <ShipmentForm
          customers={customers.map((customer) => ({ value: customer.id, label: `${customer.code} · ${customer.name}` }))}
          hubs={hubs.map((hub) => ({ value: hub.id, label: `${hub.code} · ${hub.name}` }))}
        />
      </div>
    </div>
  );
}
