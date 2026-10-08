import Link from "next/link";
import { Globe, MapPin, Phone } from "lucide-react";
import { ChenLogo } from "@/components/brand/chen-logo";
import { SocialIcon, type SocialPlatform } from "@/components/brand/social-icons";
import {
  COMPANY_LEGAL_NAME,
  COMPANY_LOCATION,
  COMPANY_PHONES,
  COMPANY_WEBSITE,
  COMPANY_WEBSITE_URL,
  SOCIALS,
} from "@/lib/brand";
import {
  FOOTER_COLUMNS,
  FOOTER_LEGAL_LINKS,
} from "@/lib/site-nav";

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link
              href={link.href}
              className="text-sm leading-snug text-muted-foreground transition-colors hover:text-foreground hover:underline underline-offset-4"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const SOCIAL_ICONS: Record<string, SocialPlatform> = {
  LinkedIn: "linkedin",
  X: "x",
  Instagram: "instagram",
  Facebook: "facebook",
  YouTube: "youtube",
};

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1.1fr_1fr_1fr]">
          {/* Company introduction + contact */}
          <div className="max-w-sm">
            <ChenLogo size="lg" />
            <p className="mt-5 text-sm font-medium leading-relaxed text-foreground">
              Delivering fast, reliable shipping and logistics solutions you
              can count on.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Chen Logistics combines technology, reliable transportation, and
              customer-focused logistics solutions to make domestic and
              international shipping simpler.
            </p>

            <address className="mt-6 space-y-2.5 text-sm not-italic text-muted-foreground">
              <p className="font-semibold text-foreground">
                {COMPANY_LEGAL_NAME}
              </p>
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                {COMPANY_LOCATION}
              </p>
              {COMPANY_PHONES.map((phone) => (
                <p key={phone.href} className="flex items-center gap-2">
                  <Phone className="size-4 shrink-0 text-brand" aria-hidden />
                  <a
                    href={phone.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {phone.label}
                  </a>
                </p>
              ))}
              <p className="flex items-center gap-2">
                <Globe className="size-4 shrink-0 text-brand" aria-hidden />
                <a
                  href={COMPANY_WEBSITE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-foreground"
                >
                  {COMPANY_WEBSITE}
                </a>
              </p>
            </address>

            <div className="mt-6 flex items-center gap-2">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Chen Logistics on ${social.label}`}
                  className="grid size-9 place-items-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand"
                >
                  <SocialIcon platform={SOCIAL_ICONS[social.label]} />
                </a>
              ))}
            </div>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <FooterColumn
              key={column.title}
              title={column.title}
              links={column.links}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <p>
            © 2026 {COMPANY_LEGAL_NAME}. All rights reserved.
          </p>
          <nav aria-label="Legal">
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
              {FOOTER_LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-foreground hover:underline underline-offset-4"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
