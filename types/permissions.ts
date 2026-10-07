export const PERMISSIONS = [
  "dashboard.view",
  "shipments.view",
  "shipments.create",
  "shipments.edit",
  "shipments.cancel",
  "shipments.status",
  "dispatch.view",
  "dispatch.create",
  "dispatch.assign",
  "dispatch.dispatch",
  "fleet.view",
  "fleet.manage",
  "drivers.view",
  "drivers.manage",
  "hubs.view",
  "hubs.manage",
  "exceptions.view",
  "exceptions.manage",
  "finance.view",
  "finance.manage",
  "reports.view",
  "customers.view",
  "customers.manage",
  "pickups.manage",
  "deliveries.manage",
  "pod.create",
  "notifications.view",
  "users.manage",
  "settings.manage",
  "audit.view",
  "driver.portal",
  "customer.portal",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_KEYS = [
  "administrator",
  "operations_manager",
  "dispatcher",
  "warehouse",
  "driver",
  "support",
  "finance",
  "customer",
] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];

export interface RoleDefinition {
  key: RoleKey;
  name: string;
  description: string;
  permissions: Permission[];
}

const ALL: Permission[] = [...PERMISSIONS];

const OPERATIONS: Permission[] = [
  "dashboard.view",
  "shipments.view",
  "shipments.create",
  "shipments.edit",
  "shipments.cancel",
  "shipments.status",
  "dispatch.view",
  "dispatch.create",
  "dispatch.assign",
  "dispatch.dispatch",
  "fleet.view",
  "drivers.view",
  "hubs.view",
  "hubs.manage",
  "exceptions.view",
  "exceptions.manage",
  "finance.view",
  "reports.view",
  "customers.view",
  "customers.manage",
  "pickups.manage",
  "deliveries.manage",
  "pod.create",
  "notifications.view",
  "audit.view",
];

const DISPATCHER: Permission[] = [
  "dashboard.view",
  "shipments.view",
  "shipments.edit",
  "shipments.status",
  "dispatch.view",
  "dispatch.create",
  "dispatch.assign",
  "dispatch.dispatch",
  "fleet.view",
  "drivers.view",
  "hubs.view",
  "exceptions.view",
  "exceptions.manage",
  "pickups.manage",
  "notifications.view",
];

const WAREHOUSE: Permission[] = [
  "dashboard.view",
  "shipments.view",
  "shipments.status",
  "hubs.view",
  "hubs.manage",
  "exceptions.view",
  "exceptions.manage",
  "dispatch.view",
  "notifications.view",
];

const DRIVER: Permission[] = [
  "dashboard.view",
  "shipments.view",
  "pickups.manage",
  "deliveries.manage",
  "pod.create",
  "exceptions.view",
  "driver.portal",
  "notifications.view",
];

const SUPPORT: Permission[] = [
  "dashboard.view",
  "shipments.view",
  "shipments.edit",
  "customers.view",
  "customers.manage",
  "exceptions.view",
  "exceptions.manage",
  "dispatch.view",
  "notifications.view",
];

const FINANCE: Permission[] = [
  "dashboard.view",
  "shipments.view",
  "customers.view",
  "finance.view",
  "finance.manage",
  "reports.view",
  "audit.view",
  "notifications.view",
];

const CUSTOMER: Permission[] = ["customer.portal"];

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    key: "administrator",
    name: "Administrator",
    description: "Full system access including users, roles and settings.",
    permissions: ALL,
  },
  {
    key: "operations_manager",
    name: "Operations Manager",
    description:
      "Operational visibility across the shipment lifecycle, hubs, dispatch, exceptions and reports.",
    permissions: OPERATIONS,
  },
  {
    key: "dispatcher",
    name: "Dispatcher",
    description: "Trip planning, assignment, route workload and dispatch status.",
    permissions: DISPATCHER,
  },
  {
    key: "warehouse",
    name: "Warehouse Staff",
    description: "Inbound receiving, sorting, staging, scanning and handover at a hub.",
    permissions: WAREHOUSE,
  },
  {
    key: "driver",
    name: "Driver / Rider",
    description: "Assigned jobs, pickup, delivery status updates and proof of delivery.",
    permissions: DRIVER,
  },
  {
    key: "support",
    name: "Customer Support",
    description: "Customer lookup, shipment tracking, communication notes and exception handling.",
    permissions: SUPPORT,
  },
  {
    key: "finance",
    name: "Finance",
    description: "Invoices, payments, COD reconciliation and financial reporting.",
    permissions: FINANCE,
  },
  {
    key: "customer",
    name: "Customer",
    description: "Customer portal access to their own shipments, tracking and invoices.",
    permissions: CUSTOMER,
  },
];

export const ROLE_LABELS: Record<RoleKey, string> = Object.fromEntries(
  ROLE_DEFINITIONS.map((role) => [role.key, role.name]),
) as Record<RoleKey, string>;
