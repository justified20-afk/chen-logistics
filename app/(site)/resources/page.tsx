import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import { RESOURCES_MENU } from "@/lib/site-nav";

export const metadata: Metadata = {
  title: `Resources — ${APP_NAME}`,
  description:
    "Chen Logistics resources: shipping price calculator, prohibited items, FAQ, blog, privacy policy, terms, partnership, developer docs and the IMS policy statement.",
};

export default function ResourcesPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="border-b border-border py-12 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">
          Resources
        </p>
        <h1 className="heading mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Resources
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Tools, policies and answers — everything you need to plan,
          price and ship with confidence.
        </p>
      </div>

      <section className="grid gap-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
        {RESOURCES_MENU.map((resource) => {
          const Icon = resource.icon;
          return (
            <Link
              key={resource.href}
              href={resource.href}
              className="group flex flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-brand/50"
            >
              <div className="flex items-center justify-between">
                {Icon ? (
                  <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-4.5" aria-hidden />
                  </span>
                ) : (
                  <span />
                )}
                <ArrowRight
                  className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
                  aria-hidden
                />
              </div>
              <h2 className="mt-3 text-sm font-semibold text-foreground">
                {resource.label}
              </h2>
              {resource.description ? (
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {resource.description}
                </p>
              ) : null}
            </Link>
          );
        })}
      </section>

      <section className="mb-12 rounded-xl bg-primary px-6 py-10 text-primary-foreground sm:px-10">
        <h2 className="heading text-2xl font-semibold tracking-tight">
          Still have questions?
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-primary-foreground/85">
          Our customer care team answers within one business day —
          faster for corporate accounts.
        </p>
        <div className="mt-6">
          <Link
            href="/quote"
            className="inline-flex h-11 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
          >
            Contact us via the quote desk
          </Link>
        </div>
      </section>
    </main>
  );
}
