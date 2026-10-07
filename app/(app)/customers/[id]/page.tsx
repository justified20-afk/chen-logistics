import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/session";
import { getDb } from "@/lib/mongodb";
import { oid, toDomain, toDomainList } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Card, ShipmentStatusBadge, StatusBadge, humanise } from "@/components/ui/status-badge";
import type { Customer, Invoice, Shipment } from "@/types/domain";

export const dynamic = "force-dynamic";

interface CustomerParams {
  params: Promise<{ id: string }>;
}

async function findCustomer(id: string): Promise<Customer | null> {
  const _id = oid(id);
  if (!_id) return null;
  const db = await getDb();
  const doc = await db.collection("customers").findOne({ _id } as never);
  return doc ? toDomain<Customer>(doc) : null;
}

export async function generateMetadata({ params }: CustomerParams): Promise<Metadata> {
  const { id } = await params;
  const customer = await findCustomer(id);
  return {
    title: customer ? `${customer.name} — Customers` : "Customer",
    robots: { index: false, follow: false },
  };
}

export default async function CustomerDetailPage({
  params,
}: CustomerParams): Promise<React.JSX.Element> {
  await requirePermission("customers.view");
  const { id } = await params;
  const customer = await findCustomer(id);
  if (!customer) notFound();

  const db = await getDb();
  const settingsDoc = await db.collection("settings").findOne({ _id: "system" } as never);
  const currency = (settingsDoc as unknown as { currency?: string } | null)?.currency ?? "NGN";

  const [statusAgg, recentShipments, invoiceAgg, invoiceDocs] = await Promise.all([
    db
      .collection("shipments")
      .aggregate([{ $match: { customerId: customer.id } }, { $group: { _id: "$status", count: { $sum: 1 } } }])
      .toArray(),
    db
      .collection("shipments")
      .find({ customerId: customer.id } as never)
      .project({
        trackingNumber: 1,
        status: 1,
        createdAt: 1,
        destinationHubName: 1,
        "recipient.city": 1,
        paymentStatus: 1,
        promisedDeliveryAt: 1,
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray(),
    db
      .collection("invoices")
      .aggregate([
        { $match: { customerId: customer.id, status: { $in: ["issued", "partially_paid"] } } },
        { $group: { _id: null, balance: { $sum: "$balanceMinor" }, count: { $sum: 1 } } },
      ])
      .toArray(),
    db
      .collection("invoices")
      .find({ customerId: customer.id } as never)
      .project({ invoiceNumber: 1, status: 1, totalMinor: 1, balanceMinor: 1, dueAt: 1 })
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray(),
  ]);

  const counts = new Map(statusAgg.map((row) => [String(row._id), Number(row.count ?? 0)]));
  const totalShipments = [...counts.values()].reduce((sum, value) => sum + value, 0);
  const outstanding = (invoiceAgg[0] as { balance?: number } | undefined)?.balance ?? 0;
  const openInvoices = (invoiceAgg[0] as { count?: number } | undefined)?.count ?? 0;
  const shipments = toDomainList<Partial<Shipment>>(recentShipments as never[]);
  const invoices = toDomainList<Partial<Invoice>>(invoiceDocs as never[]);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Back to customers
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="heading text-2xl font-semibold tracking-tight">{customer.name}</h1>
            <span className="rounded border border-border bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {customer.code}
            </span>
            <StatusBadge
              label={customer.accountStatus.replace("_", " ")}
              tone={customer.accountStatus === "active" ? "success" : customer.accountStatus === "on_hold" ? "warning" : "neutral"}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {customer.contactPerson} · {customer.email} · {customer.phone}
          </p>
        </div>
        <Link
          href={`/shipments?customerId=${customer.id}`}
          className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-surface-hover"
        >
          All shipments
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Shipments" value={totalShipments.toLocaleString("en-US")} />
        <Stat
          label="In transit"
          value={String(
            (counts.get("in_transit") ?? 0) +
              (counts.get("at_origin_hub") ?? 0) +
              (counts.get("at_destination_hub") ?? 0) +
              (counts.get("picked_up") ?? 0),
          )}
        />
        <Stat label="Open invoices" value={String(openInvoices)} />
        <Stat
          label="Outstanding"
          value={formatMoney(outstanding, currency)}
          tone={outstanding > 0 ? "warning" : undefined}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card
          title="Recent shipments"
          description="Newest bookings first"
          className="lg:col-span-2"
          actions={
            <Link
              href={`/shipments?customerId=${customer.id}`}
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              View all
            </Link>
          }
        >
          {shipments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shipments recorded for this customer.</p>
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
                      {shipment.recipient?.city ?? ""} · promised{" "}
                      {shipment.promisedDeliveryAt
                        ? new Date(shipment.promisedDeliveryAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                          })
                        : "—"}
                    </p>
                  </div>
                  {shipment.status ? <ShipmentStatusBadge status={shipment.status} /> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-5">
          <Card title="Account">
            <dl className="space-y-3 text-sm">
              <Fact label="Kind" value={customer.kind === "business" ? "Business" : "Personal"} />
              <Fact
                label="Credit terms"
                value={customer.creditTermsDays ? `${customer.creditTermsDays} days` : "Prepaid"}
              />
              <Fact
                label="Primary address"
                value={
                  customer.addresses[0]
                    ? `${customer.addresses[0].street}, ${customer.addresses[0].city}, ${customer.addresses[0].state}`
                    : "—"
                }
              />
              <Fact label="Registered" value={new Date(customer.createdAt).toLocaleDateString("en-GB")} />
              <Fact label="Tags" value={customer.tags?.join(", ") || "—"} />
            </dl>
          </Card>

          <Card title="Invoices" description="Newest first">
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices issued yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {invoices.map((invoice) => (
                  <li key={invoice.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold">{invoice.invoiceNumber}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Due{" "}
                        {invoice.dueAt
                          ? new Date(invoice.dueAt).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                            })
                          : "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium tabular-nums">
                        {formatMoney(invoice.balanceMinor ?? 0, currency)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{humanise(invoice.status ?? "")}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {customer.contacts.length > 0 ? (
            <Card title="Contacts">
              <ul className="divide-y divide-border">
                {customer.contacts.map((contact) => (
                  <li key={contact.id} className="py-2.5">
                    <p className="text-sm font-medium">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {contact.role}
                      {contact.email ? ` · ${contact.email}` : ""}
                      {contact.phone ? ` · ${contact.phone}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={
          tone === "warning"
            ? "mt-1 text-xl font-semibold tabular-nums text-warning"
            : "mt-1 text-xl font-semibold tabular-nums"
        }
      >
        {value}
      </p>
    </div>
  );
}
