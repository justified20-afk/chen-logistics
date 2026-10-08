import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowDownUp,
  CheckCircle2,
  Container,
  FileCheck2,
  Plane,
  Ship,
} from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import { serviceBySlug, SERVICES } from "@/lib/site-content";

interface PageParams {
  params: Promise<{ service: string }>;
}

export function generateStaticParams() {
  return SERVICES.map((service) => ({ service: service.slug }));
}

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const { service } = await params;
  const content = serviceBySlug(service);
  if (!content) return { title: `Products — ${APP_NAME}` };
  return {
    title: `${content.title} — ${APP_NAME}`,
    description: `${content.tagline}. ${content.description}`,
  };
}

const EXPORT_STEPS = [
  {
    icon: FileCheck2,
    title: "Documentation",
    body: "We prepare the export paperwork — commercial invoice, packing list and airway bill — so your goods leave without delay.",
  },
  {
    icon: Plane,
    title: "Freight",
    body: "Air for urgent parcels, sea for volume. Your dedicated corridor desk picks the right mode and carrier for the timeline.",
  },
  {
    icon: Container,
    title: "Handover",
    body: "Your shipment is handed to our Nigerian partner network at the destination port or airport, with one tracking number throughout.",
  },
];

const IMPORT_STEPS = [
  {
    icon: Ship,
    title: "Arrival",
    body: "We monitor your freight from the origin port and pre-alert our clearance team before it lands in Nigeria.",
  },
  {
    icon: ArrowDownUp,
    title: "Clearance",
    body: "Customs clearance is handled in-house — duties assessed, documents verified, and releases tracked to completion.",
  },
  {
    icon: ArrowRight,
    title: "Delivery",
    body: "Cleared goods move straight onto the domestic network for doorstep delivery, with the same tracking you watched from the origin.",
  },
];

export default async function ServicePage({
  params,
}: PageParams): Promise<React.JSX.Element> {
  const { service } = await params;
  const content = serviceBySlug(service);
  if (!content) notFound();

  const isInternational = service === "international-shipping";

  return (
    <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
      <div className="border-b border-border py-12 sm:py-16">
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          All products
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-brand">
          {isInternational
            ? "Shipping & Logistics"
            : content.slug === "corporate"
              ? "Shipping & Logistics"
              : "Domestic Shipping"}
        </p>
        <h1 className="heading mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {content.title}
        </h1>
        <p className="mt-3 text-lg font-medium text-brand">
          {content.tagline}
        </p>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {content.description}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/quote"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get a Quote <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href="/register"
            className="inline-flex h-11 items-center rounded-lg border border-input px-5 text-sm font-medium transition-colors hover:bg-accent"
          >
            Sign Up
          </Link>
        </div>
      </div>

      <section className="border-b border-border py-12">
        <h2 className="heading text-2xl font-semibold tracking-tight text-foreground">
          What you get
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {content.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
            >
              <CheckCircle2
                className="mt-0.5 size-4.5 shrink-0 text-success"
                aria-hidden
              />
              <span className="text-sm leading-relaxed text-foreground">
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {isInternational ? (
        <>
          <section
            id="export"
            className="scroll-mt-20 border-b border-border py-12"
          >
            <h2 className="heading text-2xl font-semibold tracking-tight text-foreground">
              Export
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Send parcels and freight from Canada, China, Ghana, the UK or the
              US to Nigeria on one tracked journey.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {EXPORT_STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="rounded-lg border border-border bg-card p-5"
                  >
                    <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
                      <Icon className="size-4.5" aria-hidden />
                    </span>
                    <h3 className="mt-3 text-sm font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section
            id="import"
            className="scroll-mt-20 border-b border-border py-12"
          >
            <h2 className="heading text-2xl font-semibold tracking-tight text-foreground">
              Import
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Goods arriving in Nigeria are cleared and delivered on the same
              network that shipped them — no lost handovers, no surprise dues.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {IMPORT_STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="rounded-lg border border-border bg-card p-5"
                  >
                    <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
                      <Icon className="size-4.5" aria-hidden />
                    </span>
                    <h3 className="mt-3 text-sm font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      ) : null}

      <section className="py-12">
        <h2 className="heading text-2xl font-semibold tracking-tight text-foreground">
          Ready to ship?
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Quotes are instant for domestic shipments. International quotes are
          confirmed within one business day of the details below.
        </p>
        <div className="mt-6">
          <Link
            href="/quote"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
          >
            Get a Quote <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>
    </main>
  );
}
