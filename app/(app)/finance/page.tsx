import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { financeOverview, listInvoices, listPayments } from "@/lib/finance";
import { getDb } from "@/lib/mongodb";
import { formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/layout/page-header";
import { Card, InvoiceStatusBadge } from "@/components/ui/status-badge";
import { NewInvoiceButton } from "@/components/finance/new-invoice-button";
import { RecordPaymentButton } from "@/components/finance/record-payment-button";
import type { Customer } from "@/types/domain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Finance",
  robots: { index: false, follow: false },
};

export default async function FinancePage(): Promise<React.JSX.Element> {
  const user = await requirePermission("finance.view");
  const canManage = user.permissions.includes("finance.manage");

  const db = await getDb();
  const [overview, invoices, payments, customerDocs, settingsDoc, codAgg] = await Promise.all([
    financeOverview(user),
    listInvoices({ pageSize: 6, sort: "createdAt", dir: "desc" }, user),
    listPayments({ pageSize: 6 }, user),
    canManage
      ? db.collection("customers").find({}).project({ name: 1 }).sort({ name: 1 }).limit(500).toArray()
      : Promise.resolve([]),
    db.collection("settings").findOne({ _id: "system" } as never),
    db
      .collection("codRecords")
      .aggregate([
        { $match: { status: { $ne: "reconciled" } } },
        { $group: { _id: null, count: { $sum: 1 }, expected: { $sum: "$expectedMinor" }, collected: { $sum: "$collectedMinor" } } },
      ])
      .toArray(),
  ]);

  const currency = (settingsDoc as unknown as { currency?: string } | null)?.currency ?? "NGN";
  const customers = customerDocs as unknown as Customer[];
  const codRow = (codAgg[0] as { count?: number; expected?: number; collected?: number }) ?? {};

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Finance"
        description="Receivables, cash collected and cash-on-delivery still to settle. Every amount here was derived on the server."
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <RecordPaymentButton
                customers={customers.map((customer) => ({ value: customer.id, label: customer.name }))}
                openInvoices={invoices.rows
                  .filter((invoice) => invoice.balanceMinor > 0)
                  .map((invoice) => ({
                    id: invoice.id,
                    invoiceNumber: invoice.invoiceNumber,
                    customerId: invoice.customerId,
                    balanceMinor: invoice.balanceMinor,
                  }))}
              />
              <NewInvoiceButton
                customers={customers.map((customer) => ({ value: customer.id, label: customer.name }))}
              />
            </div>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Outstanding" value={formatMoney(overview.outstandingMinor, currency)} sub={`${overview.openInvoices} open invoices`} />
        <Kpi
          label="Overdue"
          value={formatMoney(overview.overdueMinor, currency)}
          sub={`${overview.overdueCount} past due`}
          tone={overview.overdueMinor > 0 ? "danger" : undefined}
        />
        <Kpi label="Collected (30d)" value={formatMoney(overview.collected30dMinor, currency)} sub="Recorded payments" />
        <Kpi
          label="COD to settle"
          value={formatMoney(overview.codGapMinor, currency)}
          sub={`${overview.codPendingCount} records not reconciled`}
          tone={overview.codPendingCount > 0 ? "warning" : undefined}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          title="Latest invoices"
          description="Newest first"
          actions={
            <Link href="/finance/invoices" className="text-xs font-medium text-primary underline-offset-4 hover:underline">
              All invoices
            </Link>
          }
        >
          {invoices.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {invoices.rows.map((invoice) => (
                <li key={invoice.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link
                      href={`/finance/invoices/${invoice.id}`}
                      className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      {invoice.invoiceNumber}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {invoice.customerName ?? "—"} · due{" "}
                      {new Date(invoice.dueAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <InvoiceStatusBadge status={invoice.status} />
                    <span className="text-xs font-medium tabular-nums">
                      {formatMoney(invoice.balanceMinor, invoice.currency || currency)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Latest payments"
          description="Immutable payment records"
          actions={
            <Link href="/finance/payments" className="text-xs font-medium text-primary underline-offset-4 hover:underline">
              All payments
            </Link>
          }
        >
          {payments.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {payments.rows.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold">{payment.reference}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {payment.customerName ?? "—"} · {payment.method.replace("_", " ")} ·{" "}
                      {new Date(payment.receivedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    {formatMoney(payment.amountMinor, payment.currency || currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/finance/invoices"
          className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-surface-hover"
        >
          <p className="text-sm font-semibold">Invoices</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {overview.openInvoices} open · {overview.paidInvoices} settled
          </p>
        </Link>
        <Link
          href="/finance/cod"
          className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-surface-hover"
        >
          <p className="text-sm font-semibold">Cash on delivery</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {codRow.count ?? 0} awaiting reconciliation
          </p>
        </Link>
        <Link
          href="/finance/reconciliation"
          className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-surface-hover"
        >
          <p className="text-sm font-semibold">Reconciliation</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Settle driver-collected cash against expectations
          </p>
        </Link>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "danger" | "warning";
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={
          tone === "danger"
            ? "mt-1 text-xl font-semibold tabular-nums text-danger"
            : tone === "warning"
              ? "mt-1 text-xl font-semibold tabular-nums text-warning"
              : "mt-1 text-xl font-semibold tabular-nums"
        }
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
