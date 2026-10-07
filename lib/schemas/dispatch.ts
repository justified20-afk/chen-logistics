import { z } from "zod";
import {
  DELIVERY_FAILURE_REASONS,
  HUB_OPERATIONS,
  PICKUP_STATUSES,
  TRIP_STATUSES,
} from "@/types/domain";
import { dateField, failureReasonSchema } from "./common";

export const tripCreateSchema = z
  .object({
    originHubId: z.string().min(1, "Select an origin hub"),
    destinationHubId: z.string().min(1, "Select a destination hub"),
    date: z.string().min(1, "Set the trip date"),
    plannedDepartureAt: dateField,
    driverId: z.string().optional(),
    vehicleId: z.string().optional(),
    shipmentIds: z.array(z.string().min(1)).default([]),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((trip) => trip.originHubId !== trip.destinationHubId, {
    path: ["destinationHubId"],
    message: "Origin and destination hub must differ",
  });

export type TripCreateInput = z.infer<typeof tripCreateSchema>;

export const tripUpdateSchema = tripCreateSchema.extend({
  tripId: z.string().min(1),
  status: z.enum(TRIP_STATUSES).optional(),
  expectedVersion: z.coerce.number().int(),
  reason: z.string().trim().max(1000).optional(),
});

export const tripAssignmentSchema = z.object({
  tripId: z.string().min(1),
  driverId: z.string().optional(),
  vehicleId: z.string().optional(),
  expectedVersion: z.coerce.number().int(),
  reason: z.string().trim().max(1000).optional(),
});
export type TripAssignmentInput = z.infer<typeof tripAssignmentSchema>;

export const tripShipmentSelectionSchema = z.object({
  tripId: z.string().min(1),
  shipmentIds: z.array(z.string().min(1)).min(1, "Select at least one shipment"),
  expectedVersion: z.coerce.number().int(),
});

export const tripStatusSchema = z.object({
  tripId: z.string().min(1),
  to: z.enum(TRIP_STATUSES),
  expectedVersion: z.coerce.number().int(),
  reason: z.string().trim().max(1000).optional(),
  location: z.string().trim().max(160).optional(),
});

export const pickupUpdateSchema = z.object({
  pickupId: z.string().min(1),
  status: z.enum(PICKUP_STATUSES),
  expectedVersion: z.coerce.number().int(),
  reason: z.string().trim().max(1000).optional(),
  driverId: z.string().optional(),
});

export const hubOperationSchema = z
  .object({
    trackingNumber: z.string().trim().min(3, "Scan or type a tracking number"),
    operation: z.enum(HUB_OPERATIONS),
    hubId: z.string().min(1),
    note: z.string().trim().max(1000).optional(),
  })
  .refine(
    (input) => input.operation !== "damaged" || (input.note && input.note.length >= 5),
    { path: ["note"], message: "Describe the damage for a damaged record" },
  )
  .refine(
    (input) => input.operation !== "missing" || (input.note && input.note.length >= 5),
    { path: ["note"], message: "Describe what is missing" },
  );

export type HubOperationInput = z.infer<typeof hubOperationSchema>;

export const deliveryAttemptSchema = z
  .object({
    shipmentId: z.string().min(1),
    outcome: z.enum(["delivered", "failed"]),
    reason: failureReasonSchema.optional(),
    note: z.string().trim().max(1000).optional(),
    codCollected: z.string().optional(),
    recipientName: z.string().trim().max(120).optional(),
    relationship: z.string().trim().max(60).optional(),
    signatureRef: z.string().trim().max(200).optional(),
    photoRef: z.string().trim().max(300).optional(),
    expectedVersion: z.coerce.number().int(),
  })
  .refine((input) => input.outcome !== "failed" || Boolean(input.reason), {
    path: ["reason"],
    message: "Select a structured failure reason",
  })
  .refine(
    (input) => input.reason !== "other" || (input.note && input.note.length >= 5),
    { path: ["note"], message: "Explain the reason for “other”" },
  )
  .refine(
    (input) => input.outcome !== "delivered" || (input.recipientName && input.recipientName.length >= 2),
    { path: ["recipientName"], message: "Recipient name is required for delivery" },
  );

export type DeliveryAttemptInput = z.infer<typeof deliveryAttemptSchema>;

export const proofOfDeliverySchema = z.object({
  shipmentId: z.string().min(1),
  recipientName: z.string().trim().min(2, "Recipient name is required").max(120),
  relationship: z.string().trim().max(60).optional(),
  signatureRef: z.string().trim().max(200).optional(),
  photoRef: z.string().trim().max(300).optional(),
  note: z.string().trim().max(1000).optional(),
  location: z.string().trim().min(2, "Where was it delivered?").max(160),
  expectedVersion: z.coerce.number().int(),
});
export type ProofOfDeliveryInput = z.infer<typeof proofOfDeliverySchema>;

export const failureReasons = DELIVERY_FAILURE_REASONS;
