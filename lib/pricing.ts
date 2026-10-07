import type { ServiceLevel } from "@/types/domain";

/**
 * Server-side rate card. The client never supplies a shipping charge — every
 * fee, discount and total is recomputed here before it is persisted.
 *
 * Amounts are integer minor units (kobo).
 */
export const RATE_CARD: Record<
  ServiceLevel,
  { baseMinor: number; perKgMinor: number; sameDaySurchargeMinor: number }
> = {
  standard: { baseMinor: 250000, perKgMinor: 15000, sameDaySurchargeMinor: 0 },
  express: { baseMinor: 400000, perKgMinor: 25000, sameDaySurchargeMinor: 0 },
  same_day: { baseMinor: 650000, perKgMinor: 40000, sameDaySurchargeMinor: 0 },
};

/** Cash-on-delivery handling, charged once per COD shipment. */
export const COD_HANDLING_MINOR = 15000;

/** 7.5% VAT applied to invoices. */
export const TAX_RATE_PERCENT = 7.5;

export function computeShippingFee(input: {
  serviceLevel: ServiceLevel;
  totalWeightKg: number;
  codAmountMinor?: number;
}): number {
  const rate = RATE_CARD[input.serviceLevel] ?? RATE_CARD.standard;
  const weight = Math.max(0, input.totalWeightKg);
  const codHandling = (input.codAmountMinor ?? 0) > 0 ? COD_HANDLING_MINOR : 0;
  return rate.baseMinor + Math.ceil(weight) * rate.perKgMinor + codHandling;
}

/** Honest estimated-transit label derived from service level — not a fake ETA engine. */
export function promisedTransitHours(serviceLevel: ServiceLevel): number {
  if (serviceLevel === "same_day") return 8;
  if (serviceLevel === "express") return 30;
  return 72;
}

export function computeInvoiceTotals(input: {
  lines: { quantity: number; unitAmountMinor: number }[];
  taxRatePercent: number;
  discountMinor: number;
}) {
  const subtotalMinor = input.lines.reduce(
    (sum, line) => sum + Math.round(line.unitAmountMinor * line.quantity),
    0,
  );
  const discountMinor = Math.min(Math.max(0, Math.round(input.discountMinor)), subtotalMinor);
  const taxMinor = Math.round(((subtotalMinor - discountMinor) * input.taxRatePercent) / 100);
  const totalMinor = subtotalMinor - discountMinor + taxMinor;
  return { subtotalMinor, discountMinor, taxMinor, totalMinor };
}
