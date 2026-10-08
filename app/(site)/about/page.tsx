import type { Metadata } from "next";
import { Globe, Package, Truck, Users } from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import { ABOUT_SECTIONS } from "@/lib/site-content";
import { ContentPage, CtaBand } from "@/components/site/content-page";

export const metadata: Metadata = {
  title: `About Us — ${APP_NAME}`,
  description:
    "Who Chen Logistics is, what we do, and why customers across Nigeria and 230+ worldwide locations trust us with their shipments.",
};

export default function AboutPage() {
  return (
    <div>
      <ContentPage
        eyebrow="About Us"
        title="About Chen Logistics"
        intro="A Nigerian logistics and technology company moving parcels, freight and commerce across all 36 states and to 230+ locations worldwide."
        sections={ABOUT_SECTIONS.map((section, index) => ({
          ...section,
          icon: [Users, Truck, Globe][index] ?? Package,
        }))}
      />
      <section className="border-t border-border bg-muted/40">
        <div className="mx-auto grid max-w-5xl gap-4 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            { value: "2019", label: "Founded in Lagos" },
            { value: "36", label: "States served in Nigeria" },
            { value: "230+", label: "Locations worldwide" },
            { value: "24–48h", label: "ChenFaster express window" },
          ].map((fact) => (
            <div
              key={fact.label}
              className="rounded-lg border border-border bg-card p-5 text-center"
            >
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {fact.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{fact.label}</p>
            </div>
          ))}
        </div>
      </section>
      <CtaBand
        title="Ship with a partner who answers"
        body="Get an instant quote for domestic or international shipping — no account required."
        primaryHref="/quote"
        primaryLabel="Get a Quote"
        secondaryHref="/tracking"
        secondaryLabel="Track a shipment"
      />
    </div>
  );
}
