import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Globe, MapPin, MoveRight } from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import { COUNTRIES } from "@/lib/site-content";
import { POPULAR_ROUTES } from "@/lib/site-nav";

export const metadata: Metadata = {
  title: `Locations — ${APP_NAME}`,
  description:
    "Chen Logistics locations and shipping routes: ship to Nigeria from Canada, China, Ghana, the United Kingdom and the United States, plus 230+ locations worldwide.",
};

export default function LocationsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="border-b border-border py-12 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">
          Locations
        </p>
        <h1 className="heading mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Locations & shipping routes
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Pick a country to ship from, or browse the popular routes into
          Nigeria. Every corridor is tracked from origin pickup to Nigerian
          doorstep.
        </p>
      </div>

      {/* Quick links — countries */}
      <section className="border-b border-border py-12">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
            <MapPin className="size-4.5" aria-hidden />
          </span>
          <div>
            <h2 className="heading text-2xl font-semibold tracking-tight text-foreground">
              Ship from
            </h2>
            <p className="text-sm text-muted-foreground">
              Quick links to our dedicated shipping corridors.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {COUNTRIES.map((country) => (
            <Link
              key={country.slug}
              href={country.href}
              className="group flex flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-brand/50"
            >
              <span className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
                <Globe className="size-5" aria-hidden />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                {country.name}
              </h3>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">
                Shipping from {country.name} to Nigeria
              </p>
              <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                {country.transit}
                <ArrowRight
                  className="size-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </p>
            </Link>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Need a different origin? We ship to 230+ locations worldwide —
          <Link
            href="/quote"
            className="font-medium text-primary hover:underline underline-offset-4"
          >
            ask for a quote
          </Link>
          .
        </p>
      </section>

      {/* Popular routes */}
      <section id="routes" className="scroll-mt-20 py-12">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
            <MoveRight className="size-4.5" aria-hidden />
          </span>
          <div>
            <h2 className="heading text-2xl font-semibold tracking-tight text-foreground">
              Popular routes
            </h2>
            <p className="text-sm text-muted-foreground">
              The corridors our customers book most.
            </p>
          </div>
        </div>

        <ul className="mt-8 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {POPULAR_ROUTES.map((route) => (
            <li key={`${route.from}-${route.to}`}>
              <Link
                href={route.href}
                className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-accent/50"
              >
                <span className="flex items-center gap-3 text-sm font-semibold text-foreground">
                  {route.from}
                  <MoveRight
                    className="size-4 text-brand"
                    aria-hidden
                  />
                  {route.to}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
                  View route
                  <ArrowRight
                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Domestic note */}
      <section className="mb-12 rounded-xl bg-primary px-6 py-10 text-primary-foreground sm:px-10">
        <h2 className="heading text-2xl font-semibold tracking-tight">
          Inside Nigeria
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-primary-foreground/85">
          Domestic shipping is our home turf — reliable and swift delivery
          across all 36 states, with ChenFaster express within 24–48 hours.
        </p>
        <div className="mt-6">
          <Link
            href="/products/domestic-shipping"
            className="inline-flex h-11 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
          >
            Explore domestic shipping
          </Link>
        </div>
      </section>
    </main>
  );
}
