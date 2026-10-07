import { z } from "zod";
import { INVOICE_STATUSES, PAYMENT_METHODS } from "@/types/domain";
import { dateField, moneyField } from "./common";

export const invoiceLineSchema = z.object({
  description: z.string().trim().min(2, "Line description is required").max(200),
  quantity: z.coerce.number().int().min(1).max(10000),
  unitAmount: moneyField,
});

/**
 * Client never supplies a total. The server derives subtotal, tax, discount and
 * the payable balance from lines + shipments.
 */
export const invoiceSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  shipmentIds: z.array(z.string().min(1)).default([]),
  lines: z.array(invoiceLineSchema).min(1, "Add at least one line"),
  taxRatePercent: z.coerce.number().min(0).max(100).default(0),
  discount: moneyField.optional(),
  dueAt: z.string().min(1, "Set a due date"),
  notes: z.string().trim().max(2000).optional(),
});
export type InvoiceInput = z.infer<typeof invoiceSchema>;

export const invoiceStatusSchema = z.object({
  invoiceId: z.string().min(1),
  status: z.enum(INVOICE_STATUSES),
  expectedVersion: z.coerce.number().int(),
  reason: z.string().trim().max(1000).optional(),
});

export const paymentSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  invoiceId: z.string().optional(),
  shipmentId: z.string().optional(),
  amount: moneyField.refine((value) => value !== "", "Amount is required"),
  method: z.enum(PAYMENT_METHODS),
  receivedAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Set a date"),
  reference: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type PaymentInput = z.infer<typeof paymentSchema>;

export const codReconciliationSchema = z
  .object({
    codId: z.string().min(1),
    expectedMinor: z.coerce.number().int().min(0),
    settledMinor: z.coerce.number().int().min(0),
    /** Required whenever the settled amount does not match what was collected. */
    discrepancyReason: z.string().trim().max(1000).optional(),
    expectedVersion: z.coerce.number().int(),
  })
  .refine(
    (input) => input.settledMinor <= input.expectedMinor,
    { path: ["settledMinor"], message: "Settled amount cannot exceed the expected COD" },
  )
  .refine(
    (input) =>
      input.settledMinor === input.expectedMinor ||
      (input.discrepancyReason && input.discrepancyReason.length >= 5),
    {
      path: ["discrepancyReason"],
      message: "Explain the difference between expected and settled amounts",
    },
  );
export type CodReconciliationInput = z.infer<typeof codReconciliationSchema>;

export const codCollectSchema = z.object({
  shipmentId: z.string().min(1),
  amount: moneyField,
  note: z.string().trim().max(1000).optional(),
});
