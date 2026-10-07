import { z } from "zod";
import {
  PAYMENT_STATUSES,
  SERVICE_LEVELS,
  SHIPMENT_STATUSES,
} from "@/types/domain";
import { addressSchema, moneyField, packageSchema, prioritySchema } from "./common";

/** Client form shape. Shipping charges are deliberately absent — the server computes them. */
export const shipmentCreateSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  serviceLevel: z.enum(SERVICE_LEVELS),
  priority: prioritySchema,
  originHubId: z.string().min(1, "Select an origin hub"),
  destinationHubId: z.string().min(1, "Select a destination hub"),
  sender: addressSchema,
  recipient: addressSchema,
  packages: z.array(packageSchema).min(1, "Add at least one package"),
  promisedDeliveryAt: z
    .string()
    .refine((value) => value !== "" && !Number.isNaN(Date.parse(value)), {
      message: "Set a promised delivery date/time",
    }),
  codAmount: moneyField.optional(),
  declaredValue: moneyField.optional(),
  prepaid: z.boolean().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type ShipmentCreateInput = z.infer<typeof shipmentCreateSchema>;

export const shipmentUpdateSchema = shipmentCreateSchema.extend({
  shipmentId: z.string().min(1, "Shipment is required"),
  expectedVersion: z.coerce.number().int(),
});
export type ShipmentUpdateInput = z.infer<typeof shipmentUpdateSchema>;

export const shipmentStatusSchema = z.object({
  shipmentId: z.string().min(1),
  to: z.enum(SHIPMENT_STATUSES),
  /** Optimistic concurrency guard: rejects a stale transition. */
  expectedVersion: z.coerce.number().int(),
  reason: z.string().trim().max(1000).optional(),
  hubId: z.string().optional(),
  location: z.string().trim().max(160).optional(),
});
export type ShipmentStatusInput = z.infer<typeof shipmentStatusSchema>;

export const shipmentNoteSchema = z.object({
  shipmentId: z.string().min(1),
  note: z.string().trim().min(2, "Write a note").max(2000),
});

export const shipmentBulkSchema = z.object({
  action: z.enum(["priority", "assign_hub", "export"]),
  shipmentIds: z.array(z.string().min(1)).min(1, "Select at least one shipment"),
  priority: prioritySchema.optional(),
  hubId: z.string().optional(),
});

export const shipmentFilterSchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.string().optional(),
  hubId: z.string().optional(),
  driverId: z.string().optional(),
  tripId: z.string().optional(),
  customerId: z.string().optional(),
  serviceLevel: z.string().optional(),
  paymentStatus: z.string().optional(),
  exceptionOnly: z.string().optional(),
  delayedOnly: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.string().optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

export type ShipmentFilterInput = z.infer<typeof shipmentFilterSchema>;

export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
