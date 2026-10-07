"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  shipments: "Shipments",
  dispatch: "Dispatch",
  trips: "Trips",
  tracking: "Tracking",
  deliveries: "Deliveries",
  pickups: "Pickups",
  hubs: "Hubs",
  fleet: "Fleet",
  vehicles: "Vehicles",
  drivers: "Drivers",
  customers: "Customers",
  exceptions: "Exceptions",
  finance: "Finance",
  invoices: "Invoices",
  payments: "Payments",
  cod: "COD",
  reconciliation: "Reconciliation",
  reports: "Reports",
  notifications: "Notifications",
  settings: "Settings",
  users: "Users",
  roles: "Roles",
  statuses: "Statuses",
  integrations: "Integrations",
  "audit-log": "Audit log",
  general: "General",
  driver: "Driver",
  customer: "Customer",
  jobs: "Jobs",
  profile: "Profile",
  new: "New shipment",
  edit: "Edit",
  operations: "Hub operations",
  "delivery-performance": "Delivery performance",
  signin: "Sign in",
  register: "Create account",
};

export function titleFor(segment: string): string {
  if (TITLES[segment]) return TITLES[segment];
  if (/^[a-f0-9]{24}$/i.test(segment)) return "Record";
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs: { label: string; href: string }[] = [];
  let href = "";
  for (const segment of segments) {
    href += `/${segment}`;
    crumbs.push({ label: titleFor(segment), href });
  }

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-1">
          <Home className="size-3" aria-hidden />
          <Link href="/dashboard" className="hover:text-foreground hover:underline">
            Home
          </Link>
        </li>
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-1">
              <ChevronRight className="size-3 shrink-0" aria-hidden />
              {last ? (
                <span aria-current="page" className="truncate text-foreground">
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="truncate hover:text-foreground hover:underline">
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
