import type { Metadata } from "next";
import { APP_NAME, APP_TAGLINE, TRACKING_NUMBER_EXAMPLE } from "@/lib/brand";
import { TrackingSearch } from "@/components/tracking/tracking-search";
import { ChenLandscape } from "@/components/brand/chen-landscape";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Track a shipment — ${APP_NAME}`,
  description:
    "Enter a Chen Logistics tracking number to see the current status, full history and delivery promise for a shipment.",
  robots: { index: true, follow: true },
};

export default function TrackingPage(): React.JSX.Element {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6">
      <div className="border-b border-border py-12 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">
          Shipment tracking
        </p>
        <h1 className="heading mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Where is my shipment?
        </h1>
        <div className="mt-6 overflow-hidden rounded-xl">
          <ChenLandscape className="h-28 w-full sm:h-36" />
        </div>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Enter the tracking number from your booking confirmation — for
          example{" "}
          <span className="font-mono text-foreground">
            {TRACKING_NUMBER_EXAMPLE}
          </span>
          . You will see the current status, every recorded scan and the
          promised delivery window. No account is required.
        </p>

        <div className="mt-8">
          <TrackingSearch autoFocus />
        </div>
      </div>

      <section className="py-12">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">About these records</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Every status shown comes from an immutable tracking event written
            by the operations team or a driver at the moment it happened.{" "}
            {APP_TAGLINE}
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Domestic", body: "All 36 states, tracked hub to hub." },
            { label: "International", body: "Five corridors into Nigeria." },
            { label: "No account needed", body: "Track with just the number." },
          ].map((fact) => (
            <div
              key={fact.label}
              className="rounded-lg border border-border bg-card p-4"
            >
              <h3 className="text-sm font-semibold text-foreground">
                {fact.label}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {fact.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
