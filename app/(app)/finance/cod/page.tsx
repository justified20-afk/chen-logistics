import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { codFilterSchema, listCodRecords } from "@/lib/finance";
import { getDb } from "@/lib/mongodb";
import { formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/layout/page-header";
import { CodTable } from "@/components/finance/cod-table";
import { FilterBar, UrlSelect } from "@/components/tables/url-filters";
import { COD_STATUSES } from "@/types/domain";
import { humanise } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cash on delivery",
  robots: { index: false, follow: false },
};

export default async function CodPage({
  searchParams,
}: PageProps<"/finance/cod">): Promise<React.JSX.Element> {
  const user = await requirePermission("finance.view");
  const canManage = user.permissions.includes("finance.manage");
  const raw = await searchParams;
  const plain: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    plain[key] = Array.isArray(value) ? value[0] : value;
  }
  const parsed = codFilterSchema.safeParse(plain);
  const filter = parsed.success ? parsed.data : {};

  const db = await getDb();
  const [result, settingsDoc, summary] = await Promise.all([
    listCodRecords(filter, user),
    db.collection("settings").findOne({ _id: "system" } as never),
    db
      .collection("codRecords")
      .aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            expected: { $sum: "$expectedMinor" },
            collected: { $sum: "$collectedMinor" },
          },
        },
      ])
      .toArray(),
  ]);

  const currency = (settingsDoc as unknown as { currency?: string } | null)?.currency ?? "NGN";
  const byStatus = new Map(
    summary.map((row) => [
      String(row._id),
      {
        count: Number(row.count ?? 0),
        expected: Number(row.expected ?? 0),
        collected: Number(row.collected ?? 0),
      },
    ]),
  );
  const outstanding = [...byStatus.entries()]
    .filter(([status]) => status !== "reconciled")
    .reduce(
      (acc, [, value]) => ({
        count: acc.count + value.count,
        gap: acc.gap + Math.max(0, value.expected - value.collected),
      }),
      { count: 0, gap: 0 },
    );

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Cash on delivery"
        description="Collection and reconciliation are separate steps: drivers collect, finance settles the difference, and any gap raises an exception."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Not reconciled" value={String(outstanding.count)} />
        <Stat label="Cash gap" value={formatMoney(outstanding.gap, currency)} tone={outstanding.gap > 0 ? "danger" : undefined} />
        <Stat
          label="Collected"
          value={formatMoney(
            [...byStatus.values()].reduce((sum, value) => sum + value.collected, 0),
            currency,
          )}
        />
        <Stat
          label="Reconciled records"
          value={String(byStatus.get("reconciled")?.count ?? 0)}
        />
      </div>

      <div className="space-y-3">
        <FilterBar activeCount={[filter.q, filter.status].filter(Boolean).length}>
          <UrlSelect
            param="status"
            label="Status"
            options={COD_STATUSES.map((value) => ({ value, label: humanise(value) }))}
            allLabel="Any status"
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
          canManage={canManage}
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
