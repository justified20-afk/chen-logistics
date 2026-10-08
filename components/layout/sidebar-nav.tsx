"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { cn } from "cn";
import { Package, ArrowRight } from "lucide-react";
import { navForRole, navCanSee, type NavSection } from "@/lib/nav";
import { ChenLogo } from "@/components/brand/chen-logo";
import type { RoleKey } from "@/types/permissions";

export function SidebarNav({
  role,
  permissions,
  onNavigate,
  variant = "sidebar",
}: {
  role: RoleKey;
  permissions: string[];
  onNavigate?: () => void;
  variant?: "sidebar" | "sheet";
}) {
  const pathname = usePathname();
  const sections = navForRole(role).filter((section) =>
    section.items.some((item) => navCanSee(item, role, permissions)),
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <Link href="/" className="rounded-md" aria-label="Chen Logistics — home">
          <ChenLogo size="sm" />
        </Link>
      </div>

      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 pb-6">
        {sections.map((section: NavSection) => (
          <div key={section.label} className="mb-5">
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items
                .filter((item) => navCanSee(item, role, permissions))
                .map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative flex min-h-10 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors",
                          active
                            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand transition-opacity",
                            active ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <Icon className="size-4 shrink-0" aria-hidden />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border px-5 py-4 text-[11px] leading-relaxed text-muted-foreground">
        <Fragment>
          Operational data shown in this environment is <strong>seed/demo data</strong> — not
          live telemetry.
        </Fragment>
        <Link
          href="/tracking"
          className="mt-2 inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
        >
          Public tracking <ArrowRight className="size-3" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
