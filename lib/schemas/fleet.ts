import { z } from "zod";
import {
  DRIVER_STATUSES,
  EXCEPTION_STATUSES,
  EXCEPTION_TYPES,
  HUB_STATUSES,
  SEVERITIES,
  VEHICLE_STATUSES,
} from "@/types/domain";
import { dateField, optionalEmail, positiveNumberField } from "./common";

export const driverSchema = z.object({
  name: z.string().trim().min(2, "Driver name is required").max(120),
  phone: z.string().trim().min(7, "Phone number is required").max(24),
  email: optionalEmail,
  licenseNumber: z.string().trim().min(3, "Licence number is required").max(60),
  licenseExpiry: dateField,
  status: z.enum(DRIVER_STATUSES),
  hubId: z.string().min(1, "Select a hub"),
  emergencyContactName: z.string().trim().max(120).optional(),
  emergencyContactPhone: z.string().trim().max(24).optional(),
  notes: z.string().trim().max(2000).optional(),
  expectedVersion: z.coerce.number().int().optional(),
});
export type DriverInput = z.infer<typeof driverSchema>;

export const vehicleSchema = z.object({
  registrationNumber: z
    .string()
    .trim()
    .min(3, "Registration number is required")
    .max(30)
    .transform((value) => value.toUpperCase()),
  type: z.enum(["van", "truck", "motorcycle", "trailer", "car"]),
  capacityWeightKg: positiveNumberField,
  capacityPackages: positiveNumberField,
  status: z.enum(VEHICLE_STATUSES),
  hubId: z.string().min(1, "Select a hub"),
  insuranceExpiry: dateField,
  inspectionExpiry: dateField,
  maintenanceDueAt: dateField,
  odometerKm: z.string().optional(),
  year: z.string().optional(),
  notes: z.string().trim().max(2000).optional(),
  expectedVersion: z.coerce.number().int().optional(),
});
export type VehicleInput = z.infer<typeof vehicleSchema>;

export const hubSchema = z.object({
  name: z.string().trim().min(2, "Hub name is required").max(120),
  code: z
    .string()
    .trim()
    .min(2, "Code is required")
    .max(10)
    .transform((value) => value.toUpperCase()),
  address: z.string().trim().min(3, "Address is required").max(240),
  region: z.string().trim().min(2, "Region is required").max(100),
  operatingHours: z.string().trim().min(3, "Operating hours are required").max(120),
  managerName: z.string().trim().max(120).optional(),
  managerPhone: z.string().trim().max(24).optional(),
  status: z.enum(HUB_STATUSES),
  dailyCapacity: z.coerce.number().int().min(1).optional(),
});
export type HubInput = z.infer<typeof hubSchema>;

export const exceptionCreateSchema = z
  .object({
    type: z.enum(EXCEPTION_TYPES),
    severity: z.enum(SEVERITIES),
    title: z.string().trim().min(4, "Summarise the problem").max(160),
    description: z.string().trim().min(10, "Give the team enough context").max(4000),
    shipmentId: z.string().optional(),
    tripId: z.string().optional(),
    driverId: z.string().optional(),
    vehicleId: z.string().optional(),
    hubId: z.string().optional(),
    dueAt: dateField.optional(),
    ownerId: z.string().optional(),
  })
  .refine(
    (input) =>
      Boolean(input.shipmentId || input.tripId || input.driverId || input.vehicleId || input.hubId),
    { path: ["shipmentId"], message: "Link the exception to a shipment, trip, driver, vehicle or hub" },
  );

export type ExceptionCreateInput = z.infer<typeof exceptionCreateSchema>;

export const exceptionUpdateSchema = z.object({
  exceptionId: z.string().min(1),
  status: z.enum(EXCEPTION_STATUSES),
  severity: z.enum(SEVERITIES),
  ownerId: z.string().optional(),
  resolution: z.string().trim().max(4000).optional(),
  expectedVersion: z.coerce.number().int(),
});
export type ExceptionUpdateInput = z.infer<typeof exceptionUpdateSchema>;

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Customer name is required").max(160),
  kind: z.enum(["business", "personal"]),
  contactPerson: z.string().trim().min(2, "Contact person is required").max(120),
  email: z.email("Enter a valid email address"),
  phone: z.string().trim().min(7, "Phone number is required").max(24),
  accountStatus: z.enum(["active", "on_hold", "closed"]),
  creditTermsDays: z.coerce.number().int().min(0).max(365).optional(),
  street: z.string().trim().min(3, "Street is required").max(200),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z.string().trim().min(1, "State is required").max(100),
  country: z.string().trim().min(1).max(100).default("Nigeria"),
  notes: z.string().trim().max(2000).optional(),
});
export type CustomerInput = z.infer<typeof customerSchema>;

/** URL filter shape for the exception queue. */
export const exceptionFilterSchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.string().optional(),
  severity: z.string().optional(),
  type: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.string().optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});
export type ExceptionFilterInput = z.infer<typeof exceptionFilterSchema>;

/** URL filter shape shared by the fleet directory pages. */
export const fleetFilterSchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.string().optional(),
  hubId: z.string().optional(),
  sort: z.string().optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});
export type FleetFilterInput = z.infer<typeof fleetFilterSchema>;
