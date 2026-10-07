import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/session";
import { getHub, listHubOperations } from "@/lib/hubs";
import { getDb } from "@/lib/mongodb";
import { toDomainList } from "@/lib/db";
import { RecordOperationButton } from "@/components/hubs/record-operation-button";
import { Card, StatusBadge, humanise } from "@/components/ui/status-badge";
import type { Shipment } from "@/types/domain";

export const dynamic = "force-dynamic";

interface HubParams {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: HubParams): Promise<Metadata> {
  const { id } = await params;
  const hub = await getHub(id);
  return {
    title: hub ? `${hub.name} — Hubs` : "Hub",
    robots: { index: false, follow: false },
  };
}

export default async function HubDetailPage({ params }: HubParams): Promise<React.JSX.Element> {
  const user = await requirePermission("hubs.view");
  const { id } = await params;
  const hub = await getHub(id);
  if (!hub) notFound();

  const canManage = user.permissions.includes("hubs.manage");
  const db = await getDb();

  const [statusAgg, waitingDocs, operations, delayedCount] = await Promise.all([
    db
      .collection("shipments")
      .aggregate([
        {
          $match: {
            $or: [{ originHubId: hub.id }, { destinationHubId: hub.id }],
            status: { $nin: ["delivered", "returned", "cancelled"] },
          },
        },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .toArray(),
    db
      .collection("shipments")
      .find({
        $or: [
          { destinationHubId: hub.id, status: "in_transit" },
          { originHubId: hub.id, status: "at_origin_hub" },
          { destinationHubId: hub.id, status: "at_destination_hub" },
        ],
      } as never)
      .project({
        trackingNumber: 1,
        status: 1,
        delayedReason: 1,
        promisedDeliveryAt: 1,
        "recipient.city": 1,
        totalPackages: 1,
      })
      .sort({ promisedDeliveryAt: 1 })
      .limit(12)
      .toArray(),
    listHubOperations({ hubId: hub.id, limit: 25 }),
    db.collection("shipments").countDocuments({
      $or: [{ originHubId: hub.id }, { destinationHubId: hub.id }],
      delayedReason: { $ne: null },
      status: { $nin: ["delivered", "returned", "cancelled"] },
    } as never),
  ]);

  const counts = new Map(statusAgg.map((row) => [String(row._id), Number(row.count ?? 0)]));
  const waiting = toDomainList<Partial<Shipment>>(waitingDocs as never[]);
  const totalActive = [...counts.values()].reduce((sum, value) => sum + value, 0);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <Link
        href="/hubs"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Back to hubs
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="heading text-2xl font-semibold tracking-tight">{hub.name}</h1>
            <span className="rounded border border-border bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {hub.code}
            </span>
            <StatusBadge
              label={humanise(hub.status)}
              tone={hub.status === "active" ? "success" : hub.status === "at_capacity" ? "warning" : "neutral"}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {hub.address} · {hub.region} · {hub.operatingHours}
          </p>
        </div>
        {canManage ? <RecordOperationButton hubId={hub.id} hubName={hub.name} /> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Active through hub" value={totalActive} />
        <Stat label="At origin hub" value={counts.get("at_origin_hub") ?? 0} />
        <Stat label="In transit" value={counts.get("in_transit") ?? 0} />
        <Stat label="At destination" value={counts.get("at_destination_hub") ?? 0} />
        <Stat
          label="Delayed"
          value={delayedCount}
          tone="danger"
        />
        <Stat label="Daily capacity" value={hub.dailyCapacity ?? null} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          title="Working list"
          description="Shipments this hub owes action on, soonest promise first"
        >
          {waiting.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing waiting on this hub right now.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {waiting.map((shipment) => (
                <li key={shipment.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link
                      href={`/shipments/${shipment.id ?? ""}`}
                      className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      {shipment.trackingNumber}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {humanise(shipment.status ?? "")} · {shipment.recipient?.city ?? ""} ·{" "}
                      {shipment.totalPackages ?? 0} pkg
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {shipment.delayedReason ? (
                      <StatusBadge label="Delayed" tone="danger" />
                    ) : null}
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {shipment.promisedDeliveryAt
                        ? new Date(shipment.promisedDeliveryAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                          })
                        : "—"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Floor activity" description="Operations recorded at this hub, newest first">
          {operations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No operations recorded at {hub.name} yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {operations.map((operation) => (
                <li key={operation.id} className="py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-sm">
                      <span className="font-mono text-xs font-semibold text-primary">
                        {operation.trackingNumber}
                      </span>{" "}
                      <span className="font-medium">{humanise(operation.operation)}</span>
                    </p>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {new Date(operation.createdAt).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {operation.previousStatus ? humanise(operation.previousStatus) : ""}
                    {operation.newStatus ? ` → ${humanise(operation.newStatus)}` : ""} ·{" "}
                    {operation.actorName ?? "system"}
                    {operation.note ? ` · ${operation.note}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | null; tone?: "danger" }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={
          tone === "danger" && (value ?? 0) > 0
            ? "mt-1 text-xl font-semibold tabular-nums text-danger"
            : "mt-1 text-xl font-semibold tabular-nums"
        }
      >
        {value ?? "—"}
      </p>
    </div>
  );
}
