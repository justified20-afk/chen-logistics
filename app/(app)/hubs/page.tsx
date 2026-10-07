import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { listHubOperations, listHubWorkload } from "@/lib/hubs";
import { PageHeader } from "@/components/layout/page-header";
import { Card, StatusBadge, humanise } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hubs",
  robots: { index: false, follow: false },
};

export default async function HubsPage(): Promise<React.JSX.Element> {
  const user = await requirePermission("hubs.view");
  const canManage = user.permissions.includes("hubs.manage");

  const [workload, operations] = await Promise.all([
    listHubWorkload(),
    listHubOperations({ limit: 12 }),
  ]);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Hubs"
        description="Every node in the network with the load it is carrying right now, and the floor activity recorded most recently."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workload.map(({ hub, active, awaitingPickup, inTransit, outForDelivery, delayed }) => (
          <article key={hub.id} className="flex flex-col rounded-lg border border-border bg-card">
            <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold">{hub.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {hub.code} · {hub.region}
                </p>
              </div>
              <StatusBadge
                label={humanise(hub.status)}
                tone={hub.status === "active" ? "success" : hub.status === "at_capacity" ? "warning" : "neutral"}
              />
            </header>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 p-4 text-sm">
              <Metric label="Active through hub" value={active} />
              <Metric label="Awaiting collection" value={awaitingPickup} />
              <Metric label="Moving onward" value={inTransit} />
              <Metric label="Out for delivery" value={outForDelivery} />
              <Metric label="Delayed" value={delayed} tone={delayed > 0 ? "danger" : undefined} />
              <Metric label="Daily capacity" value={hub.dailyCapacity ?? null} />
            </dl>
            <footer className="mt-auto flex items-center justify-between gap-3 border-t border-border px-4 py-3">
              <div className="min-w-0 text-xs text-muted-foreground">
                <p className="truncate">{hub.operatingHours}</p>
                {hub.managerName ? <p className="truncate">Manager · {hub.managerName}</p> : null}
              </div>
              <Link
                href={`/hubs/${hub.id}`}
                className="shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Open hub
              </Link>
            </footer>
          </article>
        ))}
      </div>

      <Card
        title="Recent floor activity"
        description="Receive, sort, stage, hand-over, damage and hold scans across the network"
        actions={
          <Link
            href={canManage ? `/hubs/${workload[0]?.hub.id ?? ""}` : "/shipments"}
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            {canManage ? "Record an operation" : "Open shipments"}
          </Link>
        }
      >
        {operations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hub operations recorded yet. Receiving a shipment at a hub starts the trail.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {operations.map((operation) => (
              <li key={operation.id} className="flex items-baseline justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {operation.trackingNumber}
                    </span>{" "}
                    <span className="font-medium">{humanise(operation.operation)}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {operation.note ?? "—"} · by {operation.actorName ?? "system"}
                  </p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {new Date(operation.createdAt).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number | null; tone?: "danger" }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={
          tone === "danger" && (value ?? 0) > 0
            ? "mt-0.5 font-semibold tabular-nums text-danger"
            : "mt-0.5 font-semibold tabular-nums"
        }
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}
