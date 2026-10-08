import type { Metadata } from "next";
import { APP_NAME } from "@/lib/brand";
import { TEAM } from "@/lib/site-content";
import { ContentPage, CtaBand } from "@/components/site/content-page";

export const metadata: Metadata = {
  title: `Management Team — ${APP_NAME}`,
  description:
    "Meet the management team leading Chen Logistics across operations, technology, international corridors, customer experience and fleet safety.",
};

export default function ManagementPage() {
  return (
    <div>
      <ContentPage
        eyebrow="About Us"
        title="Management Team"
        intro="The people behind the network — founders, operators and engineers who keep every promise window honest."
      />

      <section className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((member) => (
              <article
                key={member.name}
                className="rounded-lg border border-border bg-card p-5"
              >
                <span className="grid size-12 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {member.initials}
                </span>
                <h3 className="mt-3 text-sm font-semibold text-foreground">
                  {member.name}
                </h3>
                <p className="text-xs font-medium text-brand">{member.role}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {member.bio}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-8 text-xs text-muted-foreground">
            Team profiles shown on this demonstration build are illustrative.
          </p>
        </div>
      </section>

      <CtaBand
        title="Talk to the team"
        body="Questions about accounts, corridors or corporate shipping? Our management team is reachable through the quote desk."
        primaryHref="/quote"
        primaryLabel="Get a Quote"
        secondaryHref="/careers"
        secondaryLabel="Join the team"
      />
    </div>
  );
}
