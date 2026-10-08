import type { Metadata } from "next";
import { APP_NAME } from "@/lib/brand";
import { QuoteForm } from "./quote-form";

export const metadata: Metadata = {
  title: `Get a Quote — ${APP_NAME}`,
  description:
    "Get an instant quote for domestic or international shipping with Chen Logistics. Quotes for standard, ChenFaster express and same-day service.",
};

export default function QuotePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
      <div className="border-b border-border py-12 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">
          Get a Quote
        </p>
        <h1 className="heading mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Quote your shipment
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Tell us what you are shipping and where it is going.
          Domestic quotes are instant; international quotes are
          confirmed within one business day.
        </p>
      </div>

      <div className="py-10 sm:py-12">
        <QuoteForm />
      </div>
    </main>
  );
}
