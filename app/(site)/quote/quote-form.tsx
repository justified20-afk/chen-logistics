"use client";

/**
 * Get a Quote — public quote request form.
 *
 * Validated client-side; in this demonstration build the
 * request is NOT transmitted anywhere — the confirmation is
 * generated locally and says so.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Field, FormMessage } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { COUNTRIES } from "@/lib/site-content";

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a phone number we can reach you on"),
  company: z.string().trim().optional(),
  serviceLevel: z.enum(["standard", "express", "same_day"], {
    error: "Choose a service level",
  }),
  origin: z.string().min(1, "Choose an origin country"),
  destinationCity: z
    .string()
    .trim()
    .min(2, "Enter the destination city"),
  destinationState: z.string().trim().min(2, "Enter the destination state"),
  weightKg: z.coerce
    .number({ error: "Enter the parcel weight" })
    .gt(0, "Weight must be greater than 0 kg"),
  contents: z
    .string()
    .trim()
    .min(3, "Briefly describe the contents")
    .max(500, "Keep the description under 500 characters"),
  notes: z.string().trim().optional(),
});

const SERVICE_LABELS: Record<string, string> = {
  standard: "Standard — 2–5 working days",
  express: "ChenFaster Express — 24–48 hours",
  same_day: "Same Day — Lagos, Abuja, PH",
};

const EMPTY: Record<string, string> = {
  fullName: "",
  email: "",
  phone: "",
  company: "",
  serviceLevel: "",
  origin: "",
  destinationCity: "",
  destinationState: "",
  weightKg: "",
  contents: "",
  notes: "",
};

export function QuoteForm() {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const update = (field: string, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const originOptions = useMemo(
    () =>
      [
        { value: "nigeria", label: "Nigeria (domestic)" },
        ...COUNTRIES.map((country) => ({
          value: country.slug,
          label: country.name,
        })),
      ],
    [],
  );

  const serviceOptions = useMemo(
    () =>
      Object.entries(SERVICE_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    [],
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]?.toString();
        if (field && !next[field]) next[field] = issue.message;
      }
      setErrors(next);
      return;
    }

    setPending(true);
    // Demonstration build: no request leaves the browser.
    window.setTimeout(() => {
      const ref = `CH-Q-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      setReference(ref);
      setPending(false);
    }, 500);
  };

  if (reference) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-success/30 bg-success/5 p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-success text-success-foreground">
          <CheckCircle2 className="size-7" aria-hidden />
        </span>
        <h2 className="heading mt-5 text-2xl font-semibold tracking-tight text-foreground">
          Quote request received
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Your reference is{" "}
          <span className="font-mono font-semibold text-foreground">
            {reference}
          </span>
          . A Chen Logistics representative will contact you within one
          business day to confirm pricing.
        </p>
        <p className="mt-4 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
          This is a demonstration build — your request was generated
          locally and was not transmitted.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">          <Button onClick={() => router.push("/tracking")}>
            Track a shipment
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setForm(EMPTY);
              setErrors({});
              setReference(null);
            }}
          >
            Submit another request
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="quote-name"
          label="Full name"
          htmlFor="quote-name"
          required
          error={errors.fullName}
        >
          <Input
            id="quote-name"
            value={form.fullName}
            onChange={(event) => update("fullName", event.target.value)}
            autoComplete="name"
          />
        </Field>
        <Field
          id="quote-email"
          label="Email"
          htmlFor="quote-email"
          required
          error={errors.email}
        >
          <Input
            id="quote-email"
            type="email"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            autoComplete="email"
          />
        </Field>
        <Field
          id="quote-phone"
          label="Phone"
          htmlFor="quote-phone"
          required
          error={errors.phone}
        >
          <Input
            id="quote-phone"
            type="tel"
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
            autoComplete="tel"
            placeholder="+234 ..."
          />
        </Field>
        <Field
          id="quote-company"
          label="Company"
          htmlFor="quote-company"
          hint="Optional — for business and corporate accounts"
          error={errors.company}
        >
          <Input
            id="quote-company"
            value={form.company}
            onChange={(event) => update("company", event.target.value)}
            autoComplete="organization"
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="quote-service"
          label="Service level"
          htmlFor="quote-service"
          required
          error={errors.serviceLevel}
        >
          <Select
            value={form.serviceLevel}
            onValueChange={(value) => update("serviceLevel", value)}
          >
            <SelectTrigger id="quote-service" className="h-11">
              <SelectValue placeholder="Select a service level" />
            </SelectTrigger>
            <SelectContent>
              {serviceOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          id="quote-origin"
          label="Origin"
          htmlFor="quote-origin"
          required
          error={errors.origin}
        >
          <Select
            value={form.origin}
            onValueChange={(value) => update("origin", value)}
          >
            <SelectTrigger id="quote-origin" className="h-11">
              <SelectValue placeholder="Where does it ship from?" />
            </SelectTrigger>
            <SelectContent>
              {originOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          id="quote-city"
          label="Destination city"
          htmlFor="quote-city"
          required
          error={errors.destinationCity}
        >
          <Input
            id="quote-city"
            value={form.destinationCity}
            onChange={(event) => update("destinationCity", event.target.value)}
          />
        </Field>
        <Field
          id="quote-state"
          label="Destination state"
          htmlFor="quote-state"
          required
          error={errors.destinationState}
        >
          <Input
            id="quote-state"
            value={form.destinationState}
            onChange={(event) => update("destinationState", event.target.value)}
          />
        </Field>
        <Field
          id="quote-weight"
          label="Chargeable weight (kg)"
          htmlFor="quote-weight"
          required
          hint="Rounded up to the next whole kilogram"
          error={errors.weightKg}
        >
          <Input
            id="quote-weight"
            type="number"
            min="0.1"
            step="0.1"
            inputMode="decimal"
            value={form.weightKg}
            onChange={(event) => update("weightKg", event.target.value)}
          />
        </Field>
        <Field
          id="quote-contents"
          label="Contents"
          htmlFor="quote-contents"
          required
          hint="e.g. “2 cartons of retail goods”"
          error={errors.contents}
        >
          <Input
            id="quote-contents"
            value={form.contents}
            onChange={(event) => update("contents", event.target.value)}
          />
        </Field>
      </div>

      <Field
        id="quote-notes"
        label="Notes"
        htmlFor="quote-notes"
        hint="Optional — pickup window, COD amount, access notes…"
        error={errors.notes}
      >
        <Textarea
          id="quote-notes"
          rows={4}
          value={form.notes}
          onChange={(event) => update("notes", event.target.value)}
        />
      </Field>

      <FormMessage message={errors.form} />

      <div className="flex flex-wrap items-center gap-3">        <Button type="submit" disabled={pending} className="h-11 px-6">
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Send className="size-4" aria-hidden />
          )}
          Request my quote
        </Button>
        <p className="text-xs text-muted-foreground">
          Demonstration build — requests are validated locally and
          are not transmitted.
        </p>
      </div>
    </form>
  );
}
