import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { invoiceFilterSchema, listInvoices } from "@/lib/finance";
import { getDb } from "@/lib/mongodb";
import { PageHeader } from "@/components/layout/page-header";
import { InvoicesTable } from "@/components/finance/invoices-table";
import { FilterBar, UrlDateFilter, UrlSelect } from "@/components/tables/url-filters";
import { INVOICE_STATUSES } from "@/types/domain";
import { humanise } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My invoices",
  robots: { index: false, follow: false },
};

export default async function CustomerInvoicesPage({
  searchParams,
}: PageProps<"/customer/invoices">): Promise<React.JSX.Element> {
  const user = await requirePermission("customer.portal");
  const raw = await searchParams;
  const plain: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    plain[key] = Array.isArray(value) ? value[0] : value;
  }
  const parsed = invoiceFilterSchema.safeParse(plain);
  const filter = parsed.success ? parsed.data : {};

  const db = await getDb();
  const [result, settingsDoc] = await Promise.all([
    listInvoices(filter, user),
    db.collection("settings").findOne({ _id: "system" } as never),
  ]);
  const currency = (settingsDoc as unknown as { currency?: string } | null)?.currency ?? "NGN";

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="My invoices"
        description="Invoices issued for your shipments. Balances are server-derived; payments are recorded by finance."
      />
      <div className="space-y-3">
        <FilterBar activeCount={[filter.q, filter.status, filter.from, filter.to].filter(Boolean).length}>
          <UrlSelect
            param="status"
            label="Status"
            options={INVOICE_STATUSES.map((value) => ({ value, label: humanise(value) }))}
            allLabel="Any status"
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
          showCustomer={false}
        />
      </div>
    </div>
  );
}
