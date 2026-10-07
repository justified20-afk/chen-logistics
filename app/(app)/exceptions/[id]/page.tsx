import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requirePermission } from "@/lib/session";
import { getException } from "@/lib/exceptions";
import { getDb } from "@/lib/mongodb";
import { oid, toDomainList } from "@/lib/db";
import { ExceptionPanel } from "@/components/exceptions/exception-panel";
import {
  Card,
  ExceptionStatusBadge,
  SeverityBadge,
  humanise,
} from "@/components/ui/status-badge";
import type { AuditLog } from "@/types/domain";

export const dynamic = "force-dynamic";

interface ExceptionParams {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ExceptionParams): Promise<Metadata> {
  const { id } = await params;
  const exception = await getException(id);
  return {
    title: exception ? `${exception.reference} — Exceptions` : "Exception",
    robots: { index: false, follow: false },
  };
}

function formatStamp(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ExceptionDetailPage({
  params,
}: ExceptionParams): Promise<React.JSX.Element> {
  const user = await requirePermission("exceptions.view");
  const { id } = await params;
  const exception = await getException(id);
  if (!exception) notFound();

  const canManage = user.permissions.includes("exceptions.manage");
  const db = await getDb();

  const [ownerDocs, auditDocs, hubDoc] = await Promise.all([
    canManage
      ? db
          .collection("users")
          .find({
            role: {
              $in: ["administrator", "operations_manager", "dispatcher", "warehouse", "support"],
            },
          } as never)
          .project({ name: 1, email: 1 })
          .sort({ name: 1 })
          .limit(100)
          .toArray()
      : Promise.resolve([]),
    db
      .collection("auditLogs")
      .find({ entityType: "exception", entityId: exception.id } as never)
      .sort({ createdAt: -1 })
      .limit(12)
      .toArray(),
    exception.hubId && !exception.shipmentTrackingNumber
      ? db.collection("hubs").findOne({ _id: oid(exception.hubId) } as never)
      : null,
  ]);

  const owners = (ownerDocs as { _id: unknown; name?: string; email?: string }[]).map((doc) => ({
    id: String(doc._id),
    name: doc.name ?? doc.email ?? "Unknown",
  }));
  const audit = toDomainList<AuditLog>(auditDocs as never[]);
  const hubName = (hubDoc as { name?: string } | null)?.name;

  const linked = exception.shipmentTrackingNumber
    ? { label: exception.shipmentTrackingNumber, href: `/shipments/${exception.shipmentId}` }
    : exception.tripNumber
      ? { label: exception.tripNumber, href: "/dispatch" }
      : exception.driverName
        ? { label: exception.driverName, href: "/fleet/drivers" }
        : exception.vehicleRegistration
          ? { label: exception.vehicleRegistration, href: "/fleet/vehicles" }
          : hubName
            ? { label: hubName, href: "/hubs" }
            : null;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div>
        <Link
          href="/exceptions"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Back to the queue
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-primary">{exception.reference}</span>
            <SeverityBadge severity={exception.severity} />
            <ExceptionStatusBadge status={exception.status} />
            <span className="rounded border border-border bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {humanise(exception.type)}
            </span>
          </div>
          <h1 className="heading text-2xl font-semibold tracking-tight">{exception.title}</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {exception.description}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card
            title="Resolution"
            description="What was done about it, and who confirmed it"
          >
            {exception.resolution ? (
              <div className="space-y-2">
                <p className="whitespace-pre-wrap text-sm">{exception.resolution}</p>
                <p className="text-xs text-muted-foreground">
                  {exception.resolvedBy ? `Recorded by ${exception.resolvedBy}` : "Owner note"}
                  {exception.resolvedAt ? ` · ${formatStamp(exception.resolvedAt)}` : ""}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No resolution recorded yet. An exception is only closed with a reason someone can
                audit later.
              </p>
            )}
          </Card>

          {canManage ? (
            <Card title="Manage" description="Status, severity and ownership">
              <ExceptionPanel exception={exception} owners={owners} />
            </Card>
          ) : (
            <Card title="Manage" description="Read-only">
              <p className="text-sm text-muted-foreground">
                Your role can view exceptions but not change them. An operator with{" "}
                <span className="font-medium text-foreground">exceptions.manage</span> updates the
                queue.
              </p>
            </Card>
          )}

          <Card title="Audit trail" description="Immutable record of every change to this exception">
            {audit.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recorded changes yet — this exception has not been touched since it was raised.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {audit.map((entry) => (
                  <li key={entry.id} className="py-2.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <p className="text-sm">
                        <span className="font-medium">{humanise(entry.action)}</span>{" "}
                        <span className="text-muted-foreground">
                          by {entry.actorName ?? "system"}
                        </span>
                      </p>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatStamp(entry.createdAt)}
                      </span>
                    </div>
                    {entry.before || entry.after ? (
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                        {entry.before ? `before=${JSON.stringify(entry.before)} ` : ""}
                        {entry.after ? `after=${JSON.stringify(entry.after)}` : ""}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Facts">
            <dl className="space-y-3 text-sm">
              <Fact label="Raised" value={formatStamp(exception.createdAt)} />
              <Fact label="Last update" value={formatStamp(exception.updatedAt)} />
              <Fact label="Resolve by" value={exception.dueAt ? formatStamp(exception.dueAt) : "No deadline"} />
              <Fact label="Owner" value={exception.ownerName ?? "Unowned"} />
              <Fact label="Version" value={String(exception.version)} />
            </dl>
          </Card>

          <Card title="Linked record">
            {linked ? (
              <Link
                href={linked.href}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {linked.label} <ExternalLink className="size-3.5" aria-hidden />
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">
                This exception is not linked to a shipment, trip, driver, vehicle or hub.
              </p>
            )}
            {exception.driverName ? (
              <p className="mt-2 text-xs text-muted-foreground">Driver: {exception.driverName}</p>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
