import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, Globe, Truck } from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import { SERVICES } from "@/lib/site-content";

export const metadata: Metadata = {
  title: `Products — ${APP_NAME}`,
  description:
    "Chen Logistics products: domestic shipping across all 36 states, international shipping to 230+ locations, corporate solutions, the Chen App, ChenFaster, e-commerce, last-mile, heavy goods, mailroom and warehousing.",
};

const CATEGORY_ICONS = [Truck, Building2, Globe];

export default function ProductsPage() {
  const coreServices = SERVICES.filter(
    (service) =>
      service.slug === "domestic-shipping" ||
      service.slug === "international-shipping" ||
      service.slug === "corporate",
  );
  const domesticServices = SERVICES.filter(
    (service) =>
      service.slug !== "domestic-shipping" &&
      service.slug !== "international-shipping" &&
      service.slug !== "corporate",
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="border-b border-border py-12 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">
          Products
        </p>
        <h1 className="heading mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Products & services
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Everything Chen Logistics moves, organised the way we operate it:
          core shipping & logistics services, and the domestic products that
          deliver within Nigeria.
        </p>
      </div>

      {/* Shipping & Logistics */}
      <section className="border-b border-border py-12">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
            <Truck className="size-4.5" aria-hidden />
          </span>
          <div>
            <h2 className="heading text-2xl font-semibold tracking-tight text-foreground">
              Shipping & Logistics
            </h2>
            <p className="text-sm text-muted-foreground">
              The core services that move freight between businesses and borders.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {coreServices.map((service, index) => {
            const Icon = CATEGORY_ICONS[index] ?? Truck;
            return (
              <Link
                key={service.slug}
                href={`/products/${service.slug}`}
                className="group flex flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-brand/50 hover:shadow-sm"
              >
                <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-4.5" aria-hidden />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-foreground">
                  {service.title}
                </h3>
                <p className="mt-1 text-xs font-medium text-brand">
                  {service.tagline}
                </p>
                <p className="mt-2.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  Learn more
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Domestic Shipping */}
      <section className="py-12">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
            <Globe className="size-4.5" aria-hidden />
          </span>
          <div>
            <h2 className="heading text-2xl font-semibold tracking-tight text-foreground">
              Domestic Shipping
            </h2>
            <p className="text-sm text-muted-foreground">
              Reliable and swift delivery across all 36 states in Nigeria.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {domesticServices.map((service) => (
            <Link
              key={service.slug}
              href={`/products/${service.slug}`}
              className="group flex flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-brand/50"
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
              <p className="mt-2.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                {service.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Corporate CTA */}
      <section className="mb-12 rounded-xl bg-primary px-6 py-10 text-primary-foreground sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="heading text-2xl font-semibold tracking-tight">
              Shipping for your business
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-primary-foreground/85">
              Corporate accounts get volume pricing, a dedicated account manager,
              consolidated billing and integrations. Built for growing and large
              businesses.
            </p>
          </div>
          <Link
            href="/quote"
            className="inline-flex h-11 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
          >
            Talk to sales
          </Link>
        </div>
      </section>
    </main>
  );
}
