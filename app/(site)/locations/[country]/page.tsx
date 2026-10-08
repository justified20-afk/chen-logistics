import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  ClipboardList,
  FileCheck2,
  PackageCheck,
} from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import { COUNTRIES, countryBySlug } from "@/lib/site-content";

interface PageParams {
  params: Promise<{ country: string }>;
}

export function generateStaticParams() {
  return COUNTRIES.map((country) => ({ country: country.slug }));
}

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const { country } = await params;
  const content = countryBySlug(country);
  if (!content) return { title: `Locations — ${APP_NAME}` };
  return {
    title: `${content.headline} — ${APP_NAME}`,
    description: `${content.description} Transit: ${content.transit}.`,
  };
}

const STEP_ICONS = [ClipboardList, CalendarClock, FileCheck2, PackageCheck];

export default async function CountryPage({
  params,
}: PageParams): Promise<React.JSX.Element> {
  const { country } = await params;
  const content = countryBySlug(country);
  if (!content) notFound();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
      <div className="border-b border-border py-12 sm:py-16">
        <Link
          href="/locations"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          All locations
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-brand">
          Location
        </p>
        <h1 className="heading mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {content.headline}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {content.description}
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
          <CalendarClock className="size-4 text-brand" aria-hidden />
          <span className="text-sm font-medium text-foreground">
            Typical transit: {content.transit}
          </span>
        </div>
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
          How it works
        </h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-2">
          {content.steps.map((step, index) => {
            const Icon = STEP_ICONS[index] ?? ClipboardList;
            return (
              <li
                key={step.title}
                className="flex gap-4 rounded-lg border border-border bg-card p-5"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-4.5" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="py-12">
        <h2 className="heading text-2xl font-semibold tracking-tight text-foreground">
          Other corridors
        </h2>
        <div className="mt-6 flex flex-wrap gap-2.5">
          {COUNTRIES.filter((c) => c.slug !== content.slug).map((other) => (
            <Link
              key={other.slug}
              href={other.href}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input px-3.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Ship from {other.name}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
