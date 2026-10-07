import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CircleAlert,
  ClipboardList,
  Coins,
  Package,
  ShieldCheck,
  Truck,
  Warehouse,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { TrackingSearch } from "@/components/tracking/tracking-search";
import { ValeLandscape } from "@/components/brand/vale-landscape";

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    "Operations platform for logistics teams: order intake, shipment lifecycle, dispatch planning, hub processing, delivery attempts, proof of delivery, exceptions and settlement.",
  robots: { index: true, follow: true },
};

const MODULES = [
  {
    icon: Package,
    title: "Shipment lifecycle",
    body: "Fourteen canonical statuses with validated transitions. Every change writes an immutable tracking event.",
    href: "/shipments",
  },
  {
    icon: Truck,
    title: "Dispatch and trips",
    body: "Build trips, assign drivers and vehicles, enforce capacity, and dispatch with an auditable assignment history.",
    href: "/dispatch",
  },
  {
    icon: Warehouse,
    title: "Hub operations",
    body: "Receive, sort, stage and hand over with a scanner-style workflow that records a hub event per action.",
    href: "/hubs",
  },
  {
    icon: CircleAlert,
    title: "Exceptions",
    body: "Delayed, damaged, failed and payment problems stay visible until an owner resolves them with a recorded reason.",
    href: "/exceptions",
  },
  {
    icon: Coins,
    title: "Finance and COD",
    body: "Server-derived invoices, payment recording and a COD workflow where collection and reconciliation are separate steps.",
    href: "/finance",
  },
  {
    icon: ShieldCheck,
    title: "Server-enforced RBAC",
    body: "Eight roles, thirty-two permissions. A hidden button is never the security boundary — every mutation checks server-side.",
    href: "/settings/roles",
  },
];

export default async function HomePage(): Promise<React.JSX.Element> {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-primary-foreground/10 bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-md bg-brand text-brand-foreground">
              <Package className="size-4.5" aria-hidden />
            </span>
            <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
          </div>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/tracking"
              className="text-sm text-primary-foreground/70 hover:text-primary-foreground"
            >
              Track a shipment
            </Link>
            <Link
              href="/signin"
              className="inline-flex h-9 items-center rounded-md border border-primary-foreground/20 px-3 text-sm font-medium hover:bg-primary-foreground/10"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center rounded-md bg-brand px-3 text-sm font-medium text-brand-foreground"
            >
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-primary text-primary-foreground">
          <ValeLandscape className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/85 via-primary/55 to-primary/25" aria-hidden />
          <div className="relative z-10 mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-center px-5 py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">
              From the city to the countryside — one supply chain
            </p>
            <h1 className="heading mt-5 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
              Move with clarity.<br />Deliver with control.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-primary-foreground/80">
              {APP_NAME} models the real work of a logistics company — customer intake, shipment
              creation, warehouse processing, dispatch planning, pickup, in-transit tracking,
              delivery attempts, proof of delivery, exceptions and settlement — as one auditable
              operational system. Urban hubs and rural routes, on one road.
            </p>

            <div className="mt-9 max-w-xl">
              <TrackingSearch />
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3 text-xs text-primary-foreground/70">
              <span className="rounded-full border border-primary-foreground/20 px-3 py-1.5">
                Seeded operations accounts ready to explore
              </span>
              <span className="rounded-full border border-primary-foreground/20 px-3 py-1.5">
                160 shipments · 30 trips · 80 customers in demo data
              </span>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card">
          <div className="mx-auto max-w-6xl px-5 py-12">
            <h2 className="heading text-xl font-semibold">What is actually built</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Not a dashboard template. Each module below is backed by state transitions,
              permission checks and audit records — not by buttons that only change a badge.
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {MODULES.map((module) => {
                const Icon = module.icon;
                return (
                  <article key={module.title} className="rounded-lg border border-border bg-background p-5">
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <h3 className="text-sm font-semibold">{module.title}</h3>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{module.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-12">
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-2">
              <Boxes className="size-5 text-brand" aria-hidden />
              <h3 className="text-sm font-semibold">Problems first</h3>
              <p className="text-sm text-muted-foreground">
                The dashboard opens with delayed shipments, failed deliveries, unassigned work and
                payment discrepancies — before anything merely interesting.
              </p>
            </div>
            <div className="space-y-2">
              <ClipboardList className="size-5 text-brand" aria-hidden />
              <h3 className="text-sm font-semibold">Everything is auditable</h3>
              <p className="text-sm text-muted-foreground">
                Status changes, assignments, dispatches, POD, exception resolution and money
                movements record who, what, which record, before, after and when.
              </p>
            </div>
            <div className="space-y-2">
              <Warehouse className="size-5 text-brand" aria-hidden />
              <h3 className="text-sm font-semibold">Honest integrations</h3>
              <p className="text-sm text-muted-foreground">
                No mapping, email, SMS or payment provider is faked. Unconfigured integrations
                show a clear configuration state instead of pretending to work.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/signin"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
            >
              Open the operations console <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/register"
              className="inline-flex h-11 items-center rounded-md border border-border px-5 text-sm font-medium"
            >
              Create a customer account
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-6">
        <p className="mx-auto max-w-6xl text-xs text-muted-foreground">
          {APP_NAME} — demonstration build seeded with clearly labelled demo data. Not connected to
          live customer, mapping or payment systems.
        </p>
      </footer>
    </div>
  );
}
