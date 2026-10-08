import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Ban,
  Briefcase,
  CircleHelp,
  ScrollText,
  ShieldAlert,
} from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import {
  BLOG_POSTS,
  COOKIE_SECTIONS,
  FAQS,
  IMS_SECTIONS,
  PRIVACY_SECTIONS,
  PROHIBITED_CATEGORIES,
  TERMS_SECTIONS,
} from "@/lib/site-content";import { ContentPage, CtaBand } from "@/components/site/content-page";
import { ShippingCalculator } from "@/components/site/shipping-calculator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface PageParams {
  params: Promise<{ resource: string }>;
}

const RESOURCE_SLUGS = [
  "calculator",
  "prohibited-items",
  "faq",
  "blog",
  "privacy-policy",
  "terms-conditions",
  "cookie-policy",
  "partnership",
  "developer",
  "ims-policy",
] as const;

export function generateStaticParams() {
  return RESOURCE_SLUGS.map((resource) => ({ resource }));
}

const TITLES: Record<string, string> = {
  calculator: "Shipping Price Calculator",
  "prohibited-items": "Prohibited Items",
  faq: "FAQ",
  blog: "Blog",
  "privacy-policy": "Privacy Policy",
  "terms-conditions": "Terms & Conditions",
  "cookie-policy": "Cookie Policy",
  partnership: "Partnership",
  developer: "Developer",
  "ims-policy": "IMS Policy Statement",
};

const EYEBROWS: Record<string, string> = {
  calculator: "Resources",
  "prohibited-items": "Resources",
  faq: "Resources",
  blog: "Resources",
  "privacy-policy": "Legal",
  "terms-conditions": "Legal",
  "cookie-policy": "Legal",
  partnership: "Resources",
  developer: "Resources",
  "ims-policy": "Policies",
};

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const { resource } = await params;
  const title = TITLES[resource];
  if (!title) return { title: `Resources — ${APP_NAME}` };
  return {
    title: `${title} — ${APP_NAME}`,
    description: `${title} — Chen Logistics resources and policies.`,
  };
}

export default async function ResourcePage({
  params,
}: PageParams): Promise<React.JSX.Element> {
  const { resource } = await params;
  const title = TITLES[resource];
  if (!title) notFound();

  /* ---------------------------------------------------------- calculator */
  if (resource === "calculator") {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="border-b border-border py-12 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">
            Resources
          </p>
          <h1 className="heading mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Shipping Price Calculator
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Estimate the cost of a domestic shipment in seconds —
            choose a service level, enter the chargeable weight, and
            add cash on delivery if the recipient pays on delivery.
          </p>
        </div>
        <div className="py-10 sm:py-12">
          <ShippingCalculator />
        </div>
        <CtaBand
          title="Need an international quote?"
          body="Corridor pricing depends on freight mode and clearance — our desks confirm within one business day."
          primaryHref="/quote"
          primaryLabel="Get a Quote"
        />
      </main>
    );
  }

  /* ------------------------------------------------------- prohibited items */
  if (resource === "prohibited-items") {
    return (
      <div>
        <ContentPage
          eyebrow={EYEBROWS[resource]}
          title={title}
          intro="What can and cannot travel on the Chen Logistics network. When in doubt, ask before you pack — undeclared prohibited items are seized or returned at the sender's cost."
        />
        <section className="border-t border-border bg-muted/40">
          <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
            {PROHIBITED_CATEGORIES.map((category) => (
              <div
                key={category.category}
                className="overflow-hidden rounded-lg border border-border bg-card"
              >
                <div className="flex items-center gap-3 border-b border-border bg-background px-5 py-4">
                  <span className="grid size-8 place-items-center rounded-md bg-danger/10 text-danger">
                    <ShieldAlert className="size-4" aria-hidden />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      {category.category}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {category.note}
                    </p>
                  </div>
                </div>
                <ul className="grid gap-x-8 gap-y-2.5 px-5 py-5 sm:grid-cols-2">
                  {category.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-sm text-muted-foreground"
                    >
                      <Ban
                        className="mt-1 size-3.5 shrink-0 text-danger/70"
                        aria-hidden
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="text-xs leading-relaxed text-muted-foreground">
              Lists are reviewed against Nigerian customs and
              international carrier rules and may change. Restricted
              items ship only with the documentation noted at booking.
            </p>
          </div>
        </section>
        <CtaBand
          title="Not sure about an item?"
          body="Send us the details before you pack — we will confirm within one business day."
          primaryHref="/quote"
          primaryLabel="Ask about an item"
        />
      </div>
    );
  }

  /* ------------------------------------------------------------------ faq */
  if (resource === "faq") {
    return (
      <div>
        <ContentPage
          eyebrow={EYEBROWS[resource]}
          title={title}
          intro="The questions we hear most, from tracking and transit times to cash on delivery and corporate accounts."
        />
        <section className="border-t border-border bg-muted/40">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((faq) => (
                <AccordionItem key={faq.question} value={faq.question}>
                  <AccordionTrigger className="px-2 text-left text-[15px] font-semibold">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="px-2 pb-4">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {faq.answer}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
        <CtaBand
          title="Still wondering something?"
          body="Customer care answers within one business day."
          primaryHref="/quote"
          primaryLabel="Ask customer care"
          secondaryHref="/tracking"
          secondaryLabel="Track a shipment"
        />
      </div>
    );
  }

  /* ----------------------------------------------------------------- blog */
  if (resource === "blog") {
    return (
      <div>
        <ContentPage
          eyebrow={EYEBROWS[resource]}
          title={title}
          intro="Shipping guides, network news and notes from the road — published by the Chen Logistics team."
        />
        <section className="border-t border-border bg-muted/40">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="grid gap-4 md:grid-cols-2">
              {BLOG_POSTS.map((post) => (
                <article
                  key={post.title}
                  className="flex flex-col rounded-lg border border-border bg-card p-6"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">
                      {post.tag}
                    </span>
                    <span className="text-muted-foreground">
                      {post.date} · {post.readTime}
                    </span>
                  </div>
                  <h2 className="heading mt-3 text-xl font-semibold tracking-tight text-foreground">
                    {post.title}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {post.excerpt}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                    Read article
                    <ArrowRight className="size-4" aria-hidden />
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>
        <CtaBand
          title="Get shipping insights by email"
          body="Corridor updates, packing guides and rate changes — once a month, no noise."
          primaryHref="/register"
          primaryLabel="Sign Up"
        />
      </div>
    );
  }

  /* --------------------------------------------------------------- partnership */
  if (resource === "partnership") {
    return (
      <div>
        <ContentPage
          eyebrow={EYEBROWS[resource]}
          title={title}
          intro="Partner with Chen Logistics — as a business account, a collection point, or a technology integration."
          sections={[
            {
              title: "Business accounts",
              icon: Briefcase,
              paragraphs: [
                "Regular shippers join the corporate programme with volume pricing, a dedicated account manager, consolidated billing and monthly reporting. If you ship more than a handful of parcels a week, an account pays for itself.",
              ],
            },
            {
              title: "Collection points & agents",
              icon: ScrollText,
              paragraphs: [
                "We work with shops and hubs across Nigeria as collection and drop-off points. Agents earn per parcel handled and get signage, training and the Chen App scanner workflow.",
              ],
            },
            {
              title: "Technology partners",
              icon: ArrowRight,
              paragraphs: [
                "E-commerce platforms, ERPs and marketplaces can integrate quoting, waybill generation and tracking through our partner API. See the Developer page for the integration model, or talk to us about a bespoke integration.",
              ],
            },
          ]}
        />
        <CtaBand
          title="Start a partnership"
          body="Tell us what you ship and how often — we will respond with the right structure within one business day."
          primaryHref="/quote"
          primaryLabel="Talk to the partnerships team"
        />
      </div>
    );
  }

  /* ---------------------------------------------------------------- developer */
  if (resource === "developer") {
    return (
      <div>
        <ContentPage
          eyebrow={EYEBROWS[resource]}
          title={title}
          intro="Integrate Chen Logistics into your platform — quoting, waybills, tracking and webhooks for partners and corporate accounts."
          sections={[
            {
              title: "Authentication",
              paragraphs: [
                "Partner API access is issued per partnership agreement. Each integration receives an API key (test and live modes) and authenticates every request with a signed header. Keys are scoped to the operations the partner is entitled to — nothing broader.",
              ],
            },
            {
              title: "Core resources",
              paragraphs: [
                "The API exposes the same operational objects our platform runs on: quotes, shipments with canonical status transitions, tracking events, delivery attempts, proof of delivery and invoices. Every mutation is audited with who, what, when, before and after.",
              ],
            },
            {
              title: "Webhooks",
              paragraphs: [
                "Subscribe to shipment status, delivery and exception events instead of polling. Webhook deliveries are signed so you can verify they came from Chen Logistics, and every endpoint gets retried with backoff until it acknowledges.",
              ],
            },
            {
              title: "Sandbox and limits",
              paragraphs: [
                "Test mode mirrors the production model with demo data, so integrations can be built and verified before going live. Rate limits are per key and published in the partner portal; the Chen Logistics developer programme is currently by partnership arrangement.",
              ],
            },
          ]}
        />
        <CtaBand
          title="Build on the Chen Logistics network"
          body="Corporate accounts and partners get API access, sandbox keys and integration support."
          primaryHref="/quote"
          primaryLabel="Request API access"
          secondaryHref="/resources/partnership"
          secondaryLabel="Partnership programme"
        />
      </div>
    );
  }

  /* -------------------------------------------------------------- legal pages */
  const LEGAL_SECTIONS = {
    "privacy-policy": PRIVACY_SECTIONS,
    "terms-conditions": TERMS_SECTIONS,
    "cookie-policy": COOKIE_SECTIONS,
    "ims-policy": IMS_SECTIONS,
  }[resource];

  if (!LEGAL_SECTIONS) notFound();

  return (
    <div>
      <ContentPage
        eyebrow={EYEBROWS[resource]}
        title={title}
        sections={LEGAL_SECTIONS.map((section) => ({
          ...section,
          icon: CircleHelp,
        }))}
      />
      <p className="mx-auto max-w-5xl px-4 pb-12 text-xs text-muted-foreground sm:px-6 lg:px-8">
        Last reviewed: October 2026. Questions about this policy can be
        directed to the company contact details in the site footer.
      </p>
    </div>
  );
}
