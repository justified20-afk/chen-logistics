import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { getDb } from "@/lib/mongodb";
import { oid, toDomain, toDomainList } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { ShipmentForm } from "@/components/shipments/shipment-form";
import type { Customer, Hub } from "@/types/domain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New shipment",
  robots: { index: false, follow: false },
};

export default async function CustomerNewShipmentPage(): Promise<React.JSX.Element> {
  const user = await requirePermission("customer.portal");
  const db = await getDb();
  const customerDoc = user.customerId
    ? await db.collection("customers").findOne({ _id: oid(user.customerId) } as never)
    : null;
  const hubDocs = await db
    .collection("hubs")
    .find({ status: { $ne: "inactive" } } as never)
    .sort({ name: 1 })
    .toArray();
  const customer = customerDoc ? toDomain<Customer>(customerDoc) : null;
  const hubs = toDomainList<Hub>(hubDocs);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Book a shipment"
        description="Charges are calculated by the server from the rate card — you never type a price. Bookings are filed against your account."
        actions={
          <Link
            href="/customer/shipments"
            className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-surface-hover"
          >
            Back to my shipments
          </Link>
        }
      />
      {customer ? (
        <ShipmentForm
          customers={[{ value: customer.id, label: customer.name }]}
          hubs={hubs.map((hub) => ({ value: hub.id, label: hub.name }))}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          No customer record is linked to your login, so you cannot book shipments yet.
        </p>
      )}
    </div>
  );
}
