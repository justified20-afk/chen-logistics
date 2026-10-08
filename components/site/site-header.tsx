"use client";

/**
 * Chen Logistics — public site header.
 *
 * Desktop: two-line logo, About Us / Products / Locations / Resources
 * dropdowns (Products renders a two-column mega menu), a direct Careers
 * link, and a right-side action area with Sign Up (secondary) and
 * Get a Quote (primary CTA). Mobile: a sheet with accordion menus.
 */
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import {
  ArrowRight,
  ChevronDown,
  MapPin,
  Menu,
  MoveRight,
} from "lucide-react";
import { ChenLogo } from "@/components/brand/chen-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ABOUT_MENU,
  CAREERS_LINK,
  DOWNLOAD_APP_HREF,
  GET_QUOTE_HREF,
  LOCATION_COUNTRIES,
  POPULAR_ROUTES,
  PRODUCTS_MEGA,
  RESOURCES_MENU,
  SIGN_UP_HREF,
  type SiteLink,
} from "@/lib/site-nav";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** A dropdown row: icon, label and optional description. */
function MenuLink({ link }: { link: SiteLink }) {
  const Icon = link.icon;
  return (
    <DropdownMenuItem asChild className="h-auto items-start gap-3 rounded-md px-2.5 py-2.5">
      <Link href={link.href}>
        {Icon ? (
          <Icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
        ) : null}
        <span className="min-w-0">
          <span className="block text-sm font-medium leading-snug">
            {link.label}
          </span>
          {link.description ? (
            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
              {link.description}
            </span>
          ) : null}
        </span>
      </Link>
    </DropdownMenuItem>
  );
}

function DesktopNavLink({
  label,
  href,
  pathname,
}: {
  label: string;
  href: string;
  pathname: string;
}) {
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-foreground/75 hover:bg-accent/60 hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

function NavTrigger({
  label,
  pathname,
  href,
  children,
}: {
  label: string;
  pathname: string;
  href: string;
  children: React.ReactNode;
}) {
  const active = isActive(pathname, href);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-hidden data-[state=open]:bg-accent",
          active
            ? "bg-accent text-accent-foreground"
            : "text-foreground/75 hover:bg-accent/60 hover:text-foreground",
        )}
      >
        {label}
        <ChevronDown
          className="size-3.5 transition-transform duration-200 data-[state=open]:rotate-180"
          aria-hidden
        />
      </DropdownMenuTrigger>
      {children}
    </DropdownMenu>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Chen Logistics — home"
          className="shrink-0 rounded-md"
        >
          <ChenLogo />
        </Link>

        {/* Primary navigation — desktop */}
        <nav aria-label="Primary" className="hidden items-center lg:flex">
          <NavTrigger label="About Us" pathname={pathname} href="/about">
            <DropdownMenuContent className="w-72" align="start">
              {ABOUT_MENU.map((link) => (
                <MenuLink key={link.href} link={link} />
              ))}
            </DropdownMenuContent>
          </NavTrigger>

          <NavTrigger label="Products" pathname={pathname} href="/products">
            <DropdownMenuContent
              className="w-[42rem] max-w-[calc(100vw-1.5rem)] p-4"
              align="start"
            >
              <div className="grid gap-6 sm:grid-cols-2">
                {PRODUCTS_MEGA.map((group) => (
                  <div key={group.label}>
                    <DropdownMenuLabel className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {group.label}
                    </DropdownMenuLabel>
                    <ul className="space-y-0.5">
                      {group.links.map((link) => (
                        <li key={link.href}>
                          <MenuLink link={link} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <DropdownMenuSeparator className="my-3" />
              <div className="flex items-center justify-between px-2.5">
                <Link
                  href="/products"
                  className="text-sm font-medium text-primary hover:underline underline-offset-4"
                >
                  View all products
                </Link>
                <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
              </div>
            </DropdownMenuContent>
          </NavTrigger>

          <NavTrigger label="Locations" pathname={pathname} href="/locations">
            <DropdownMenuContent className="w-80" align="start">
              <DropdownMenuLabel className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Quick links — ship from
              </DropdownMenuLabel>
              {LOCATION_COUNTRIES.map((country) => (
                <MenuLink
                  key={country.href}
                  link={{ ...country, icon: MapPin, description: `Shipping from ${country.label} to Nigeria` }}
                />
              ))}
              <DropdownMenuSeparator className="my-1.5" />
              <DropdownMenuLabel className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Popular routes
              </DropdownMenuLabel>
              {POPULAR_ROUTES.map((route) => (
                <DropdownMenuItem
                  key={`${route.from}-${route.to}`}
                  asChild
                  className="h-auto items-center gap-2.5 rounded-md px-2.5 py-2"
                >
                  <Link href={route.href}>
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {route.from}
                      <MoveRight className="size-3.5 text-brand" aria-hidden />
                      {route.to}
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="my-1.5" />
              <DropdownMenuItem asChild className="h-auto rounded-md px-2.5 py-2">
                <Link href="/locations" className="flex w-full items-center justify-between text-sm font-medium text-primary">
                  All locations
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </NavTrigger>

          <NavTrigger label="Resources" pathname={pathname} href="/resources">
            <DropdownMenuContent className="w-72" align="start">
              {RESOURCES_MENU.map((link) => (
                <MenuLink key={link.href} link={link} />
              ))}
            </DropdownMenuContent>
          </NavTrigger>

          <DesktopNavLink
            label={CAREERS_LINK.label}
            href={CAREERS_LINK.href}
            pathname={pathname}
          />
        </nav>

        {/* Right-side action area */}
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={SIGN_UP_HREF}
            className="hidden h-9 items-center rounded-md border border-input bg-background px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:inline-flex"
          >
            Sign Up
          </Link>
          <Link
            href={GET_QUOTE_HREF}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:px-4"
          >
            Get a Quote
          </Link>

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              asChild
              className="grid size-9 shrink-0 place-items-center rounded-md border border-input bg-background lg:hidden"
            >
              <button type="button" aria-label="Open navigation menu">
                <Menu className="size-4.5" aria-hidden />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[20rem] overflow-y-auto p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation menu</SheetTitle>
              </SheetHeader>
              <div className="flex min-h-full flex-col">
                <div className="border-b border-border px-5 py-5">
                  <ChenLogo />
                </div>

                <nav aria-label="Mobile" className="flex-1 px-3 py-4">
                  <Accordion type="single" collapsible className="w-full">
                    {[
                      { label: "About Us", href: "/about", links: ABOUT_MENU },
                      { label: "Products", href: "/products", links: PRODUCTS_MEGA.flatMap((g) => g.links) },
                      {
                        label: "Locations",
                        href: "/locations",
                        links: [
                          ...LOCATION_COUNTRIES.map((c) => ({ ...c, href: c.href })),
                          ...POPULAR_ROUTES.map((r) => ({
                            label: `${r.from} → ${r.to}`,
                            href: r.href,
                          })),
                        ],
                      },
                      { label: "Resources", href: "/resources", links: RESOURCES_MENU },
                    ].map((section) => (
                      <AccordionItem key={section.label} value={section.label}>
                        <AccordionTrigger className="px-2 text-sm font-semibold">
                          {section.label}
                        </AccordionTrigger>
                        <AccordionContent className="px-2 pb-1">
                          <ul className="space-y-0.5">
                            <li>
                              <Link
                                href={section.href}
                                onClick={() => setMobileOpen(false)}
                                className="block rounded-md px-2 py-1.5 text-sm font-medium text-primary hover:bg-accent"
                              >
                                Overview
                              </Link>
                            </li>
                            {section.links.map((link) => (
                              <li key={link.href}>
                                <Link
                                  href={link.href}
                                  onClick={() => setMobileOpen(false)}
                                  className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                                >
                                  {link.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>

                  <Link
                    href={CAREERS_LINK.href}
                    onClick={() => setMobileOpen(false)}
                    className="mt-3 block rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent"
                  >
                    {CAREERS_LINK.label}
                  </Link>
                </nav>

                <div className="space-y-2 border-t border-border px-5 py-5">
                  <Link
                    href={SIGN_UP_HREF}
                    onClick={() => setMobileOpen(false)}
                    className="flex h-10 w-full items-center justify-center rounded-md border border-input text-sm font-medium"
                  >
                    Sign Up
                  </Link>
                  <Link
                    href={GET_QUOTE_HREF}
                    onClick={() => setMobileOpen(false)}
                    className="flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground"
                  >
                    Get a Quote
                  </Link>
                  <Link
                    href={DOWNLOAD_APP_HREF}
                    onClick={() => setMobileOpen(false)}
                    className="flex h-10 w-full items-center justify-center rounded-md text-sm font-medium text-primary hover:bg-accent"
                  >
                    Download Chen Logistics App
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
