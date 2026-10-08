import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ContentSection {
  title: string;
  paragraphs: string[];
  icon?: LucideIcon;
}

/**
 * Shared scaffold for the public marketing pages: eyebrow,
 * title, intro and icon-led prose sections, with a slot for
 * bespoke content (timelines, accordions, forms, tables).
 */
export function ContentPage({
  eyebrow,
  title,
  intro,
  sections,
  children,
  actions,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  sections?: ContentSection[];
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
      <div className="border-b border-border py-12 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">
          {eyebrow}
        </p>
        <h1 className="heading mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {title}
        </h1>
        {intro ? (
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {intro}
          </p>
        ) : null}
        {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
      </div>

      {sections && sections.length > 0 ? (
        <div className="space-y-12 py-10 sm:py-12">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <section key={section.title}>
                <div className="flex items-center gap-3">
                  {Icon ? (
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      <Icon className="size-4.5" aria-hidden />
                    </span>
                  ) : null}
                  <h2 className="heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    {section.title}
                  </h2>
                </div>
                <div className="mt-4 max-w-3xl space-y-3">
                  {section.paragraphs.map((paragraph, index) => (
                    <p
                      key={index}
                      className="text-[15px] leading-relaxed text-muted-foreground"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}

      {children ? <div className="py-10 sm:py-12">{children}</div> : null}
    </main>
  );
}

/** Call-to-action band used at the bottom of marketing pages. */
export function CtaBand({
  title,
  body,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  title: string;
  body?: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <h2 className="heading text-2xl font-semibold tracking-tight">
            {title}
          </h2>
          {body ? (
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-primary-foreground/80">
              {body}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link href={primaryHref}>{primaryLabel}</Link>
          </Button>
          {secondaryHref && secondaryLabel ? (
            <Button
              asChild
              variant="outline"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link href={secondaryHref}>{secondaryLabel}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
