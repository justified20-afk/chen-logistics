import type { Metadata } from "next";
import Link from "next/link";
import { Package } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { TrackingSearch } from "@/components/tracking/tracking-search";
import { ValeLandscape } from "@/components/brand/vale-landscape";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Track a shipment — ${APP_NAME}`,
  description:
    "Enter a Vale Logistics tracking number to see the current status, full history and delivery promise for a shipment.",
  robots: { index: true, follow: true },
};

export default function TrackingPage(): React.JSX.Element {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-md bg-brand text-brand-foreground">
              <Package className="size-4.5" aria-hidden />
            </span>
            <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/signin" className="text-sm text-primary-foreground/70 hover:text-primary-foreground">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">
          Shipment tracking
        </p>
        <h1 className="heading mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Where is my shipment?
        </h1>
        <div className="mt-6 overflow-hidden rounded-xl">
          <ValeLandscape className="h-28 w-full sm:h-36" />
        </div>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Enter the tracking number from your booking confirmation — for example{" "}
          <span className="font-mono text-foreground">AV-10482</span>. You will see the current
          status, every recorded scan and the promised delivery window. No account is required.
        </p>

        <div className="mt-8">
          <TrackingSearch autoFocus />
        </div>

        <div className="mt-10 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">About these records</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Every status shown comes from an immutable tracking event written by the operations
            team or a driver at the moment it happened. {APP_TAGLINE}
          </p>
        </div>
      </main>

      <footer className="border-t border-border px-5 py-6">
        <p className="mx-auto max-w-3xl text-xs text-muted-foreground">
          {APP_NAME} — demonstration build seeded with clearly labelled demo data.
        </p>
      </footer>
    </div>
  );
}
