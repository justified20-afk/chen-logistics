import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { getDb } from "@/lib/mongodb";
import { toDomainList } from "@/lib/db";
import { fleetFilterSchema } from "@/lib/schemas/fleet";
import { PageHeader } from "@/components/layout/page-header";
import { CustomersTable } from "@/components/customers/customers-table";
import { FilterBar, UrlSelect } from "@/components/tables/url-filters";
import type { Customer } from "@/types/domain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Customers",
  robots: { index: false, follow: false },
};

const ACCOUNT_STATUSES = ["active", "on_hold", "closed"] as const;

export default async function CustomersPage({
  searchParams,
}: PageProps<"/customers">): Promise<React.JSX.Element> {
  await requirePermission("customers.view");
  const raw = await searchParams;
  const plain: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    plain[key] = Array.isArray(value) ? value[0] : value;
  }

  const filterSchema = fleetFilterSchema;
  const parsed = filterSchema.safeParse(plain);
  const filter = parsed.success ? parsed.data : {};
  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? 20;

  const query: Record<string, unknown> = {};
  if (filter.q) {
    const escaped = filter.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [{ name: regex }, { code: regex }, { contactPerson: regex }, { email: regex }];
  }
  if (filter.status) query.accountStatus = filter.status;

  const SORTABLE: Record<string, string> = {
    name: "name",
    createdAt: "createdAt",
    creditTermsDays: "creditTermsDays",
    accountStatus: "accountStatus",
  };
  const sortKey = SORTABLE[filter.sort ?? ""] ?? "name";
  const direction = filter.dir === "asc" ? 1 : -1;

  const db = await getDb();
  const [total, docs, statusAgg] = await Promise.all([
    db.collection("customers").countDocuments(query as never),
    db
      .collection("customers")
      .find(query as never)
      .sort({ [sortKey]: direction } as never)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
    db
      .collection("customers")
      .aggregate([{ $group: { _id: "$accountStatus", count: { $sum: 1 } } }])
      .toArray(),
  ]);

  const customers = toDomainList<Customer>(docs);
  const counts = new Map(statusAgg.map((row) => [String(row._id), Number(row.count ?? 0)]));

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Customers"
        description="Accounts that ship with Vale, their contacts, credit terms and account standing."
      />

      <div className="flex flex-wrap gap-2">
        {ACCOUNT_STATUSES.filter((status) => (counts.get(status) ?? 0) > 0).map((status) => (
          <span
            key={status}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs"
          >
            <span className="font-medium">{status.replace("_", " ")}</span>
            <span className="tabular-nums text-muted-foreground">{counts.get(status) ?? 0}</span>
          </span>
        ))}
      </div>

      <div className="space-y-3">
        <FilterBar activeCount={[filter.q, filter.status].filter(Boolean).length}>
          <UrlSelect
            param="status"
            label="Account status"
            options={ACCOUNT_STATUSES.map((value) => ({ value, label: value.replace("_", " ") }))}
            allLabel="Any status"
          />
        </FilterBar>

        <CustomersTable
          rows={customers}
          total={total}
          page={page}
          pageSize={pageSize}
          sort={filter.sort}
          dir={filter.dir}
        />
      </div>
    </div>
  );
}
