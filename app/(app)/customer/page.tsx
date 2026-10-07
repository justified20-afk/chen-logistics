import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Package, Coins, Truck, CheckCircle2 } from "lucide-react";
import { requirePermission } from "@/lib/session";
import { getDb } from "@/lib/mongodb";
import { toDomainList } from "@/lib/db";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import { PageHeader } from "@/components/layout/page-header";
import { Card, InvoiceStatusBadge, ShipmentStatusBadge } from "@/components/ui/status-badge";
import type { Invoice, Shipment } from "@/types/domain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Customer portal",
  robots: { index: false, follow: false },
};

const ACTIVE = ["booked", "awaiting_pickup", "picked_up", "at_origin_hub", "in_transit", "at_destination_hub", "out_for_delivery", "delivery_attempted"];

export default async function CustomerOverviewPage(): Promise<React.JSX.Element> {
  const user = await requirePermission("customer.portal");
  const db = await getDb();
  const settingsDoc = await db.collection("settings").findOne({ _id: "system" } as never);
  const currency = (settingsDoc as unknown as { currency?: string } | null)?.currency ?? "NGN";
  const scope = user.customerId ? { customerId: user.customerId } : { customerId: "__none__" };

  const [statusAgg, recentDocs, invoiceAgg, invoiceDocs] = await Promise.all([
    db
      .collection("shipments")
      .aggregate([{ $match: scope }, { $group: { _id: "$status", count: { $sum: 1 } } }])
      .toArray(),
    db
      .collection("shipments")
      .find(scope as never)
      .project({ trackingNumber: 1, status: 1, createdAt: 1, destinationHubName: 1, "recipient.city": 1, promisedDeliveryAt: 1 })
      .sort({ createdAt: -1 })
      .limit(8)
      .toArray(),
    db
      .collection("invoices")
      .aggregate([
        { $match: { ...scope, status: { $in: ["issued", "partially_paid"] } } },
        { $group: { _id: null, balance: { $sum: "$balanceMinor" }, count: { $sum: 1 } } },
      ])
      .toArray(),
    db
      .collection("invoices")
      .find(scope as never)
      .project({ invoiceNumber: 1, status: 1, totalMinor: 1, balanceMinor: 1, dueAt: 1 })
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray(),
  ]);

  const counts = new Map(statusAgg.map((row) => [String(row._id), Number(row.count ?? 0)]));
  const activeCount = ACTIVE.reduce((sum, status) => sum + (counts.get(status) ?? 0), 0);
  const outForDelivery = counts.get("out_for_delivery") ?? 0;
  const delivered = counts.get("delivered") ?? 0;
  const openInvoices = (invoiceAgg[0] as { count?: number } | undefined)?.count ?? 0;
  const outstanding = (invoiceAgg[0] as { balance?: number } | undefined)?.balance ?? 0;
  const shipments = toDomainList<Partial<Shipment>>(recentDocs as never[]);
  const invoices = toDomainList<Partial<Invoice>>(invoiceDocs as never[]);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title={`Hello, ${user.name.split(" ")[0]}`}
        description="Your shipments, invoices and account at a glance. This portal is read-only — changes happen through your account manager or support."
      />

      {!user.customerId ? (
        <Card title="No account linked" description="Your login is not linked to a customer record yet. Contact your account manager.">
          <p className="text-sm text-muted-foreground">Once linked, your shipments and invoices will appear here.</p>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Package className="size-4" aria-hidden />} label="Active shipments" value={activeCount.toLocaleString("en-US")} href="/customer/shipments" />
        <Stat icon={<Truck className="size-4" aria-hidden />} label="Out for delivery" value={outForDelivery.toLocaleString("en-US")} href="/customer/shipments?status=out_for_delivery" />
        <Stat icon={<CheckCircle2 className="size-4" aria-hidden />} label="Delivered" value={delivered.toLocaleString("en-US")} href="/customer/shipments?status=delivered" />
        <Stat icon={<Coins className="size-4" aria-hidden />} label="Outstanding balance" value={formatMoneyCompact(outstanding, currency)} tone={outstanding > 0 ? "warning" : undefined} href="/customer/invoices" sub={`${openInvoices} open invoice${openInvoices === 1 ? "" : "s"}`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          title="Recent shipments"
          description="Newest bookings first"
          actions={
            <Link href="/customer/shipments" className="text-xs font-medium text-primary underline-offset-4 hover:underline">
              View all
            </Link>
          }
        >
          {shipments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shipments on your account yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {shipments.map((shipment) => (
                <li key={shipment.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link
                      href={`/shipments/${shipment.id ?? ""}`}
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

        <Card
          title="Recent invoices"
          description="Balances shown in your account currency"
          actions={
            <Link href="/customer/invoices" className="text-xs font-medium text-primary underline-offset-4 hover:underline">
              View all
            </Link>
          }
        >
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices issued yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {invoices.map((invoice) => (
                <li key={invoice.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link
                      href={`/finance/invoices/${invoice.id ?? ""}`}
                      className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      {invoice.invoiceNumber}
                    </Link>
                    <p className="text-[11px] text-muted-foreground">
                      Due{" "}
                      {invoice.dueAt
                        ? new Date(invoice.dueAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
                        : "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-medium tabular-nums">{formatMoney(invoice.balanceMinor ?? 0, currency)}</span>
                    {invoice.status ? <InvoiceStatusBadge status={invoice.status} /> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  href,
  tone,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href: string;
  tone?: "warning";
  sub?: string;
}) {
  return (
    <Link href={href} className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-surface-hover">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={tone === "warning" ? "mt-2 text-2xl font-semibold tabular-nums text-warning" : "mt-2 text-2xl font-semibold tabular-nums"}>
        {value}
      </p>
      {sub ? <p className="mt-1 truncate text-xs text-muted-foreground">{sub}</p> : null}
    </Link>
  );
}
