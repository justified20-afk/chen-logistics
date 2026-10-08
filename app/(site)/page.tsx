import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Globe,
  HeartHandshake,
  MapPin,
  MoveRight,
  Package,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { SERVICES, COUNTRIES } from "@/lib/site-content";
import { TrackingSearch } from "@/components/tracking/tracking-search";
import { ChenLandscape } from "@/components/brand/chen-landscape";

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    "Chen Logistics combines technology, reliable transportation, and customer-focused logistics solutions to make domestic and international shipping simpler.",
  robots: { index: true, follow: true },
};

export default async function HomePage(): Promise<React.JSX.Element> {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <ChenLandscape className="absolute inset-0 h-full w-full" />
        <div
          className="absolute inset-0 bg-gradient-to-b from-primary/85 via-primary/60 to-primary/30"
          aria-hidden
        />
        <div className="relative z-10 mx-auto flex min-h-[82vh] max-w-6xl flex-col justify-center px-4 py-20 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">
            Chen Logistics Technologies Limited · Lagos, Nigeria
          </p>
          <h1 className="heading mt-5 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Delivering fast, reliable shipping and logistics solutions you
            can count on.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-primary-foreground/85">
            Chen Logistics combines technology, reliable transportation, and
            customer-focused logistics solutions to make domestic and
            international shipping simpler — across all 36 states in Nigeria
            and to 230+ locations worldwide.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/quote"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-brand-foreground shadow-sm transition-colors hover:bg-brand/90"
            >
              Get a Quote <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/tracking"
              className="inline-flex h-11 items-center rounded-lg border border-primary-foreground/25 px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-foreground/10"
            >
              Track a shipment
            </Link>
          </div>

          <div className="mt-9 max-w-xl">
            <TrackingSearch />
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3 text-xs text-primary-foreground/75">
            <span className="rounded-full border border-primary-foreground/20 px-3 py-1.5">
              All 36 states in Nigeria
            </span>
            <span className="rounded-full border border-primary-foreground/20 px-3 py-1.5">
              230+ locations worldwide
            </span>
            <span className="rounded-full border border-primary-foreground/20 px-3 py-1.5">
              ChenFaster: 24–48 hours
            </span>
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">
                Products
              </p>
              <h2 className="heading mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Shipping and logistics for every load
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                From a single parcel to a full truckload, every product runs on
                the same tracked network — quote, book, move, track, deliver.
              </p>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4"
            >
              View all products <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.slice(0, 6).map((service) => (
              <Link
                key={service.slug}
                href={`/products/${service.slug}`}
                className="group flex flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-brand/50 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    {service.title}
                  </h3>
                  <ArrowRight
                    className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
                    aria-hidden
                  />
                </div>
                <p className="mt-1 text-xs font-medium text-brand">
                  {service.tagline}
                </p>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* International corridors */}
      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">
            Locations
          </p>
          <h2 className="heading mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Shipping to Nigeria, from everywhere that matters
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Dedicated corridors from five countries, with export documentation,
            customs clearance and doorstep delivery handled end to end.
          </p>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {COUNTRIES.map((country) => (
              <Link
                key={country.slug}
                href={country.href}
                className="group flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-brand/50"
              >
                <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
                  <Globe className="size-4.5" aria-hidden />
                </span>
                <span className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  {country.name}
                  <MoveRight
                    className="size-3.5 text-brand transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
                <span className="mt-1 text-xs leading-snug text-muted-foreground">
                  {country.transit}
                </span>
              </Link>
            ))}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Also delivering to 230+ additional locations worldwide — ask for a
            quote for any other destination.
          </p>
        </div>
      </section>

      {/* Why Chen Logistics */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">
            Why Chen Logistics
          </p>
          <h2 className="heading mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Technology, transportation, and people — in that order
          </h2>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: "Technology you can see",
                body: "Every scan, handover and delivery attempt is recorded and visible — in the tracking view, the Chen App, or your corporate dashboard.",
              },
              {
                icon: Truck,
                title: "Transportation you can trust",
                body: "Our own standards for drivers, vehicles and hub handling keep parcels moving across all 36 states and 230+ worldwide locations.",
              },
              {
                icon: HeartHandshake,
                title: "Service that answers",
                body: "A promised delivery window on every shipment, and a support team that treats your parcel like it is the only one in transit.",
              },
            ].map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="rounded-lg border border-border bg-card p-5"
                >
                  <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-4.5" aria-hidden />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {pillar.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            { icon: MapPin, value: "36", label: "States covered in Nigeria" },
            { icon: Globe, value: "230+", label: "Locations worldwide" },
            { icon: Package, value: "24–48h", label: "ChenFaster express window" },
            { icon: ShieldCheck, value: "100%", label: "Of shipments scanned & tracked" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center gap-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-xl font-bold tracking-tight text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-xs leading-snug text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <ChenLandscape className="absolute inset-0 h-full w-full opacity-60" />
        <div
          className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/80 to-primary/70"
          aria-hidden
        />
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Ready to ship with {APP_NAME}?
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-primary-foreground/85">
              {APP_TAGLINE} Get an instant quote, book a pickup, or track an
              existing shipment — it all takes less than a minute.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/quote"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
            >
              Get a Quote <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/register"
              className="inline-flex h-11 items-center rounded-lg border border-primary-foreground/25 px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-foreground/10"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
