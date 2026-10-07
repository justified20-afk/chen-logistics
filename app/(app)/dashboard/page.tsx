import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CircleAlert,
  Clock3,
  Coins,
  Package,
  TrendingUp,
  Truck,
  Warehouse,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { getDb } from "@/lib/mongodb";
import { toDomainList } from "@/lib/db";
import { formatMoneyCompact } from "@/lib/money";
import { APP_NAME } from "@/lib/brand";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  SeverityBadge,
  humanise,
} from "@/components/ui/status-badge";
import type { Exception, Pickup, Shipment, TrackingEvent, Trip } from "@/types/domain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

const TERMINAL = ["delivered", "returned", "cancelled"];
const ACTIVE_MATCH = { status: { $nin: TERMINAL } };

interface ProblemItem {
  label: string;
  sub: string;
  href: string;
}

interface ProblemCardData {
  key: string;
  title: string;
  count: number;
  href: string;
  action: string;
  tone: "danger" | "warning" | "info";
  items: ProblemItem[];
}

function timeAgo(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const user = await requireUser();
  if (user.role === "customer") redirect("/customer");

  const canSeeShipments = user.permissions.includes("shipments.view");
  const canSeeExceptions = user.permissions.includes("exceptions.view");
  const canSeeDispatch = user.permissions.includes("dispatch.view");
  const canSeeFinance = user.permissions.includes("finance.view");
  const canSeeFleet = user.permissions.includes("fleet.view");
  const canSeeHubs = user.permissions.includes("hubs.view");

  const db = await getDb();
  const shipments = db.collection("shipments");
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  // Driver accounts only ever see their own work.
  const scope: Record<string, unknown> | null =
    user.role === "driver" && user.driverId ? { driverId: user.driverId } : null;
  const scoped = (match: Record<string, unknown>): Record<string, unknown> =>
    scope ? { $and: [scope, match] } : match;

  const settingsDoc = await db.collection("settings").findOne({ _id: "system" } as never);
  const currency =
    (settingsDoc as unknown as { currency?: string } | null)?.currency ?? "NGN";

  const [
    activeCount,
    dueTodayCount,
    outForDeliveryCount,
    bookedTodayCount,
    statusAgg,
    onTimeAgg,
    delayedDocs,
    failedDocs,
    unassignedPickups,
    unassignedPickupCount,
    openTripCount,
    openTrips,
    openExceptionCount,
    openExceptions,
    codAgg,
    overdueInvoiceCount,
    outstandingAgg,
    recentEvents,
    availableVehicles,
    onDutyDrivers,
  ] = await Promise.all([
    shipments.countDocuments(scoped(ACTIVE_MATCH)),
    shipments.countDocuments(
      scoped({
        ...ACTIVE_MATCH,
        promisedDeliveryAt: { $gte: startOfDay, $lt: endOfDay },
      }),
    ),
    shipments.countDocuments(scoped({ status: "out_for_delivery" })),
    shipments.countDocuments(scoped({ createdAt: { $gte: startOfDay } })),
    shipments
      .aggregate([
        ...(scope ? [{ $match: scope }] : []),
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .toArray(),
    shipments
      .aggregate([
        ...(scope ? [{ $match: scope }] : []),
        {
          $match: {
            status: "delivered",
            deliveredAt: { $ne: null },
            promisedDeliveryAt: { $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            onTime: {
              $sum: {
                $cond: [{ $lte: ["$deliveredAt", "$promisedDeliveryAt"] }, 1, 0],
              },
            },
          },
        },
      ])
      .toArray(),
    shipments
      .find(scoped({ delayedReason: { $ne: null }, ...ACTIVE_MATCH }))
      .project({
        trackingNumber: 1,
        status: 1,
        promisedDeliveryAt: 1,
        delayedReason: 1,
        "recipient.city": 1,
      })
      .sort({ promisedDeliveryAt: 1 })
      .limit(4)
      .toArray(),
    shipments
      .find(scoped({ status: { $in: ["failed", "delivery_attempted"] } }))
      .project({
        trackingNumber: 1,
        status: 1,
        failureReason: 1,
        attemptCount: 1,
        "recipient.city": 1,
        updatedAt: 1,
      })
      .sort({ updatedAt: -1 })
      .limit(4)
      .toArray(),
    db
      .collection("pickups")
      .find({ status: "scheduled", driverId: null } as never)
      .project({ reference: 1, scheduledFor: 1, "address.city": 1 })
      .sort({ scheduledFor: 1 })
      .limit(4)
      .toArray(),
    db.collection("pickups").countDocuments({ status: "scheduled", driverId: null } as never),
    db
      .collection("trips")
      .countDocuments({ status: { $in: ["draft", "planned", "assigned", "ready"] } } as never),
    db
      .collection("trips")
      .find({ status: { $in: ["draft", "planned", "assigned", "ready"] } } as never)
      .project({
        tripNumber: 1,
        status: 1,
        date: 1,
        driverName: 1,
        totalPackages: 1,
        originHubName: 1,
        destinationHubName: 1,
      })
      .sort({ date: 1 })
      .limit(4)
      .toArray(),
    db
      .collection("exceptions")
      .countDocuments({ status: { $nin: ["resolved", "closed"] } } as never),
    db
      .collection("exceptions")
      .find({ status: { $nin: ["resolved", "closed"] } } as never)
      .project({
        reference: 1,
        title: 1,
        severity: 1,
        status: 1,
        shipmentTrackingNumber: 1,
        createdAt: 1,
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray(),
    db
      .collection("codRecords")
      .aggregate([
        { $match: { status: { $in: ["pending", "partially_collected", "not_collected"] } } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            expected: { $sum: "$expectedMinor" },
            collected: { $sum: "$collectedMinor" },
          },
        },
      ])
      .toArray(),
    db.collection("invoices").countDocuments({
      status: { $in: ["issued", "partially_paid"] },
      dueAt: { $lt: now },
    } as never),
    db
      .collection("invoices")
      .aggregate([
        { $match: { status: { $in: ["issued", "partially_paid"] } } },
        { $group: { _id: null, balance: { $sum: "$balanceMinor" } } },
      ])
      .toArray(),
    db
      .collection("trackingEvents")
      .find({})
      .project({ trackingNumber: 1, label: 1, type: 1, location: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(7)
      .toArray(),
    db.collection("vehicles").countDocuments({ status: "available" } as never),
    db.collection("drivers").countDocuments({ status: { $in: ["available", "assigned", "on_trip"] } } as never),
  ]);

  const onTimeRow = onTimeAgg[0] as { total?: number; onTime?: number } | undefined;
  const onTimeTotal = onTimeRow?.total ?? 0;
  const onTimePercent =
    onTimeTotal > 0 ? Math.round(((onTimeRow?.onTime ?? 0) / onTimeTotal) * 100) : null;

  const codRow = codAgg[0] as
    | { count?: number; expected?: number; collected?: number }
    | undefined;
  const codCount = codRow?.count ?? 0;
  const codGapMinor = Math.max(0, (codRow?.expected ?? 0) - (codRow?.collected ?? 0));
  const outstandingMinor =
    (outstandingAgg[0] as { balance?: number } | undefined)?.balance ?? 0;

  const statusCounts = new Map<string, number>();
  for (const row of statusAgg) {
    statusCounts.set(String(row._id), Number(row.count ?? 0));
  }

  const delayed = toDomainList<Partial<Shipment>>(delayedDocs as never[]);
  const failed = toDomainList<Partial<Shipment>>(failedDocs as never[]);
  const pickups = toDomainList<Partial<Pickup>>(unassignedPickups as never[]);
  const trips = toDomainList<Partial<Trip>>(openTrips as never[]);
  const exceptions = toDomainList<Partial<Exception>>(openExceptions as never[]);
  const events = toDomainList<TrackingEvent>(recentEvents as never[]);

  /* Problems first — this is an operations console, not a vanity screen. ---- */
  const problemCards: ProblemCardData[] = [];

  if (canSeeShipments && delayed.length > 0) {
    problemCards.push({
      key: "delayed",
      title: "Delayed shipments",
      count: delayed.length,
      href: "/shipments?delayedOnly=true&sort=promisedDeliveryAt&dir=asc",
      action: "Open delayed list",
      tone: "danger",
      items: delayed.map((shipment) => ({
        label: shipment.trackingNumber ?? "—",
        sub: `${shipment.delayedReason ?? "Late"} · promised ${shipment.promisedDeliveryAt ? new Date(shipment.promisedDeliveryAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"} · ${shipment.status ? humanise(shipment.status) : ""}`,
        href: `/shipments/${shipment.id ?? ""}`,
      })),
    });
  }

  if (canSeeShipments && failed.length > 0) {
    problemCards.push({
      key: "failed",
      title: "Failed deliveries",
      count: failed.length,
      href: "/shipments?status=failed,delivery_attempted",
      action: "Review attempts",
      tone: "danger",
      items: failed.map((shipment) => ({
        label: shipment.trackingNumber ?? "—",
        sub: `${shipment.failureReason ? humanise(shipment.failureReason) : humanise(shipment.status ?? "")} · attempt ${shipment.attemptCount ?? 1} · ${shipment.recipient?.city ?? ""}`,
        href: `/shipments/${shipment.id ?? ""}`,
      })),
    });
  }

  if (canSeeShipments && unassignedPickupCount > 0) {
    problemCards.push({
      key: "pickups",
      title: "Pickups with no driver",
      count: unassignedPickupCount,
      href: "/pickups?status=scheduled",
      action: "Assign pickups",
      tone: "warning",
      items: pickups.map((pickup) => ({
        label: pickup.reference ?? "—",
        sub: `Scheduled ${pickup.scheduledFor ? new Date(pickup.scheduledFor).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"} · ${pickup.address?.city ?? ""}`,
        href: `/pickups?q=${encodeURIComponent(pickup.reference ?? "")}`,
      })),
    });
  }

  if (canSeeDispatch && openTripCount > 0) {
    problemCards.push({
      key: "trips",
      title: "Trips awaiting assignment",
      count: openTripCount,
      href: "/dispatch",
      action: "Open dispatch board",
      tone: "warning",
      items: trips.map((trip) => ({
        label: trip.tripNumber ?? "—",
        sub: `${trip.driverName ? `Driver ${trip.driverName}` : "No driver assigned"} · ${trip.originHubName ?? ""} → ${trip.destinationHubName ?? ""}`,
        href: "/dispatch",
      })),
    });
  }

  if (canSeeExceptions && openExceptionCount > 0) {
    problemCards.push({
      key: "exceptions",
      title: "Open exceptions",
      count: openExceptionCount,
      href: "/exceptions?status=open,acknowledged,investigating,waiting",
      action: "Work the queue",
      tone: "danger",
      items: exceptions.slice(0, 4).map((exception) => ({
        label: exception.title ?? "—",
        sub: `${humanise(exception.severity ?? "medium")} · ${humanise(exception.status ?? "open")} · ${exception.shipmentTrackingNumber ?? exception.reference ?? ""}`,
        href: "/exceptions",
      })),
    });
  }

  if (canSeeFinance && (codCount > 0 || overdueInvoiceCount > 0)) {
    problemCards.push({
      key: "payments",
      title: "Payment discrepancies",
      count: codCount + overdueInvoiceCount,
      href: "/finance",
      action: "Open finance",
      tone: "warning",
      items: [
        codCount > 0
          ? {
              label: `${codCount} COD record${codCount === 1 ? "" : "s"} unreconciled`,
              sub: `Gap of ${formatMoneyCompact(codGapMinor, currency)} not yet reconciled`,
              href: "/finance/cod",
            }
          : {
              label: "No COD discrepancies",
              sub: "All collected cash matches expectations",
              href: "/finance/cod",
            },
        overdueInvoiceCount > 0
          ? {
              label: `${overdueInvoiceCount} invoice${overdueInvoiceCount === 1 ? "" : "s"} overdue`,
              sub: `${formatMoneyCompact(outstandingMinor, currency)} outstanding across open invoices`,
              href: "/finance/invoices",
            }
          : {
              label: "No overdue invoices",
              sub: "Receivables are within terms",
              href: "/finance/invoices",
            },
      ],
    });
  }

  const activeToday = statusCounts.get("out_for_delivery") ?? outForDeliveryCount;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title={`${greeting()}, ${user.name.split(" ")[0]}`}
        description={`${todayLabel()} · ${APP_NAME} operations. Problems are listed first — anything merely interesting is below.`}
        actions={
          canSeeShipments ? (
            <Link
              href="/shipments"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium hover:bg-surface-hover"
            >
              All shipments <ArrowRight className="size-4" aria-hidden />
            </Link>
          ) : null
        }
      />

      {problemCards.length > 0 ? (
        <section aria-labelledby="needs-attention">
          <div className="flex items-center gap-2">
            <CircleAlert className="size-4 text-danger" aria-hidden />
            <h2 id="needs-attention" className="text-sm font-semibold">
              Needs attention
            </h2>
            <span className="text-xs text-muted-foreground">
              · {problemCards.reduce((sum, card) => sum + card.count, 0)} item
              {problemCards.reduce((sum, card) => sum + card.count, 0) === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {problemCards.map((card) => (
              <ProblemCard key={card.key} card={card} />
            ))}
          </div>
        </section>
      ) : (
        <Card title="Nothing needs attention" description="No open problems for your role right now.">
          <p className="text-sm text-muted-foreground">
            Delayed shipments, failed deliveries, unassigned work and payment discrepancies will
            appear here the moment they exist.
          </p>
        </Card>
      )}

      <section aria-label="Key numbers" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {canSeeShipments ? (
          <>
            <Kpi
              icon={<Package className="size-4" aria-hidden />}
              label="Active shipments"
              value={activeCount.toLocaleString("en-US")}
              sub={`${bookedTodayCount} booked today`}
              href="/shipments"
            />
            <Kpi
              icon={<Clock3 className="size-4" aria-hidden />}
              label="Due today"
              value={dueTodayCount.toLocaleString("en-US")}
              sub={`${activeToday} out for delivery now`}
              href="/shipments?sort=promisedDeliveryAt&dir=asc"
            />
          </>
        ) : null}
        {canSeeShipments && onTimePercent !== null ? (
          <Kpi
            icon={<TrendingUp className="size-4" aria-hidden />}
            label="On-time delivery"
            value={`${onTimePercent}%`}
            sub={`${onTimeTotal.toLocaleString("en-US")} completed deliveries measured`}
            href="/reports"
          />
        ) : null}
        {canSeeExceptions ? (
          <Kpi
            icon={<CircleAlert className="size-4" aria-hidden />}
            label="Open exceptions"
            value={openExceptionCount.toLocaleString("en-US")}
            sub="Unresolved, unacknowledged or waiting"
            href="/exceptions"
          />
        ) : null}
        {canSeeFinance ? (
          <Kpi
            icon={<Coins className="size-4" aria-hidden />}
            label="Outstanding"
            value={formatMoneyCompact(outstandingMinor, currency)}
            sub={`${codCount} COD record${codCount === 1 ? "" : "s"} to reconcile`}
            href="/finance"
          />
        ) : null}
        {canSeeFleet ? (
          <Kpi
            icon={<Truck className="size-4" aria-hidden />}
            label="Vehicles available"
            value={availableVehicles.toLocaleString("en-US")}
            sub={`${onDutyDrivers} drivers on duty`}
            href="/fleet/vehicles"
          />
        ) : null}
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        {canSeeShipments ? (
          <Card
            title="Shipment flow"
            description="Where the active book currently sits"
            actions={
              <Link
                href="/shipments"
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Open
              </Link>
            }
          >
            <FlowList counts={statusCounts} />
          </Card>
        ) : null}

        <Card
          title="Latest activity"
          description="Immutable tracking events, newest first"
          className={canSeeShipments ? "lg:col-span-2" : "lg:col-span-3"}
        >
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {events.map((event) => (
                <li key={event.id} className="flex items-baseline justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      <span className="font-mono text-xs font-semibold text-primary">
                        {event.trackingNumber}
                      </span>{" "}
                      <span className="font-medium">{event.label}</span>
                    </p>
                    {event.location ? (
                      <p className="truncate text-xs text-muted-foreground">{event.location}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {timeAgo(event.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {canSeeExceptions ? (
          <Card
            title="Open exceptions"
            description="Oldest problems stay visible until someone owns them"
            actions={
              <Link
                href="/exceptions"
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                All exceptions
              </Link>
            }
          >
            {exceptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No open exceptions. Nothing is quietly failing right now.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {exceptions.map((exception) => (
                  <li key={exception.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{exception.title}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {exception.shipmentTrackingNumber ?? exception.reference}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <SeverityBadge severity={exception.severity ?? "medium"} />
                      <span className="text-[11px] text-muted-foreground">
                        {timeAgo(exception.createdAt ?? new Date().toISOString())}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}

        {canSeeHubs ? (
          <Card
            title="Network today"
            description="Hubs, fleet and floor capacity at a glance"
            actions={
              <Link
                href="/hubs"
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Hubs
              </Link>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <NetworkTile
                icon={<Warehouse className="size-4" aria-hidden />}
                label="Hubs operating"
                value={String((statusCounts.get("at_origin_hub") ?? 0) + (statusCounts.get("at_destination_hub") ?? 0))}
                sub="Shipments currently staged at a hub"
              />
              <NetworkTile
                icon={<Truck className="size-4" aria-hidden />}
                label="On the road"
                value={String(statusCounts.get("in_transit") ?? 0)}
                sub="Shipments in transit right now"
              />
              <NetworkTile
                icon={<Package className="size-4" aria-hidden />}
                label="Awaiting pickup"
                value={String((statusCounts.get("booked") ?? 0) + (statusCounts.get("awaiting_pickup") ?? 0))}
                sub="Booked but not yet collected"
              />
              <NetworkTile
                icon={<Truck className="size-4" aria-hidden />}
                label="Out for delivery"
                value={String(activeToday)}
                sub="With a driver, final leg"
              />
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function ProblemCard({ card }: { card: ProblemCardData }) {
  const accent =
    card.tone === "danger"
      ? "text-danger"
      : card.tone === "warning"
        ? "text-warning"
        : "text-info";
  return (
    <article className="flex flex-col rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{card.title}</h3>
          <p className="text-xs text-muted-foreground">
            {card.count} item{card.count === 1 ? "" : "s"} open
          </p>
        </div>
        <span className={`text-xl font-semibold tabular-nums ${accent}`}>{card.count}</span>
      </header>
      <ul className="flex-1 divide-y divide-border px-4">
        {card.items.length === 0 ? (
          <li className="py-3 text-sm text-muted-foreground">Nothing queued.</li>
        ) : (
          card.items.map((item, index) => (
            <li key={`${item.label}-${index}`} className="py-2.5">
              <Link
                href={item.href}
                className="block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <p className="truncate font-mono text-xs font-semibold text-primary">{item.label}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.sub}</p>
              </Link>
            </li>
          ))
        )}
      </ul>
      <footer className="border-t border-border px-4 py-3">
        <Link
          href={card.href}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          {card.action} <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </footer>
    </article>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-surface-hover"
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{sub}</p>
    </Link>
  );
}

function NetworkTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-1.5 text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{sub}</p>
    </div>
  );
}

function FlowList({ counts }: { counts: Map<string, number> }) {
  const order = [
    "booked",
    "awaiting_pickup",
    "picked_up",
    "at_origin_hub",
    "in_transit",
    "at_destination_hub",
    "out_for_delivery",
    "delivery_attempted",
    "delivered",
    "failed",
    "return_initiated",
    "returned",
    "cancelled",
  ];
  const rows = order
    .map((status) => ({ status, count: counts.get(status) ?? 0 }))
    .filter((row) => row.count > 0);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No shipments recorded yet.</p>;
  }

  const max = Math.max(...rows.map((row) => row.count));

  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.status} className="flex items-center gap-3">
          <span className="w-36 shrink-0 truncate text-xs text-muted-foreground">
            {humanise(row.status)}
          </span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${Math.max(6, Math.round((row.count / max) * 100))}%` }}
            />
          </span>
          <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums">
            {row.count}
          </span>
        </li>
      ))}
    </ul>
  );
}
