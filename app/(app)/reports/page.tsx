import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { requirePermission } from "@/lib/session";
import { getDb } from "@/lib/mongodb";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import { PageHeader } from "@/components/layout/page-header";
import { Card, humanise } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reports",
  robots: { index: false, follow: false },
};

const TERMINAL = ["delivered", "returned", "cancelled"];

/** Start of the reporting window — kept out of the render body on purpose. */
function windowStart(days: number | null): Date {
  return days ? new Date(Date.now() - days * 86_400_000) : new Date(0);
}

export default async function ReportsPage({
  searchParams,
}: PageProps<"/reports">): Promise<React.JSX.Element> {
  const user = await requirePermission("reports.view");
  const raw = await searchParams;
  const daysRaw = Array.isArray(raw.days) ? raw.days[0] : raw.days;
  const days = daysRaw === "all" ? null : daysRaw === "90" ? 90 : 30;
  const since = windowStart(days);

  const db = await getDb();
  const settingsDoc = await db.collection("settings").findOne({ _id: "system" } as never);
  const currency = (settingsDoc as unknown as { currency?: string } | null)?.currency ?? "NGN";

  const matchWindow = { createdAt: { $gte: since } };

  const [
    onTimeAgg,
    volumeByMonth,
    serviceLevelAgg,
    hubAgg,
    statusAgg,
    revenueAgg,
    paymentAgg,
    exceptionAgg,
    driverAgg,
    totals,
  ] = await Promise.all([
    db
      .collection("shipments")
      .aggregate([
        {
          $match: {
            status: "delivered",
            deliveredAt: { $ne: null },
            promisedDeliveryAt: { $ne: null },
            ...(days ? { deliveredAt: { $gte: since } } : {}),
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            onTime: { $sum: { $cond: [{ $lte: ["$deliveredAt", "$promisedDeliveryAt"] }, 1, 0] } },
            avgHours: {
              $avg: {
                $divide: [{ $subtract: ["$deliveredAt", "$createdAt"] }, 3600000],
              },
            },
          },
        },
      ])
      .toArray(),
    db
      .collection("shipments")
      .aggregate([
        { $match: matchWindow },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            booked: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 12 },
      ])
      .toArray(),
    db
      .collection("shipments")
      .aggregate([
        { $match: matchWindow },
        {
          $group: {
            _id: "$serviceLevel",
            count: { $sum: 1 },
            fee: { $sum: "$shippingFeeMinor" },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    db
      .collection("shipments")
      .aggregate([
        { $match: matchWindow },
        { $group: { _id: "$originHubName", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    db
      .collection("shipments")
      .aggregate([
        { $match: matchWindow },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    db
      .collection("invoices")
      .aggregate([
        { $match: days ? { createdAt: { $gte: since } } : {} },
        {
          $group: {
            _id: null,
            invoiced: { $sum: "$totalMinor" },
            paid: { $sum: "$amountPaidMinor" },
            balance: { $sum: "$balanceMinor" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    db
      .collection("payments")
      .aggregate([
        { $match: days ? { receivedAt: { $gte: since }, status: "recorded" } : { status: "recorded" } },
        { $group: { _id: "$method", total: { $sum: "$amountMinor" }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ])
      .toArray(),
    db
      .collection("exceptions")
      .aggregate([
        { $match: days ? { createdAt: { $gte: since } } : {} },
        {
          $group: {
            _id: { type: "$type", open: { $in: ["$status", ["open", "acknowledged", "investigating", "waiting"]] } },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    db
      .collection("shipments")
      .aggregate([
        { $match: { driverName: { $ne: null }, ...(days ? matchWindow : {}) } },
        {
          $group: {
            _id: { name: "$driverName" },
            delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $in: ["$status", ["failed", "return_initiated", "returned"]] }, 1, 0] } },
            active: {
              $sum: { $cond: [{ $in: ["$status", TERMINAL] }, 0, 1] } as never,
            },
          },
        },
        { $sort: { delivered: -1 } },
        { $limit: 12 },
      ])
      .toArray(),
    db.collection("shipments").countDocuments({} as never),
  ]);

  const onTime = (onTimeAgg[0] as { total?: number; onTime?: number; avgHours?: number } | undefined) ?? {};
  const revenue = (revenueAgg[0] as { invoiced?: number; paid?: number; balance?: number; count?: number } | undefined) ?? {};
  const maxMonth = Math.max(1, ...volumeByMonth.map((row) => Number(row.booked ?? 0)));
  const maxHub = Math.max(1, ...hubAgg.map((row) => Number(row.count ?? 0)));
  const canExport = user.permissions.includes("shipments.view");

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Reports"
        description="Derived from the operational records — no separate analytics store, no estimates. Figures respect your permission scope."
        actions={
          canExport ? (
            <Link
              href="/api/export/shipments"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium hover:bg-surface-hover"
            >
              <Download className="size-4" aria-hidden />
              Export shipments (CSV)
            </Link>
          ) : null
        }
      />

      <nav className="flex flex-wrap gap-1.5" aria-label="Report period">
        {[
          { label: "Last 30 days", value: "30" },
          { label: "Last 90 days", value: "90" },
          { label: "All time", value: "all" },
        ].map((option) => {
          const active = (days ? String(days) : "all") === option.value;
          return (
            <Link
              key={option.value}
              href={`/reports?days=${option.value}`}
              className={
                active
                  ? "inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
                  : "inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-surface-hover"
              }
            >
              {option.label}
            </Link>
          );
        })}
      </nav>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="On-time delivery"
          value={onTime.total ? `${Math.round(((onTime.onTime ?? 0) / (onTime.total || 1)) * 100)}%` : "—"}
          sub={onTime.total ? `${onTime.onTime ?? 0} of ${onTime.total} delivered on time` : "No deliveries in window"}
        />
        <Kpi
          label="Average delivery time"
          value={onTime.avgHours ? `${Math.round(onTime.avgHours)}h` : "—"}
          sub="Booking to delivered"
        />
        <Kpi
          label="Invoiced"
          value={formatMoneyCompact(revenue.invoiced ?? 0, currency)}
          sub={`${revenue.count ?? 0} invoices in window`}
        />
        <Kpi
          label="Receivable balance"
          value={formatMoneyCompact(revenue.balance ?? 0, currency)}
          sub={`${formatMoney(revenue.paid ?? 0, currency)} paid`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Bookings by month" description={`${totals} shipments in the system overall`}>
          {volumeByMonth.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings in this window.</p>
          ) : (
            <ul className="space-y-2">
              {volumeByMonth.map((row) => (
                <li key={String(row._id)} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs tabular-nums text-muted-foreground">
                    {String(row._id)}
                  </span>
                  <span className="h-3 flex-1 overflow-hidden rounded bg-muted">
                    <span
                      className="block h-full rounded bg-primary"
                      style={{ width: `${Math.max(4, Math.round((Number(row.booked ?? 0) / maxMonth) * 100))}%` }}
                    />
                  </span>
                  <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums">
                    {Number(row.booked ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Status snapshot" description="Where shipments in the window ended up">
          {statusAgg.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing in this window.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {statusAgg.map((row) => (
                <span
                  key={String(row._id)}
                  className="rounded border border-border bg-background px-2 py-1 text-xs"
                >
                  {humanise(String(row._id))}{" "}
                  <span className="font-semibold tabular-nums">{Number(row.count ?? 0)}</span>
                </span>
              ))}
            </div>
          )}
        </Card>

        <Card title="Service mix" description="Volume and fee value by service level">
          {serviceLevelAgg.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shipments in this window.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Service</th>
                  <th className="py-2 pr-3 text-right font-medium">Shipments</th>
                  <th className="py-2 text-right font-medium">Fees</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {serviceLevelAgg.map((row) => (
                  <tr key={String(row._id ?? "none")}>
                    <td className="py-2 pr-3">{humanise(String(row._id ?? "—"))}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{Number(row.count ?? 0)}</td>
                    <td className="py-2 text-right tabular-nums">
                      {formatMoney(Number(row.fee ?? 0), currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Origin hub volume" description="Where volume enters the network">
          {hubAgg.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shipments in this window.</p>
          ) : (
            <ul className="space-y-2">
              {hubAgg.map((row) => (
                <li key={String(row._id ?? "none")} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 truncate text-xs text-muted-foreground">
                    {String(row._id ?? "Unassigned")}
                  </span>
                  <span className="h-3 flex-1 overflow-hidden rounded bg-muted">
                    <span
                      className="block h-full rounded bg-brand"
                      style={{ width: `${Math.max(4, Math.round((Number(row.count ?? 0) / maxHub) * 100))}%` }}
                    />
                  </span>
                  <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums">
                    {Number(row.count ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Payments by method" description="How cash actually arrives">
          {paymentAgg.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded in this window.</p>
          ) : (
            <ul className="divide-y divide-border">
              {paymentAgg.map((row) => (
                <li key={String(row._id)} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm capitalize">{String(row._id).replace("_", " ")}</span>
                  <span className="text-sm font-medium tabular-nums">
                    {formatMoney(Number(row.total ?? 0), currency)}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ×{Number(row.count ?? 0)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Driver performance" description="Delivered, failed and still active">
          {driverAgg.length === 0 ? (
            <p className="text-sm text-muted-foreground">No driver-attributed shipments in this window.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Driver</th>
                  <th className="py-2 pr-3 text-right font-medium">Delivered</th>
                  <th className="py-2 pr-3 text-right font-medium">Failed</th>
                  <th className="py-2 text-right font-medium">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {driverAgg.map((row) => {
                  const name = String((row._id as { name?: string })?.name ?? "—");
                  return (
                    <tr key={name}>
                      <td className="py-2 pr-3 truncate">{name}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{Number(row.delivered ?? 0)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {Number(row.failed ?? 0) > 0 ? (
                          <span className="font-medium text-danger">{Number(row.failed ?? 0)}</span>
                        ) : (
                          0
                        )}
                      </td>
                      <td className="py-2 text-right tabular-nums">{Number(row.active ?? 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Card title="Exceptions raised" description="By type, with how many are still open">
        {exceptionAgg.length === 0 ? (
          <p className="text-sm text-muted-foreground">No exceptions raised in this window.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {exceptionAgg.map((row) => {
              const id = row._id as { type?: string; open?: boolean };
              return (
                <span
                  key={`${String(id.type)}-${String(id.open)}`}
                  className={
                    id.open
                      ? "rounded border border-danger/30 bg-danger/10 px-2 py-1 text-xs text-danger"
                      : "rounded border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
                  }
                >
                  {humanise(String(id.type ?? "unknown"))} · {id.open ? "open" : "closed"}{" "}
                  <span className="font-semibold tabular-nums">{Number(row.count ?? 0)}</span>
                </span>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
