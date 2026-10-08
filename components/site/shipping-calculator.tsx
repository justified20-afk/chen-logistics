"use client";

/**
 * Shipping Price Calculator — domestic Nigeria rate card.
 *
 * Uses the same server-side rate card the quoting engine uses
 * (lib/pricing.ts). The estimate is computed here for display only;
 * any real booking re-derives the fee on the server.
 */
import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, Loader2 } from "lucide-react";
import {
  COD_HANDLING_MINOR,
  RATE_CARD,
  TAX_RATE_PERCENT,
  computeShippingFee,
  promisedTransitHours,
} from "@/lib/pricing";
import {
  formatMoney,
  toMinor,
} from "@/lib/money";
import type { ServiceLevel } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SERVICE_OPTIONS: {
  value: ServiceLevel;
  label: string;
  note: string;
}[] = [
  { value: "standard", label: "Standard", note: "2–5 working days" },
  { value: "express", label: "ChenFaster Express", note: "24–48 hours" },
  { value: "same_day", label: "Same Day", note: "Lagos, Abuja, PH" },
];

function hoursToLabel(hours: number): string {
  if (hours < 24) return `${hours} hours`;
  return `${Math.round(hours / 24)} working days`;
}

export function ShippingCalculator() {
  const [serviceLevel, setServiceLevel] = useState<ServiceLevel>("standard");
  const [weight, setWeight] = useState("1");
  const [hasCod, setHasCod] = useState(false);
  const [codAmount, setCodAmount] = useState("");
  const [calculating, setCalculating] = useState(false);

  const weightKg = Number(weight);
  const weightValid = Number.isFinite(weightKg) && weightKg > 0;
  const codMinor = hasCod ? toMinor(Number(codAmount || 0)) : 0;
  const codValid = !hasCod || Number.isFinite(Number(codAmount || 0));

  const estimate = useMemo(() => {
    if (!weightValid || !codValid) return null;
    const rate = RATE_CARD[serviceLevel];
    const roundedWeight = Math.ceil(Math.max(0, weightKg));
    const base = rate.baseMinor;
    const weightCharge = roundedWeight * rate.perKgMinor;
    const codHandling = codMinor > 0 ? COD_HANDLING_MINOR : 0;
    // Same fee the booking engine charges — computed by the shared
    // rate module, not a second formula.
    const subtotal = computeShippingFee({
      serviceLevel,
      totalWeightKg: weightKg,
      codAmountMinor: codMinor,
    });
    const tax = Math.round((subtotal * TAX_RATE_PERCENT) / 100);
    return {
      base,
      weightCharge,
      codHandling,
      subtotal,
      tax,
      total: subtotal + tax,
      transit: promisedTransitHours(serviceLevel),
      roundedWeight,
    };
  }, [serviceLevel, weightKg, weightValid, codMinor, codValid]);

  const calculate = () => {
    setCalculating(true);
    // The fee is already computed; a brief pause keeps the UX honest
    // about "calculating" without faking a slow service.
    window.setTimeout(() => setCalculating(false), 350);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid lg:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-6 p-6">
          <div className="space-y-2">
            <Label>Service level</Label>
            <div className="grid gap-2">
              {SERVICE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setServiceLevel(option.value)}
                  aria-pressed={serviceLevel === option.value}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                    serviceLevel === option.value
                      ? "border-primary bg-primary/5"
                      : "border-input hover:bg-accent/60"
                  }`}
                >
                  <span>
                    <span className="block text-sm font-semibold text-foreground">
                      {option.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {option.note}
                    </span>
                  </span>
                  <span
                    className={`grid size-5 place-items-center rounded-full border ${
                      serviceLevel === option.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input"
                    }`}
                    aria-hidden
                  >
                    {serviceLevel === option.value ? (
                      <CheckCircle2 className="size-3.5" />
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="calc-weight">Chargeable weight (kg)</Label>
            <Input
              id="calc-weight"
              type="number"
              min="0.1"
              step="0.1"
              inputMode="decimal"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Charged per whole kilogram, rounded up.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2.5 text-sm font-medium">
              <input
                type="checkbox"
                checked={hasCod}
                onChange={(event) => setHasCod(event.target.checked)}
                className="size-4 rounded border-input accent-[color:var(--brand)]"
              />
              Cash on delivery
            </label>
            {hasCod ? (
              <div className="space-y-1.5">
                <Label htmlFor="calc-cod">COD amount (₦)</Label>
                <Input
                  id="calc-cod"
                  type="number"
                  min="0"
                  step="100"
                  inputMode="numeric"
                  value={codAmount}
                  onChange={(event) => setCodAmount(event.target.value)}
                  placeholder="0.00"
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  A one-time {formatMoney(COD_HANDLING_MINOR)} handling fee
                  applies to COD shipments.
                </p>
              </div>
            ) : null}
          </div>

          <Button
            onClick={calculate}
            disabled={!weightValid || !codValid || calculating}
            className="h-11 w-full sm:w-auto"
          >
            {calculating ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            Calculate
          </Button>
        </div>

        {/* Result */}
        <div className="border-t border-border bg-muted/40 p-6 lg:border-l lg:border-t-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Estimate
          </p>
          {estimate ? (
            <>
              <p className="mt-2 text-4xl font-bold tracking-tight text-foreground">
                {formatMoney(estimate.total)}
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-success">
                <Clock3 className="size-3.5" aria-hidden />
                Promised transit: {hoursToLabel(estimate.transit)}
              </p>

              <dl className="mt-6 space-y-2.5 border-t border-border pt-5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Base fee</dt>
                  <dd className="tabular-nums">
                    {formatMoney(estimate.base)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    Weight ({estimate.roundedWeight} kg)
                  </dt>
                  <dd className="tabular-nums">
                    {formatMoney(estimate.weightCharge)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">COD handling</dt>
                  <dd className="tabular-nums">
                    {formatMoney(estimate.codHandling)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-border pt-2.5">
                  <dt className="font-medium">Subtotal</dt>
                  <dd className="tabular-nums font-medium">
                    {formatMoney(estimate.subtotal)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    VAT ({TAX_RATE_PERCENT}%)
                  </dt>
                  <dd className="tabular-nums">
                    {formatMoney(estimate.tax)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-border pt-2.5">
                  <dt className="font-semibold">Total</dt>
                  <dd className="tabular-nums font-semibold text-primary">
                    {formatMoney(estimate.total)}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Enter a valid weight
              {hasCod ? " and COD amount" : ""} to see the estimate.
            </p>
          )}
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            Estimate from the standard domestic Nigeria rate card. Final
            pricing is confirmed at booking and re-derived server-side.
          </p>
        </div>
      </div>
    </div>
  );
}
