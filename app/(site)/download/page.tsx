import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Camera,
  ClipboardList,
  Download,
  Package,
  QrCode,
  Smartphone,
  Truck,
} from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import { CtaBand } from "@/components/site/content-page";

export const metadata: Metadata = {
  title: `Download the ${APP_NAME} App — ${APP_NAME}`,
  description:
    "Download the Chen Logistics App: book pickups, manage shipments and track deliveries directly from the app.",
};

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Book pickups",
    body: "Quote, book and schedule a pickup in under a minute — no call centre, no paperwork.",
  },
  {
    icon: Package,
    title: "Manage shipments",
    body: "Every waybill, receipt and delivery attempt in one history, filterable by date or status.",
  },
  {
    icon: Truck,
    title: "Track deliveries",
    body: "Live tracking with scan events at each hub, plus push and SMS alerts at every milestone.",
  },
  {
    icon: Camera,
    title: "Proof of delivery",
    body: "Photo and signature capture at the doorstep, attached to the shipment record instantly.",
  },
  {
    icon: Bell,
    title: "Smart notifications",
    body: "Out for delivery, delivered, exceptions — you hear about it the moment it happens.",
  },
  {
    icon: QrCode,
    title: "Scan and hand over",
    body: "Scan a waybill QR at any collection point to hand a parcel into the network.",
  },
];

export default function DownloadPage() {
  return (
    <div>
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="border-b border-border py-12 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">
            The Chen App
          </p>
          <h1 className="heading mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Download the Chen Logistics App
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Book pickups, manage shipments, and track deliveries
            directly from the app — the full Chen Logistics
            workflow in your pocket.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href="#download"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Download className="size-4.5" aria-hidden />
              Get the app
            </a>
            <Link
              href="/register"
              className="inline-flex h-12 items-center rounded-lg border border-input px-5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Sign up first
            </Link>
          </div>
        </div>

        {/* Phone mockup band */}
        <section className="relative overflow-hidden bg-primary text-primary-foreground">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <h2 className="heading text-3xl font-semibold tracking-tight">
                Everything Chen Logistics, one tap away
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-primary-foreground/85">
                Whether you ship weekly or monthly, the app keeps
                the whole journey on one screen — from the moment
                you book a pickup to the doorstep signature.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Instant quotes for all 36 states",
                  "ChenFaster express within 24–48 hours",
                  "Works offline in the field, syncs when connected",
                ].map((point) => (
                  <li key={point} className="flex items-center gap-2.5 text-sm">
                    <span className="grid size-5 place-items-center rounded-full bg-brand text-brand-foreground">
                      <ArrowRight className="size-3" aria-hidden />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Stylised phone — decorative */}
            <div className="relative mx-auto w-60" aria-hidden>
              <div className="rounded-[2rem] border-4 border-primary-foreground/20 bg-primary-foreground/10 px-6 py-10 shadow-2xl">
                <div className="space-y-3">
                  <div className="rounded-lg bg-brand/90 px-3 py-2 text-center text-xs font-semibold text-brand-foreground">
                    CHEN APP
                  </div>
                  <div className="rounded-lg bg-primary-foreground/10 px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-primary-foreground/60">
                      Tracking
                    </p>
                    <p className="font-mono text-sm font-semibold">
                      CH-10482
                    </p>
                  </div>
                  <div className="rounded-lg bg-primary-foreground/10 px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-primary-foreground/60">
                      Status
                    </p>
                    <p className="text-sm font-semibold">
                      Out for delivery
                    </p>
                  </div>
                  <div className="rounded-lg bg-primary-foreground/10 px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-primary-foreground/60">
                      Promise
                    </p>
                    <p className="text-sm font-semibold">Today, by 6 PM</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="heading text-2xl font-semibold tracking-tight text-foreground">
            What the app does
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-lg border border-border bg-card p-5"
                >
                  <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-4.5" aria-hidden />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {feature.body}
                  </p>
                </div>
              );
            })}
          </div>

          <div
            id="download"
            className="mt-12 scroll-mt-24 rounded-xl border border-border bg-card p-8 text-center"
          >
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
              <Smartphone className="size-6" aria-hidden />
            </span>
            <h3 className="heading mt-4 text-xl font-semibold tracking-tight text-foreground">
              Rolling out to customers in phases
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              The Chen App is available to registered customers in
              Nigeria. Create a free account and we will send your
              download link for iOS and Android.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
              >
                Sign Up to get the app
              </Link>
              <Link
                href="/quote"
                className="inline-flex h-11 items-center rounded-lg border border-input px-5 text-sm font-medium transition-colors hover:bg-accent"
              >
                Get a Quote
              </Link>
            </div>
          </div>
        </section>
      </main>
      <CtaBand
        title="Prefer to ship from a desk?"
        body="The full portal works in any browser — no download needed."
        primaryHref="/register"
        primaryLabel="Open the portal"
      />
    </div>
  );
}
