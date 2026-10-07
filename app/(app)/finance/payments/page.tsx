import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { listPayments, paymentFilterSchema } from "@/lib/finance";
import { getDb } from "@/lib/mongodb";
import { toDomainList } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { PaymentsTable } from "@/components/finance/payments-table";
import { RecordPaymentButton } from "@/components/finance/record-payment-button";
import { FilterBar, UrlDateFilter, UrlSelect } from "@/components/tables/url-filters";
import { PAYMENT_METHODS, type Customer } from "@/types/domain";
import { humanise } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payments",
  robots: { index: false, follow: false },
};

export default async function PaymentsPage({
  searchParams,
}: PageProps<"/finance/payments">): Promise<React.JSX.Element> {
  const user = await requirePermission("finance.view");
  const canManage = user.permissions.includes("finance.manage");
  const raw = await searchParams;
  const plain: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    plain[key] = Array.isArray(value) ? value[0] : value;
  }
  const parsed = paymentFilterSchema.safeParse(plain);
  const filter = parsed.success ? parsed.data : {};

  const db = await getDb();
  const [result, customerDocs, settingsDoc] = await Promise.all([
    listPayments(filter, user),
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
        title="Payments"
        description="Immutable payment records. Nothing here can be edited — corrections are new records with an audit trail."
        actions={
          canManage ? (
            <RecordPaymentButton
              customers={customers.map((customer) => ({ value: customer.id, label: customer.name }))}
              openInvoices={[]}
            />
          ) : null
        }
      />

      <div className="space-y-3">
        <FilterBar activeCount={[filter.q, filter.method, filter.from, filter.to].filter(Boolean).length}>
          <UrlSelect
            param="method"
            label="Method"
            options={PAYMENT_METHODS.map((value) => ({ value, label: humanise(value) }))}
            allLabel="Any method"
          />
          <UrlDateFilter param="from" label="Received from" />
          <UrlDateFilter param="to" label="Received to" />
        </FilterBar>

        <PaymentsTable
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
