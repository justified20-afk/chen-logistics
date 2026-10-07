import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { listExceptions, type ExceptionListFilter } from "@/lib/exceptions";
import { exceptionFilterSchema } from "@/lib/schemas/fleet";
import { getDb } from "@/lib/mongodb";
import { toDomainList } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { ExceptionsTable } from "@/components/exceptions/exceptions-table";
import { NewExceptionButton } from "@/components/exceptions/new-exception-button";
import { FilterBar, UrlDateFilter, UrlSelect } from "@/components/tables/url-filters";
import { humanise } from "@/components/ui/status-badge";
import { EXCEPTION_STATUSES, EXCEPTION_TYPES, SEVERITIES } from "@/types/domain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Exceptions",
  robots: { index: false, follow: false },
};

function readFilters(raw: Record<string, string | string[] | undefined>): ExceptionListFilter {
  const plain: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    plain[key] = Array.isArray(value) ? value[0] : value;
  }
  const parsed = exceptionFilterSchema.safeParse(plain);
  return parsed.success ? parsed.data : {};
}

export default async function ExceptionsPage({
  searchParams,
}: PageProps<"/exceptions">): Promise<React.JSX.Element> {
  const user = await requirePermission("exceptions.view");
  const raw = await searchParams;
  const filter = readFilters(raw);

  const db = await getDb();
  const canManage = user.permissions.includes("exceptions.manage");

  const [result, health, linkDocs] = await Promise.all([
    listExceptions(filter, user),
    db
      .collection("exceptions")
      .aggregate([
        { $match: { status: { $nin: ["resolved", "closed"] } } },
        {
          $group: {
            _id: null,
            open: { $sum: 1 },
            critical: { $sum: { $cond: [{ $in: ["$severity", ["critical", "high"]] }, 1, 0] } },
            unowned: { $sum: { $cond: [{ $or: [{ $eq: ["$ownerId", null] }, { $eq: ["$ownerId", undefined] }] }, 1, 0] } },
            overdue: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$dueAt", null] },
                      { $ne: ["$dueAt", undefined] },
                      { $lt: ["$dueAt", new Date()] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ])
      .toArray(),
    canManage
      ? Promise.all([
          db.collection("hubs").find({}).project({ name: 1 }).sort({ name: 1 }).toArray(),
          db.collection("drivers").find({}).project({ name: 1 }).sort({ name: 1 }).toArray(),
          db.collection("vehicles").find({}).project({ registrationNumber: 1 }).sort({ registrationNumber: 1 }).toArray(),
        ])
      : Promise.resolve([[], [], []] as never[]),
  ]);

  const stats = (health[0] as
    | { open?: number; critical?: number; unowned?: number; overdue?: number }
    | undefined) ?? {};

  const [hubDocs, driverDocs, vehicleDocs] = linkDocs as [
    { _id: unknown; name?: string }[],
    { _id: unknown; name?: string }[],
    { _id: unknown; registrationNumber?: string }[],
  ];

  const activeFilters = [filter.q, filter.status, filter.severity, filter.type, filter.from, filter.to].filter(
    Boolean,
  ).length;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Exceptions"
        description="Delayed, damaged, failed and payment problems stay visible until an owner resolves them with a recorded reason."
        actions={
          canManage ? (
            <NewExceptionButton
              hubs={hubDocs.map((doc) => ({ value: String(doc._id), label: doc.name ?? "Hub" }))}
              drivers={driverDocs.map((doc) => ({ value: String(doc._id), label: doc.name ?? "Driver" }))}
              vehicles={vehicleDocs.map((doc) => ({
                value: String(doc._id),
                label: doc.registrationNumber ?? "Vehicle",
              }))}
            />
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Unresolved" value={stats.open ?? 0} />
        <Stat label="High or critical" value={stats.critical ?? 0} tone={stats.critical ? "danger" : undefined} />
        <Stat label="Unowned" value={stats.unowned ?? 0} tone={stats.unowned ? "warning" : undefined} />
        <Stat label="Past due" value={stats.overdue ?? 0} tone={stats.overdue ? "warning" : undefined} />
      </div>

      <div className="space-y-3">
        <FilterBar activeCount={activeFilters}>
          <UrlSelect
            param="status"
            label="Status"
            options={[
              {
                value: "open,acknowledged,investigating,waiting",
                label: "Unresolved only",
              },
              ...EXCEPTION_STATUSES.map((value) => ({ value, label: humanise(value) })),
            ]}
            allLabel="Any status"
          />
          <UrlSelect
            param="severity"
            label="Severity"
            options={SEVERITIES.map((value) => ({ value, label: humanise(value) }))}
            allLabel="Any severity"
          />
          <UrlSelect
            param="type"
            label="Type"
            options={EXCEPTION_TYPES.map((value) => ({ value, label: humanise(value) }))}
            allLabel="Any type"
          />
          <UrlDateFilter param="from" label="Raised from" />
          <UrlDateFilter param="to" label="Raised to" />
        </FilterBar>

        <ExceptionsTable
          rows={result.rows}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
          sort={filter.sort}
          dir={filter.dir}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
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
    </div>
  );
}
