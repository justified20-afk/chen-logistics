import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Coffee,
  CreditCard,
  GraduationCap,
  HeartPulse,
  Laptop,
  MapPin,
  Users,
} from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import { CAREER_ROLES } from "@/lib/site-content";
import { ContentPage, CtaBand } from "@/components/site/content-page";

export const metadata: Metadata = {
  title: `Careers — ${APP_NAME}`,
  description:
    "Join Chen Logistics — careers across operations, technology, customer care, fleet and international desks in Nigeria.",
};

const PERKS = [
  { icon: Laptop, title: "Remote-first teams", body: "Work from anywhere in Nigeria for role-appropriate teams." },
  { icon: CreditCard, title: "Competitive pay", body: "Reviewed annually against the market, paid on schedule." },
  { icon: HeartPulse, title: "Health cover", body: "Medical insurance for you and your dependents." },
  { icon: GraduationCap, title: "Learning budget", body: "Courses, certifications and conference support." },
  { icon: Coffee, title: "Hub perks", body: "Daily meals at hub offices during shift hours." },
  { icon: Users, title: "Growth paths", body: "Clear progression from operator to manager to lead." },
];

export default function CareersPage() {
  return (
    <div>
      <ContentPage
        eyebrow="Careers"
        title="Careers at Chen Logistics"
        intro="Help move a network that spans all 36 states and 230+ locations worldwide — in operations, technology, customer care, fleet or international trade."
        sections={[
          {
            title: "Why work with us",
            icon: Briefcase,
            paragraphs: [
              "Chen Logistics is a Nigerian logistics and technology company. Joining means working on a network that touches every state capital and five international corridors — where the systems you build are the systems customers rely on daily.",
              "We hire for ownership. Whether you run a hub shift, dispatch a fleet, write the tracking platform or answer a worried sender, you are trusted with the outcome, not just the task.",
            ],
          },
        ]}
      />

      {/* Perks */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="heading text-2xl font-semibold tracking-tight text-foreground">
            What we offer
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PERKS.map((perk) => {
              const Icon = perk.icon;
              return (
                <div
                  key={perk.title}
                  className="rounded-lg border border-border bg-card p-5"
                >
                  <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-4.5" aria-hidden />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">
                    {perk.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {perk.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Open roles */}
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="heading text-2xl font-semibold tracking-tight text-foreground">
          Open positions
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Current vacancies across the network. Roles shown are
          illustrative for this site build.
        </p>
        <ul className="mt-8 space-y-3">
          {CAREER_ROLES.map((role) => (
            <li
              key={role.title}
              className="rounded-lg border border-border bg-card p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-foreground">
                  {role.title}
                </h3>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {role.team}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" aria-hidden />
                  {role.location}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="size-3.5" aria-hidden />
                  {role.type}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {role.summary}
              </p>
              <Link
                href="/quote"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4"
              >
                Apply for this role
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          Do not see your role? Send your CV through the quote desk
          with the subject “Careers — general application”.
        </p>
      </section>

      <CtaBand
        title="Your route starts here"
        body="Applications are reviewed weekly. Tell us which role fits you best."
        primaryHref="/quote"
        primaryLabel="Apply now"
      />
    </div>
  );
}
