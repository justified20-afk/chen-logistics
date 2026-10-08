import type { Metadata } from "next";
import {
  Eye,
  Flag,
  HeartHandshake,
  Lightbulb,
  ShieldCheck,
  Target,
  Zap,
} from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import { VISION_CONTENT } from "@/lib/site-content";
import { ContentPage, CtaBand } from "@/components/site/content-page";

export const metadata: Metadata = {
  title: `Vision / Mission / Core Values — ${APP_NAME}`,
  description:
    "The vision, mission and core values that guide every shipment Chen Logistics moves across Nigeria and 230+ locations worldwide.",
};

const VALUE_ICONS = [ShieldCheck, Zap, HeartHandshake, Target, Lightbulb, Flag];

export default function VisionPage() {
  return (
    <div>
      <ContentPage
        eyebrow="About Us"
        title="Vision / Mission / Core Values"
        sections={[
          {
            title: "Our vision",
            icon: Eye,
            paragraphs: [VISION_CONTENT.vision],
          },
          {
            title: "Our mission",
            icon: Target,
            paragraphs: [VISION_CONTENT.mission],
          },
        ]}
      />

      <section className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">
            Core values
          </p>
          <h2 className="heading mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Six values, every shipment
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {VISION_CONTENT.values.map((value, index) => {
              const Icon = VALUE_ICONS[index] ?? ShieldCheck;
              return (
                <div
                  key={value.title}
                  className="rounded-lg border border-border bg-card p-5"
                >
                  <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-4.5" aria-hidden />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">
                    {value.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {value.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <CtaBand
        title="Values only matter when they show up at your door"
        body="Experience the Chen Logistics difference on your next shipment."
        primaryHref="/quote"
        primaryLabel="Get a Quote"
        secondaryHref="/tracking"
        secondaryLabel="Track a shipment"
      />
    </div>
  );
}
