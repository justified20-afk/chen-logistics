import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { codFilterSchema, listCodRecords } from "@/lib/finance";
import { getDb } from "@/lib/mongodb";
import { formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/layout/page-header";
import { CodTable } from "@/components/finance/cod-table";
import { FilterBar, UrlSelect } from "@/components/tables/url-filters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reconciliation",
  robots: { index: false, follow: false },
};

const AWAITING = "pending,collected,partially_collected,not_collected";

export default async function ReconciliationPage({
  searchParams,
}: PageProps<"/finance/reconciliation">): Promise<React.JSX.Element> {
  const user = await requirePermission("finance.manage");
  const raw = await searchParams;
  const plain: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    plain[key] = Array.isArray(value) ? value[0] : value;
  }
  const parsed = codFilterSchema.safeParse(plain);
  const filter = parsed.success ? parsed.data : {};
  if (!filter.status) filter.status = AWAITING;

  const db = await getDb();
  const [result, settingsDoc] = await Promise.all([
    listCodRecords(filter, user),
    db.collection("settings").findOne({ _id: "system" } as never),
  ]);
  const currency = (settingsDoc as unknown as { currency?: string } | null)?.currency ?? "NGN";

  const pendingGap = result.rows.reduce(
    (sum, row) => sum + Math.max(0, row.expectedMinor - row.collectedMinor),
    0,
  );
  const settledTotal = result.rows.reduce((sum, row) => sum + row.collectedMinor, 0);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Reconciliation"
        description="Cash collected in the field, waiting to be settled against what was expected. Every difference needs a written reason and raises a payment exception."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Records awaiting settlement" value={String(result.total)} />
        <Stat label="Collected cash in queue" value={formatMoney(settledTotal, currency)} />
        <Stat
          label="Unexplained gap"
          value={formatMoney(pendingGap, currency)}
          tone={pendingGap > 0 ? "danger" : undefined}
        />
      </div>

      <div className="space-y-3">
        <FilterBar activeCount={[filter.q, filter.status].filter(Boolean).length}>
          <UrlSelect
            param="status"
            label="Status"
            options={[
              { value: AWAITING, label: "Awaiting reconciliation" },
              { value: "collected", label: "Collected" },
              { value: "partially_collected", label: "Partially collected" },
              { value: "not_collected", label: "Not collected" },
              { value: "pending", label: "Pending" },
              { value: "reconciled", label: "Reconciled" },
            ]}
            allLabel="Awaiting reconciliation"
          />
        </FilterBar>

        <CodTable
          rows={result.rows}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
          sort={filter.sort}
          dir={filter.dir}
          currency={currency}
          canManage
        />
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={
          tone === "danger"
            ? "mt-1 text-xl font-semibold tabular-nums text-danger"
            : "mt-1 text-xl font-semibold tabular-nums"
        }
      >
        {value}
      </p>
    </div>
  );
}
