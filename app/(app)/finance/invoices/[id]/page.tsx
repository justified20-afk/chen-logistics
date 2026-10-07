import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getInvoice, listPayments } from "@/lib/finance";
import { getDb } from "@/lib/mongodb";
import { toDomainList } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Card, InvoiceStatusBadge, humanise } from "@/components/ui/status-badge";
import { RecordPaymentButton } from "@/components/finance/record-payment-button";
import { InvoiceStatusActions } from "@/components/finance/invoice-status-actions";
import type { Payment } from "@/types/domain";

export const dynamic = "force-dynamic";

interface InvoiceParams {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: InvoiceParams): Promise<Metadata> {
  const { id } = await params;
  const invoice = await getInvoice(id);
  return {
    title: invoice ? `${invoice.invoiceNumber} — Finance` : "Invoice",
    robots: { index: false, follow: false },
  };
}

export default async function InvoiceDetailPage({
  params,
}: InvoiceParams): Promise<React.JSX.Element> {
  const user = await requireUser();
  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();

  const isCustomerOwner = user.role === "customer" && user.customerId === invoice.customerId;
  if (!user.permissions.includes("finance.view") && !isCustomerOwner) {
    redirect("/denied");
  }

  const canManage = user.permissions.includes("finance.manage");
  const db = await getDb();
  const [payments, settingsDoc] = await Promise.all([
    db
      .collection("payments")
      .find({ invoiceId: invoice.id } as never)
      .sort({ receivedAt: -1 })
      .toArray(),
    db.collection("settings").findOne({ _id: "system" } as never),
  ]);
  const currency = (settingsDoc as unknown as { currency?: string } | null)?.currency ?? invoice.currency;
  const paymentRows = toDomainList<Payment>(payments as never[]);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <Link
        href={isCustomerOwner ? "/customer/invoices" : "/finance/invoices"}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Back to invoices
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="heading font-mono text-2xl font-semibold tracking-tight">
              {invoice.invoiceNumber}
            </h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            <Link
              href={`/customers/${invoice.customerId}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {invoice.customerName ?? "Customer"}
            </Link>{" "}
            · issued{" "}
            {(invoice.issuedAt ?? invoice.createdAt)
              ? new Date(invoice.issuedAt ?? invoice.createdAt).toLocaleDateString("en-GB")
              : "—"}{" "}
            · due {new Date(invoice.dueAt).toLocaleDateString("en-GB")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && invoice.balanceMinor > 0 && invoice.status !== "void" ? (
            <RecordPaymentButton invoice={invoice} />
          ) : null}
          {canManage ? <InvoiceStatusActions invoice={invoice} /> : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Lines" className="lg:col-span-2" description="Totals are recomputed on the server from these lines">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Description</th>
                <th className="py-2 pr-3 text-right font-medium">Qty</th>
                <th className="py-2 pr-3 text-right font-medium">Unit</th>
                <th className="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoice.lines.map((line) => (
                <tr key={line.id}>
                  <td className="py-2.5 pr-3">{line.description}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{line.quantity}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {formatMoney(line.unitAmountMinor, currency)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {formatMoney(line.totalMinor, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border">
              <Row label="Subtotal" value={formatMoney(invoice.subtotalMinor, currency)} />
              {invoice.discountMinor > 0 ? (
                <Row label="Discount" value={`− ${formatMoney(invoice.discountMinor, currency)}`} />
              ) : null}
              <Row
                label={`Tax (${invoice.taxRatePercent}%)`}
                value={formatMoney(invoice.taxMinor, currency)}
              />
              <Row label="Total" value={formatMoney(invoice.totalMinor, currency)} strong />
              <Row label="Paid" value={formatMoney(invoice.amountPaidMinor, currency)} />
              <Row
                label="Balance"
                value={formatMoney(invoice.balanceMinor, currency)}
                strong
                tone={invoice.balanceMinor > 0}
              />
            </tfoot>
          </table>

          {invoice.notes ? (
            <p className="mt-4 whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
              {invoice.notes}
            </p>
          ) : null}
        </Card>

        <div className="space-y-5">
          <Card title="Payments" description="Against this invoice">
            {paymentRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {paymentRows.map((payment) => (
                  <li key={payment.id} className="py-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-mono text-xs font-semibold">{payment.reference}</p>
                      <p className="text-sm font-medium tabular-nums">
                        {formatMoney(payment.amountMinor, currency)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(payment.receivedAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · {payment.method.replace("_", " ")}
                      {payment.recordedBy ? ` · by ${payment.recordedBy}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Facts">
            <dl className="space-y-3 text-sm">
              <Fact label="Status" value={humanise(invoice.status)} />
              <Fact label="Currency" value={invoice.currency} />
              <Fact label="Version" value={String(invoice.version)} />
              <Fact
                label="Linked shipments"
                value={
                  invoice.shipmentIds.length > 0
                    ? `${invoice.shipmentIds.length} shipment${invoice.shipmentIds.length === 1 ? "" : "s"}`
                    : "None"
                }
              />
              <Fact label="Created" value={new Date(invoice.createdAt).toLocaleString("en-GB")} />
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: boolean;
}) {
  return (
    <tr className={strong ? "text-sm font-semibold" : "text-sm"}>
      <td className="py-1.5 pr-3">{label}</td>
      <td colSpan={3} className={`py-1.5 text-right tabular-nums ${tone ? "text-warning" : ""}`}>
        {value}
      </td>
    </tr>
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
