import {
  BarChart3,
  Boxes,
  Building2,
  CircleAlert,
  ClipboardList,
  Coins,
  Command,
  FileText,
  Gauge,
  LayoutDashboard,
  MapPin,
  Package,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/types/permissions";
import type { RoleKey } from "@/types/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
  /** Item only appears for these roles (in addition to permission checks). */
  roles?: RoleKey[];
  end?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

const OPS_ROLES: RoleKey[] = ["administrator", "operations_manager"];

const OVERVIEW: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { label: "Exceptions", href: "/exceptions", icon: CircleAlert, permission: "exceptions.view" },
];

const OPERATIONS: NavItem[] = [
  { label: "Shipments", href: "/shipments", icon: Package, permission: "shipments.view" },
  { label: "Dispatch", href: "/dispatch", icon: Truck, permission: "dispatch.view" },
  { label: "Pickups", href: "/pickups", icon: MapPin, permission: "shipments.view" },
  { label: "Deliveries", href: "/deliveries", icon: Boxes, permission: "shipments.view" },
  { label: "Tracking", href: "/tracking", icon: ClipboardList, permission: "shipments.view" },
];

const NETWORK: NavItem[] = [
  { label: "Hubs", href: "/hubs", icon: Warehouse, permission: "hubs.view" },
  { label: "Vehicles", href: "/fleet/vehicles", icon: Truck, permission: "fleet.view" },
  { label: "Drivers", href: "/fleet/drivers", icon: Users, permission: "drivers.view" },
  { label: "Customers", href: "/customers", icon: Building2, permission: "customers.view" },
];

const BACK_OFFICE: NavItem[] = [
  { label: "Finance", href: "/finance", icon: Coins, permission: "finance.view" },
  { label: "Reports", href: "/reports", icon: BarChart3, permission: "reports.view" },
  { label: "Notifications", href: "/notifications", icon: Command, permission: "notifications.view" },
];

const ADMIN: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings, permission: "settings.manage" },
  { label: "Users", href: "/settings/users", icon: Users, permission: "users.manage", roles: OPS_ROLES },
  { label: "Audit log", href: "/settings/audit-log", icon: ShieldCheck, permission: "audit.view" },
];

export const OPS_NAV: NavSection[] = [
  { label: "Overview", items: OVERVIEW },
  { label: "Operations", items: OPERATIONS },
  { label: "Network", items: NETWORK },
  { label: "Back office", items: BACK_OFFICE },
  { label: "Administration", items: ADMIN },
];

export const FINANCE_NAV: NavSection[] = [
  { label: "Overview", items: OVERVIEW.filter((item) => item.href !== "/exceptions") },
  {
    label: "Receivables",
    items: [
      { label: "Finance", href: "/finance", icon: Coins, permission: "finance.view" },
      { label: "Invoices", href: "/finance/invoices", icon: FileText, permission: "finance.view" },
      { label: "Payments", href: "/finance/payments", icon: Coins, permission: "finance.view" },
      { label: "COD", href: "/finance/cod", icon: Coins, permission: "finance.view" },
      { label: "Reconciliation", href: "/finance/reconciliation", icon: ClipboardList, permission: "finance.manage" },
    ],
  },
  {
    label: "Accounts",
    items: [
      { label: "Customers", href: "/customers", icon: Building2, permission: "customers.view" },
      { label: "Shipments", href: "/shipments", icon: Package, permission: "shipments.view" },
      { label: "Reports", href: "/reports", icon: BarChart3, permission: "reports.view" },
      { label: "Audit log", href: "/settings/audit-log", icon: ShieldCheck, permission: "audit.view" },
    ],
  },
];

export const SUPPORT_NAV: NavSection[] = [
  { label: "Overview", items: OVERVIEW },
  {
    label: "Customer care",
    items: [
      { label: "Shipments", href: "/shipments", icon: Package, permission: "shipments.view" },
      { label: "Tracking", href: "/tracking", icon: ClipboardList, permission: "shipments.view" },
      { label: "Customers", href: "/customers", icon: Building2, permission: "customers.view" },
      { label: "Deliveries", href: "/deliveries", icon: Boxes, permission: "shipments.view" },
      { label: "Notifications", href: "/notifications", icon: Command, permission: "notifications.view" },
    ],
  },
];

export const WAREHOUSE_NAV: NavSection[] = [
  { label: "Overview", items: OVERVIEW },
  {
    label: "Hub floor",
    items: [
      { label: "Hub operations", href: "/hubs", icon: Warehouse, permission: "hubs.view" },
      { label: "Shipments", href: "/shipments", icon: Package, permission: "shipments.view" },
      { label: "Dispatch board", href: "/dispatch", icon: Truck, permission: "dispatch.view" },
      { label: "Notifications", href: "/notifications", icon: Command, permission: "notifications.view" },
    ],
  },
];

export const DRIVER_NAV: NavSection[] = [
  {
    label: "Driver",
    items: [
      { label: "Today", href: "/driver", icon: Gauge, permission: "driver.portal" },
      { label: "My jobs", href: "/driver/jobs", icon: ClipboardList, permission: "driver.portal" },
      { label: "Profile", href: "/driver/profile", icon: Users, permission: "driver.portal" },
    ],
  },
];

export const CUSTOMER_NAV: NavSection[] = [
  {
    label: "Customer portal",
    items: [
      { label: "Overview", href: "/customer", icon: LayoutDashboard, permission: "customer.portal" },
      { label: "Shipments", href: "/customer/shipments", icon: Package, permission: "customer.portal" },
      { label: "Tracking", href: "/customer/tracking", icon: ClipboardList, permission: "customer.portal" },
      { label: "Invoices", href: "/customer/invoices", icon: FileText, permission: "customer.portal" },
      { label: "Profile", href: "/customer/profile", icon: Users, permission: "customer.portal" },
    ],
  },
];

export function navForRole(role: RoleKey): NavSection[] {
  switch (role) {
    case "driver":
      return DRIVER_NAV;
    case "customer":
      return CUSTOMER_NAV;
    case "finance":
      return FINANCE_NAV;
    case "support":
      return SUPPORT_NAV;
    case "warehouse":
      return WAREHOUSE_NAV;
    default:
      return OPS_NAV;
  }
}

export function navCanSee(item: NavItem, role: RoleKey, permissions: string[]): boolean {
  if (item.roles && !item.roles.includes(role)) return false;
  if (item.permission && !permissions.includes(item.permission)) return false;
  return true;
}
