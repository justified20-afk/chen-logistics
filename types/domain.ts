/**
 * Domain model for Chen Logistics.
 *
 * Timestamps are exposed as ISO-8601 strings in the domain layer and stored as
 * BSON dates in MongoDB. Money values are integer minor units — see lib/money.ts.
 */

export const SHIPMENT_STATUSES = [
  "draft",
  "booked",
  "awaiting_pickup",
  "picked_up",
  "at_origin_hub",
  "in_transit",
  "at_destination_hub",
  "out_for_delivery",
  "delivery_attempted",
  "delivered",
  "failed",
  "return_initiated",
  "returned",
  "cancelled",
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "unpaid",
  "paid",
  "cod_pending",
  "cod_collected",
  "reconciled",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const SERVICE_LEVELS = ["standard", "express", "same_day"] as const;
export type ServiceLevel = (typeof SERVICE_LEVELS)[number];

export const PRIORITIES = ["normal", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const COD_STATUSES = [
  "pending",
  "collected",
  "partially_collected",
  "not_collected",
  "reconciled",
] as const;
export type CodStatus = (typeof COD_STATUSES)[number];

export const DELIVERY_FAILURE_REASONS = [
  "customer_unavailable",
  "wrong_address",
  "customer_refused",
  "phone_unreachable",
  "access_issue",
  "damaged_package",
  "cash_unavailable",
  "vehicle_issue",
  "weather",
  "other",
] as const;
export type DeliveryFailureReason = (typeof DELIVERY_FAILURE_REASONS)[number];

export const PICKUP_STATUSES = [
  "scheduled",
  "driver_assigned",
  "en_route",
  "arrived",
  "picked_up",
  "failed",
  "cancelled",
] as const;
export type PickupStatus = (typeof PICKUP_STATUSES)[number];

export const TRIP_STATUSES = [
  "draft",
  "planned",
  "assigned",
  "ready",
  "dispatched",
  "in_transit",
  "arrived",
  "completed",
  "cancelled",
] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

export const VEHICLE_STATUSES = [
  "available",
  "assigned",
  "on_trip",
  "maintenance",
  "inactive",
] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const DRIVER_STATUSES = [
  "available",
  "assigned",
  "on_trip",
  "off_duty",
  "suspended",
  "inactive",
] as const;
export type DriverStatus = (typeof DRIVER_STATUSES)[number];

export const HUB_STATUSES = ["active", "inactive", "at_capacity"] as const;
export type HubStatus = (typeof HUB_STATUSES)[number];

export const EXCEPTION_TYPES = [
  "delayed",
  "address_issue",
  "damaged",
  "lost",
  "failed_delivery",
  "missing_scan",
  "payment_issue",
  "capacity_issue",
  "driver_issue",
  "vehicle_issue",
  "system_issue",
] as const;
export type ExceptionType = (typeof EXCEPTION_TYPES)[number];

export const EXCEPTION_STATUSES = [
  "open",
  "acknowledged",
  "investigating",
  "waiting",
  "resolved",
  "closed",
] as const;
export type ExceptionStatus = (typeof EXCEPTION_STATUSES)[number];

export const SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const HUB_OPERATIONS = [
  "received",
  "sorted",
  "staged",
  "handed_over",
  "damaged",
  "missing",
  "held",
  "released",
] as const;
export type HubOperationType = (typeof HUB_OPERATIONS)[number];

export const USER_STATUSES = ["active", "suspended", "invited"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const MAINTENANCE_TYPES = [
  "service",
  "repair",
  "tyres",
  "insurance",
  "inspection",
  "other",
] as const;
export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];

export const NOTIFICATION_TYPES = [
  "shipment_delayed",
  "delivery_failed",
  "driver_assigned",
  "trip_dispatched",
  "compliance_expiring",
  "exception_escalated",
  "payment_discrepancy",
  "pickup_overdue",
  "system",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const INVOICE_STATUSES = ["draft", "issued", "partially_paid", "paid", "void"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_METHODS = [
  "cash",
  "card",
  "bank_transfer",
  "ussd",
  "online",
  "cheque",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface Address {
  name: string;
  phone: string;
  email?: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  landmark?: string;
  /** Optional provider-supplied coordinates. Never fabricated by the app. */
  lat?: number;
  lng?: number;
}

export interface ShipmentPackage {
  id: string;
  description: string;
  quantity: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  declaredValueMinor?: number;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  customerId: string;
  customerName?: string;

  sender: Address;
  recipient: Address;

  packages: ShipmentPackage[];

  serviceLevel: ServiceLevel;
  status: ShipmentStatus;

  originHubId: string;
  destinationHubId: string;
  originHubName?: string;
  destinationHubName?: string;

  pickupId?: string;
  tripId?: string;
  tripNumber?: string;
  driverId?: string;
  driverName?: string;
  vehicleId?: string;
  vehicleRegistration?: string;

  promisedDeliveryAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;

  totalPackages: number;
  totalWeightKg: number;
  totalVolumeCm3: number;

  shippingFeeMinor: number;
  declaredValueMinor?: number;
  codAmountMinor?: number;

  paymentStatus: PaymentStatus;
  invoiceId?: string;

  priority: Priority;
  notes?: string;

  /** Set when a shipment has breached its promised window or is otherwise late. */
  delayedReason?: string;
  failureReason?: DeliveryFailureReason;
  failureNote?: string;
  attemptCount: number;

  /** Optimistic concurrency token. */
  version: number;

  createdAt: string;
  updatedAt: string;
}

export interface TrackingEvent {
  id: string;
  shipmentId: string;
  trackingNumber: string;
  type:
    | "status_changed"
    | "assigned"
    | "reassigned"
    | "hub_operation"
    | "delivery_attempt"
    | "proof_of_delivery"
    | "note"
    | "exception"
    | "pickup";
  previousStatus?: ShipmentStatus;
  newStatus?: ShipmentStatus;
  label: string;
  location?: string;
  hubId?: string;
  actorId?: string;
  actorName?: string;
  note?: string;
  createdAt: string;
}

export interface DeliveryAttempt {
  id: string;
  shipmentId: string;
  attemptNumber: number;
  driverId: string;
  driverName?: string;
  outcome: "delivered" | "failed";
  reason?: DeliveryFailureReason;
  note?: string;
  codCollectedMinor?: number;
  attemptedAt: string;
}

export interface ProofOfDelivery {
  id: string;
  shipmentId: string;
  recipientName: string;
  relationship?: string;
  signatureRef?: string;
  photoRef?: string;
  note?: string;
  driverId: string;
  driverName?: string;
  location: string;
  deliveredAt: string;
  createdAt: string;
}

export interface Pickup {
  id: string;
  reference: string;
  shipmentId: string;
  trackingNumber: string;
  customerId: string;
  address: Address;
  status: PickupStatus;
  scheduledFor: string;
  driverId?: string;
  driverName?: string;
  vehicleId?: string;
  hubId: string;
  notes?: string;
  failureReason?: DeliveryFailureReason;
  failureNote?: string;
  startedAt?: string;
  completedAt?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TripShipment {
  shipmentId: string;
  trackingNumber: string;
  packages: number;
  weightKg: number;
  volumeCm3: number;
  addedAt: string;
  addedBy?: string;
}

export interface Trip {
  id: string;
  tripNumber: string;
  date: string;
  originHubId: string;
  originHubName?: string;
  destinationHubId: string;
  destinationHubName?: string;
  driverId?: string;
  driverName?: string;
  vehicleId?: string;
  vehicleRegistration?: string;
  shipments: TripShipment[];
  status: TripStatus;
  plannedDepartureAt?: string;
  actualDepartureAt?: string;
  arrivedAt?: string;
  completedAt?: string;
  totalPackages: number;
  totalWeightKg: number;
  capacityPackages: number;
  capacityWeightKg: number;
  /** Derived: true when load exceeds the assigned vehicle capacity. */
  overCapacity: boolean;
  notes?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentHistoryEntry {
  id: string;
  entityType: "trip" | "shipment" | "pickup";
  entityId: string;
  field: "driver" | "vehicle" | "trip" | "hub";
  previousValue?: string;
  newValue?: string;
  reason?: string;
  actorId?: string;
  actorName?: string;
  createdAt: string;
}

export interface Driver {
  id: string;
  employeeId: string;
  name: string;
  phone: string;
  email?: string;
  licenseNumber: string;
  licenseExpiry?: string;
  status: DriverStatus;
  hubId: string;
  hubName?: string;
  vehicleId?: string;
  vehicleRegistration?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  completedJobs: number;
  failedDeliveries: number;
  activeTripId?: string;
  userId?: string;
  notes?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  registrationNumber: string;
  type: "van" | "truck" | "motorcycle" | "trailer" | "car";
  capacityWeightKg: number;
  capacityPackages: number;
  capacityVolumeCm3?: number;
  status: VehicleStatus;
  hubId: string;
  hubName?: string;
  driverId?: string;
  driverName?: string;
  insuranceExpiry?: string;
  inspectionExpiry?: string;
  maintenanceDueAt?: string;
  odometerKm?: number;
  year?: number;
  notes?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleMaintenance {
  id: string;
  vehicleId: string;
  vehicleRegistration?: string;
  type: MaintenanceType;
  description: string;
  costMinor?: number;
  scheduledFor: string;
  completedAt?: string;
  status: "scheduled" | "in_progress" | "completed";
  notes?: string;
  createdAt: string;
}

export interface Hub {
  id: string;
  name: string;
  code: string;
  address: string;
  region: string;
  operatingHours: string;
  managerName?: string;
  managerPhone?: string;
  status: HubStatus;
  /** Outbound capacity per day, used for hub workload context. */
  dailyCapacity?: number;
  createdAt: string;
  updatedAt: string;
}

export interface HubOperation {
  id: string;
  hubId: string;
  shipmentId: string;
  trackingNumber: string;
  operation: HubOperationType;
  previousStatus?: ShipmentStatus;
  newStatus?: ShipmentStatus;
  note?: string;
  actorId?: string;
  actorName?: string;
  createdAt: string;
}

export interface Exception {
  id: string;
  reference: string;
  type: ExceptionType;
  severity: Severity;
  status: ExceptionStatus;
  shipmentId?: string;
  shipmentTrackingNumber?: string;
  tripId?: string;
  tripNumber?: string;
  driverId?: string;
  driverName?: string;
  vehicleId?: string;
  vehicleRegistration?: string;
  hubId?: string;
  ownerId?: string;
  ownerName?: string;
  title: string;
  description: string;
  resolution?: string;
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  version: number;
}

export interface CustomerContact {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  kind: "business" | "personal";
  contactPerson: string;
  email: string;
  phone: string;
  addresses: Address[];
  contacts: CustomerContact[];
  accountStatus: "active" | "on_hold" | "closed";
  creditTermsDays?: number;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitAmountMinor: number;
  totalMinor: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName?: string;
  shipmentIds: string[];
  lines: InvoiceLine[];
  subtotalMinor: number;
  taxRatePercent: number;
  taxMinor: number;
  discountMinor: number;
  totalMinor: number;
  amountPaidMinor: number;
  balanceMinor: number;
  currency: string;
  status: InvoiceStatus;
  dueAt: string;
  issuedAt?: string;
  paidAt?: string;
  notes?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  reference: string;
  invoiceId?: string;
  invoiceNumber?: string;
  shipmentId?: string;
  customerId: string;
  customerName?: string;
  amountMinor: number;
  currency: string;
  method: PaymentMethod;
  /** Who physically collected cash — driver, office or finance. */
  collectedByRole?: "driver" | "finance" | "customer" | "system";
  collectedById?: string;
  receivedAt: string;
  recordedBy?: string;
  notes?: string;
  /** Internal accounting transfer id used for webhook idempotency. */
  externalId?: string;
  status: "recorded" | "void";
  createdAt: string;
}

export interface CodRecord {
  id: string;
  shipmentId: string;
  trackingNumber: string;
  customerId: string;
  customerName?: string;
  expectedMinor: number;
  collectedMinor: number;
  driverCollectedMinor: number;
  status: CodStatus;
  currency: string;
  reconciledAt?: string;
  reconciledBy?: string;
  discrepancyReason?: string;
  notes?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  severity: Severity;
  title: string;
  body: string;
  /** Where the user should go to act on this. */
  actionHref: string;
  actionLabel: string;
  audienceRole?: string;
  userId?: string;
  readAt?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId: string;
  entityLabel?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: UserRoleKey;
  status: UserStatus;
  hubId?: string;
  driverId?: string;
  customerId?: string;
  phone?: string;
  emailVerifiedAt?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRoleKey =
  | "administrator"
  | "operations_manager"
  | "dispatcher"
  | "warehouse"
  | "driver"
  | "support"
  | "finance"
  | "customer";

export interface RoleRecord {
  id: string;
  key: UserRoleKey;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  updatedAt: string;
}

export interface SystemSettings {
  id: "system";
  companyName: string;
  tagline: string;
  currency: string;
  timezone: string;
  defaultOriginHubId?: string;
  defaultServiceLevel: ServiceLevel;
  /** Hours after promisedDeliveryAt before a shipment is flagged delayed. */
  delayThresholdHours: number;
  /** Days before a document expiry to raise a compliance notification. */
  complianceWarningDays: number;
  /** Auto-generated invoice numbering prefix. */
  invoicePrefix: string;
  codEnabled: boolean;
  /** Soft capacity utilisation (0-1) above which a trip is flagged as loaded. */
  capacityWarningRatio: number;
  demoDataNotice: string;
  updatedAt: string;
}

export interface SearchResult {
  kind:
    | "shipment"
    | "customer"
    | "invoice"
    | "trip"
    | "driver"
    | "vehicle"
    | "exception";
  id: string;
  label: string;
  sublabel?: string;
  href: string;
}

export interface PageResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}
