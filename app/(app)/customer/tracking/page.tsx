import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { getDb } from "@/lib/mongodb";
import { toDomainList } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card, ShipmentStatusBadge } from "@/components/ui/status-badge";
import { TrackingSearch } from "@/components/tracking/tracking-search";
import type { Shipment } from "@/types/domain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tracking",
  robots: { index: false, follow: false },
};

const TERMINAL = ["delivered", "returned", "cancelled"];

export default async function CustomerTrackingPage(): Promise<React.JSX.Element> {
  const user = await requirePermission("customer.portal");
  const db = await getDb();
  const scope = user.customerId ? { customerId: user.customerId } : { customerId: "__none__" };

  const activeDocs = await db
    .collection("shipments")
    .find({ ...scope, status: { $nin: TERMINAL } } as never)
    .project({ trackingNumber: 1, status: 1, "recipient.city": 1, promisedDeliveryAt: 1 })
    .sort({ promisedDeliveryAt: 1 })
    .limit(20)
    .toArray();
  const active = toDomainList<Partial<Shipment>>(activeDocs as never[]);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Tracking"
        description="Look up any shipment with its tracking number, or jump straight to one of your active parcels."
      />

      <Card title="Track a shipment">
        <TrackingSearch />
      </Card>

      <Card title="Your active parcels" description={`${active.length} in transit or not yet delivered`}>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing in flight right now.</p>
        ) : (
          <ul className="divide-y divide-border">
            {active.map((shipment) => (
              <li key={shipment.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link
                    href={`/tracking/${shipment.trackingNumber}`}
                    className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    {shipment.trackingNumber}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {shipment.recipient?.city ?? "—"} · promised{" "}
                    {shipment.promisedDeliveryAt
                      ? new Date(shipment.promisedDeliveryAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
                      : "—"}
                  </p>
                </div>
                {shipment.status ? <ShipmentStatusBadge status={shipment.status} /> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
