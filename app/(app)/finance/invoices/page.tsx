import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { invoiceFilterSchema, listInvoices } from "@/lib/finance";
import { getDb } from "@/lib/mongodb";
import { toDomainList } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { InvoicesTable } from "@/components/finance/invoices-table";
import { NewInvoiceButton } from "@/components/finance/new-invoice-button";
import { RecordPaymentButton } from "@/components/finance/record-payment-button";
import { FilterBar, UrlDateFilter, UrlSelect } from "@/components/tables/url-filters";
import { INVOICE_STATUSES, type Customer } from "@/types/domain";
import { humanise } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invoices",
  robots: { index: false, follow: false },
};

export default async function InvoicesPage({
  searchParams,
}: PageProps<"/finance/invoices">): Promise<React.JSX.Element> {
  const user = await requirePermission("finance.view");
  const canManage = user.permissions.includes("finance.manage");
  const raw = await searchParams;
  const plain: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    plain[key] = Array.isArray(value) ? value[0] : value;
  }
  const parsed = invoiceFilterSchema.safeParse(plain);
  const filter = parsed.success ? parsed.data : {};

  const db = await getDb();
  const [result, customerDocs, settingsDoc] = await Promise.all([
    listInvoices(filter, user),
    canManage
      ? db.collection("customers").find({}).project({ name: 1 }).sort({ name: 1 }).limit(500).toArray()
      : Promise.resolve([]),
    db.collection("settings").findOne({ _id: "system" } as never),
  ]);

  const currency = (settingsDoc as unknown as { currency?: string } | null)?.currency ?? "NGN";
  const customers = customerDocs as unknown as Customer[];

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Invoices"
        description="Server-derived totals, immutable payment history, and balances that only finance can move."
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <RecordPaymentButton
                customers={customers.map((customer) => ({ value: customer.id, label: customer.name }))}
                openInvoices={result.rows
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

      <div className="space-y-3">
        <FilterBar activeCount={[filter.q, filter.status, filter.customerId, filter.from, filter.to].filter(Boolean).length}>
          <UrlSelect
            param="status"
            label="Status"
            options={INVOICE_STATUSES.map((value) => ({ value, label: humanise(value) }))}
            allLabel="Any status"
          />
          <UrlSelect
            param="customerId"
            label="Customer"
            options={customers.map((customer) => ({ value: customer.id, label: customer.name }))}
            allLabel="Any customer"
          />
          <UrlDateFilter param="from" label="Issued from" />
          <UrlDateFilter param="to" label="Issued to" />
        </FilterBar>

        <InvoicesTable
          rows={result.rows}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
          sort={filter.sort}
          dir={filter.dir}
          currency={currency}
        />
      </div>
    </div>
  );
}
