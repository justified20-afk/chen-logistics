import type { Metadata } from "next";
import { APP_NAME } from "@/lib/brand";
import { JOURNEY_MILESTONES } from "@/lib/site-content";
import { ContentPage, CtaBand } from "@/components/site/content-page";

export const metadata: Metadata = {
  title: `Our Journey — ${APP_NAME}`,
  description:
    "From one Lagos hub in 2019 to a nationwide network shipping to 230+ locations worldwide — the story of Chen Logistics.",
};

export default function JourneyPage() {
  return (
    <div>
      <ContentPage
        eyebrow="About Us"
        title="Our Journey"
        intro="Chen Logistics began as a single hub on Lagos Island. Seven years later, the same road runs through every state capital in Nigeria and five international corridors."
      />

      <section className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <ol className="relative space-y-8 border-l-2 border-border pl-8">
            {JOURNEY_MILESTONES.map((milestone) => (
              <li key={milestone.year} className="relative">
                <span
                  className="absolute -left-[2.55rem] grid size-4 place-items-center rounded-full border-2 border-brand bg-background"
                  aria-hidden
                />
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
                  {milestone.year}
                </p>
                <h3 className="heading mt-1 text-lg font-semibold tracking-tight text-foreground">
                  {milestone.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {milestone.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <CtaBand
        title="The next chapter is yours"
        body="Join thousands of businesses and households shipping on the Chen Logistics network."
        primaryHref="/quote"
        primaryLabel="Get a Quote"
        secondaryHref="/register"
        secondaryLabel="Sign Up"
      />
    </div>
  );
}
