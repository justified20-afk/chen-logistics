import type { Metadata } from "next";
import {
  BadgeCheck,
  Clock3,
  Forklift,
  MapPin,
  ScanLine,
  Users,
} from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import { ContentPage, CtaBand } from "@/components/site/content-page";

export const metadata: Metadata = {
  title: `Mobile Experience Centre — ${APP_NAME}`,
  description:
    "Visit the Chen Logistics Mobile Experience Centre in Lagos — see the fleet, test the app, and meet the operations team.",
};

const HIGHLIGHTS = [
  {
    icon: Forklift,
    title: "Fleet floor",
    body: "Walk the hub floor and watch parcels sort, stage and load in real time — the same workflow our drivers and hub teams run daily.",
  },
  {
    icon: ScanLine,
    title: "App playground",
    body: "Try the Chen App on demo devices: book a test pickup, track a live shipment and capture a sample proof of delivery.",
  },
  {
    icon: Users,
    title: "Meet the team",
    body: "Talk to operations, international and customer care staff about your shipping needs — no appointment needed for walk-ins.",
  },
  {
    icon: BadgeCheck,
    title: "Packaging lab",
    body: "Get your parcel packed correctly on the spot, with prohibited-item checks and customs tips for international sends.",
  },
];

export default function ExperiencePage() {
  return (
    <div>
      <ContentPage
        eyebrow="Company"
        title="Mobile Experience Centre"
        intro="See how Chen Logistics moves the country — a walk-through experience at our Lagos headquarters."
        sections={[
          {
            title: "Visit us",
            icon: MapPin,
            paragraphs: [
              "The Mobile Experience Centre is open at our Lagos Island headquarters, alongside the hub that started the network. Come see a working logistics floor, test the Chen App, and talk to the people who run the routes.",
            ],
          },
        ]}
      />

      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground">
                Location
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                14 Marina Road, Lagos Island, Lagos — beside the
                Lagos Island Hub.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Clock3 className="size-4 text-brand" aria-hidden />
                Opening hours
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Monday – Saturday, 08:00 – 17:00. Guided floor walks
                every hour on the hour.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {HIGHLIGHTS.map((highlight) => {
              const Icon = highlight.icon;
              return (
                <div
                  key={highlight.title}
                  className="rounded-lg border border-border bg-card p-5"
                >
                  <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-4.5" aria-hidden />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">
                    {highlight.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {highlight.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <CtaBand
        title="Plan your visit"
        body="Walk-ins welcome. For group visits or corporate tours, book through the quote desk."
        primaryHref="/quote"
        primaryLabel="Book a tour"
        secondaryHref="/locations"
        secondaryLabel="Find a hub near you"
      />
    </div>
  );
}
