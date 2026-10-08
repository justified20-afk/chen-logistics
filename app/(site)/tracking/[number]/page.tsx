import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { APP_NAME, TRACKING_NUMBER_EXAMPLE } from "@/lib/brand";
import { getShipmentByTracking, listTrackingEvents } from "@/lib/shipments";
import { TrackingSearch } from "@/components/tracking/tracking-search";
import { ShipmentTimeline } from "@/components/shipments/shipment-timeline";
import { ShipmentStatusBadge, humanise } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

interface PageParams {
  params: Promise<{ number: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { number } = await params;
  return {
    title: `Track ${number.toUpperCase()} — ${APP_NAME}`,
    robots: { index: false, follow: false },
  };
}

function formatDate(value?: string): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatStamp(value: string): string {
  const date = new Date(value);
  return `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export default async function TrackingDetailPage({ params }: PageParams): Promise<React.JSX.Element> {
  const { number } = await params;
  const shipment = await getShipmentByTracking(decodeURIComponent(number));

  if (!shipment) {
    return (
      <main className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="py-16">
          <div className="mx-auto max-w-md text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <SearchX className="size-6" aria-hidden />
            </span>
            <h1 className="heading mt-4 text-2xl font-semibold tracking-tight">
              No shipment found
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Nothing matches the tracking number{" "}
              <span className="font-mono font-semibold text-foreground">
                {decodeURIComponent(number).toUpperCase()}
              </span>
              . Check the number on your confirmation and try again.
            </p>
            <div className="mt-6">
              <TrackingSearch />
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Looking for your booked shipments instead?{" "}
              <Link href="/signin" className="font-medium text-primary underline-offset-4 hover:underline">
                Sign in to the customer portal
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
    );
  }

  const events = await listTrackingEvents(shipment.id);
  const latest = events.length > 0 ? events[events.length - 1] : null;

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6">
      <div className="border-b border-border py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
              Tracking number
            </p>
            <h1 className="heading mt-1 font-mono text-2xl font-semibold tracking-tight sm:text-3xl">
              {shipment.trackingNumber}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {shipment.sender.city} → {shipment.recipient.city}, {shipment.recipient.state}
            </p>
          </div>
          <ShipmentStatusBadge status={shipment.status} />
        </div>

        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          <Fact label="Promised delivery" value={formatDate(shipment.promisedDeliveryAt)} />
          <Fact label="Service level" value={humanise(shipment.serviceLevel)} />
          <Fact
            label="Last update"
            value={latest ? formatStamp(latest.createdAt) : "Awaiting first scan"}
          />
        </dl>

        {shipment.delayedReason ? (
          <p className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            This shipment is running late: {shipment.delayedReason}. The operations team has been
            notified.
          </p>
        ) : null}
      </div>

      <section className="py-8">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Shipment history</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Every scan recorded by our hubs and drivers, oldest first below.
          </p>
          <div className="mt-5">
            <ShipmentTimeline events={events} />
          </div>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Need help?{" "}
          <Link href="/signin" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>{" "}
          and contact support with this tracking number. Example format:{" "}
          <span className="font-mono">{TRACKING_NUMBER_EXAMPLE}</span>.
        </p>
      </section>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
