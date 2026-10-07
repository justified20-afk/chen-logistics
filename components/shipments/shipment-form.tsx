"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FormMessage } from "@/components/forms/field";
import { formatMoney, parseMoneyToMinor } from "@/lib/money";
import { RATE_CARD, computeShippingFee } from "@/lib/pricing";
import { shipmentCreateSchema, type ShipmentCreateInput } from "@/lib/schemas/shipment";
import { createShipmentAction, updateShipmentAction } from "@/lib/actions/shipments";
import { PRIORITIES, SERVICE_LEVELS, type Shipment } from "@/types/domain";

export interface SelectOption {
  value: string;
  label: string;
}

function toLocalInput(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultsFrom(shipment?: Shipment): Partial<ShipmentCreateInput> {
  if (!shipment) {
    const promised = new Date(Date.now() + 72 * 3600_000);
    return {
      serviceLevel: "standard",
      priority: "normal",
      packages: [{ description: "", quantity: 1, weightKg: 1, lengthCm: 10, widthCm: 10, heightCm: 10 }],
      sender: { name: "", phone: "", street: "", city: "", state: "", country: "Nigeria" },
      recipient: { name: "", phone: "", street: "", city: "", state: "", country: "Nigeria" },
      promisedDeliveryAt: toLocalInput(promised.toISOString()),
      prepaid: false,
    };
  }

  return {
    customerId: shipment.customerId,
    serviceLevel: shipment.serviceLevel,
    priority: shipment.priority,
    originHubId: shipment.originHubId,
    destinationHubId: shipment.destinationHubId,
    sender: { ...shipment.sender },
    recipient: { ...shipment.recipient },
    packages: shipment.packages.map((pkg) => ({
      description: pkg.description,
      quantity: pkg.quantity,
      weightKg: pkg.weightKg,
      lengthCm: pkg.lengthCm,
      widthCm: pkg.widthCm,
      heightCm: pkg.heightCm,
      declaredValue: pkg.declaredValueMinor ? String(pkg.declaredValueMinor / 100) : "",
    })),
    promisedDeliveryAt: toLocalInput(shipment.promisedDeliveryAt),
    codAmount: shipment.codAmountMinor ? String(shipment.codAmountMinor / 100) : "",
    declaredValue: shipment.declaredValueMinor ? String(shipment.declaredValueMinor / 100) : "",
    prepaid: shipment.paymentStatus === "paid",
    notes: shipment.notes ?? "",
  };
}

export function ShipmentForm({
  customers,
  hubs,
  shipment,
}: {
  customers: SelectOption[];
  hubs: SelectOption[];
  shipment?: Shipment;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const defaultValues = useMemo(() => {
    const base = defaultsFrom(shipment);
    if (!shipment && customers.length === 1) base.customerId = customers[0].value;
    return base;
  }, [shipment, customers]);

  const form = useForm<ShipmentCreateInput>({
    resolver: standardSchemaResolver(shipmentCreateSchema) as Resolver<ShipmentCreateInput>,
    defaultValues: defaultValues as ShipmentCreateInput,
    mode: "onBlur",
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "packages" });

  const watch = form.watch();
  const estimate = useMemo(() => {
    const weight = (watch.packages ?? []).reduce(
      (sum, pkg) => sum + (Number(pkg.weightKg) || 0) * (Number(pkg.quantity) || 0),
      0,
    );
    const cod = parseMoneyToMinor(watch.codAmount ?? "") ?? 0;
    return computeShippingFee({
      serviceLevel: watch.serviceLevel ?? "standard",
      totalWeightKg: weight,
      codAmountMinor: cod,
    });
  }, [watch.packages, watch.codAmount, watch.serviceLevel]);

  const applyErrors = (error: { error: string; fieldErrors?: Record<string, string[]> }) => {
    setServerError(error.error);
    if (error.fieldErrors) {
      for (const [key, messages] of Object.entries(error.fieldErrors)) {
        form.setError(key as keyof ShipmentCreateInput, { type: "server", message: messages[0] });
      }
    }
  };

  const onSubmit = async (values: ShipmentCreateInput) => {
    setPending(true);
    setServerError(null);

    if (shipment) {
      const payload = await updateShipmentAction({
        ...values,
        shipmentId: shipment.id,
        expectedVersion: shipment.version,
      });
      setPending(false);
      if (!payload.ok) {
        applyErrors(payload);
        if (payload.conflict) {
          toast.error(payload.error);
          setTimeout(() => router.refresh(), 1200);
        }
        return;
      }
      toast.success("Shipment updated");
      router.push(`/shipments/${shipment.id}`);
      router.refresh();
      return;
    }

    const payload = await createShipmentAction(values);
    setPending(false);
    if (!payload.ok) {
      applyErrors(payload);
      return;
    }
    toast.success(`Shipment ${payload.data.trackingNumber} created`);
    router.push(`/shipments/${payload.data.id}`);
    router.refresh();
  };

  const errors = form.formState.errors;

  const addressFields = (kind: "sender" | "recipient", legend: string) => (
    <fieldset className="space-y-3 rounded-lg border border-border p-4">
      <legend className="px-1 text-sm font-semibold">{legend}</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor={`${kind}-name`} error={errors[kind]?.name?.message} required>
          <Input id={`${kind}-name`} {...form.register(`${kind}.name`)} />
        </Field>
        <Field label="Phone" htmlFor={`${kind}-phone`} error={errors[kind]?.phone?.message} required>
          <Input id={`${kind}-phone`} type="tel" placeholder="+234…" {...form.register(`${kind}.phone`)} />
        </Field>
      </div>
      <Field label="Street address" htmlFor={`${kind}-street`} error={errors[kind]?.street?.message} required>
        <Input id={`${kind}-street`} {...form.register(`${kind}.street`)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City" htmlFor={`${kind}-city`} error={errors[kind]?.city?.message} required>
          <Input id={`${kind}-city`} {...form.register(`${kind}.city`)} />
        </Field>
        <Field label="State" htmlFor={`${kind}-state`} error={errors[kind]?.state?.message} required>
          <Input id={`${kind}-state`} {...form.register(`${kind}.state`)} />
        </Field>
        <Field label="Country" htmlFor={`${kind}-country`} error={errors[kind]?.country?.message}>
          <Input id={`${kind}-country`} {...form.register(`${kind}.country`)} />
        </Field>
      </div>
      <Field label="Landmark (optional)" htmlFor={`${kind}-landmark`} error={errors[kind]?.landmark?.message}>
        <Input id={`${kind}-landmark`} placeholder="Helps the driver find the address" {...form.register(`${kind}.landmark`)} />
      </Field>
    </fieldset>
  );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormMessage message={serverError ?? undefined} />

      <section className="space-y-4 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">Booking</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer" htmlFor="customerId" error={errors.customerId?.message} required>
            <Select
              value={watch.customerId}
              onValueChange={(value) => form.setValue("customerId", value, { shouldValidate: true })}
            >
              <SelectTrigger id="customerId" className="w-full">
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Service level" htmlFor="serviceLevel" error={errors.serviceLevel?.message} required>
            <Select
              value={watch.serviceLevel}
              onValueChange={(value) =>
                form.setValue("serviceLevel", value as ShipmentCreateInput["serviceLevel"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="serviceLevel" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Origin hub" htmlFor="originHubId" error={errors.originHubId?.message} required>
            <Select
              value={watch.originHubId}
              onValueChange={(value) => form.setValue("originHubId", value, { shouldValidate: true })}
            >
              <SelectTrigger id="originHubId" className="w-full">
                <SelectValue placeholder="Select origin" />
              </SelectTrigger>
              <SelectContent>
                {hubs.map((hub) => (
                  <SelectItem key={hub.value} value={hub.value}>
                    {hub.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            label="Destination hub"
            htmlFor="destinationHubId"
            error={errors.destinationHubId?.message}
            required
          >
            <Select
              value={watch.destinationHubId}
              onValueChange={(value) =>
                form.setValue("destinationHubId", value, { shouldValidate: true })
              }
            >
              <SelectTrigger id="destinationHubId" className="w-full">
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>
              <SelectContent>
                {hubs.map((hub) => (
                  <SelectItem key={hub.value} value={hub.value}>
                    {hub.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Priority" htmlFor="priority" error={errors.priority?.message} required>
            <Select
              value={watch.priority}
              onValueChange={(value) =>
                form.setValue("priority", value as ShipmentCreateInput["priority"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="priority" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            label="Promised delivery"
            htmlFor="promisedDeliveryAt"
            error={errors.promisedDeliveryAt?.message}
            required
          >
            <Input id="promisedDeliveryAt" type="datetime-local" {...form.register("promisedDeliveryAt")} />
          </Field>
        </div>
      </section>

      {addressFields("sender", "Sender / pickup")}
      {addressFields("recipient", "Recipient / delivery")}

      <section className="space-y-4 rounded-lg border border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Packages</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({ description: "", quantity: 1, weightKg: 1, lengthCm: 10, widthCm: 10, heightCm: 10 })
            }
          >
            <Plus className="size-4" aria-hidden />
            Add package line
          </Button>
        </div>

        {errors.packages?.message ? (
          <p role="alert" className="text-xs font-medium text-danger">
            {errors.packages.message}
          </p>
        ) : null}

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="space-y-3 rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Line {index + 1}
                </span>
                {fields.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-danger"
                    onClick={() => remove(index)}
                    aria-label={`Remove package line ${index + 1}`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                ) : null}
              </div>

              <Field
                label="Contents"
                htmlFor={`pkg-${index}-description`}
                error={errors.packages?.[index]?.description?.message}
                required
              >
                <Input id={`pkg-${index}-description`} {...form.register(`packages.${index}.description`)} />
              </Field>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Field label="Qty" htmlFor={`pkg-${index}-quantity`} error={errors.packages?.[index]?.quantity?.message} required>
                  <Input id={`pkg-${index}-quantity`} type="number" min={1} {...form.register(`packages.${index}.quantity`)} />
                </Field>
                <Field label="Weight (kg)" htmlFor={`pkg-${index}-weightKg`} error={errors.packages?.[index]?.weightKg?.message} required>
                  <Input id={`pkg-${index}-weightKg`} type="number" step="0.1" min="0.1" {...form.register(`packages.${index}.weightKg`)} />
                </Field>
                <Field label="Length (cm)" htmlFor={`pkg-${index}-lengthCm`} error={errors.packages?.[index]?.lengthCm?.message} required>
                  <Input id={`pkg-${index}-lengthCm`} type="number" min="1" {...form.register(`packages.${index}.lengthCm`)} />
                </Field>
                <Field label="Width (cm)" htmlFor={`pkg-${index}-widthCm`} error={errors.packages?.[index]?.widthCm?.message} required>
                  <Input id={`pkg-${index}-widthCm`} type="number" min="1" {...form.register(`packages.${index}.widthCm`)} />
                </Field>
                <Field label="Height (cm)" htmlFor={`pkg-${index}-heightCm`} error={errors.packages?.[index]?.heightCm?.message} required>
                  <Input id={`pkg-${index}-heightCm`} type="number" min="1" {...form.register(`packages.${index}.heightCm`)} />
                </Field>
                <Field label="Declared value" htmlFor={`pkg-${index}-declaredValue`} error={errors.packages?.[index]?.declaredValue?.message}>
                  <Input id={`pkg-${index}-declaredValue`} placeholder="0.00" inputMode="decimal" {...form.register(`packages.${index}.declaredValue`)} />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">Charges</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="COD amount (₦)" htmlFor="codAmount" error={errors.codAmount?.message} hint="Leave blank if no cash collection.">
            <Input id="codAmount" inputMode="decimal" placeholder="0.00" {...form.register("codAmount")} />
          </Field>
          <Field label="Declared value (₦)" htmlFor="declaredValue" error={errors.declaredValue?.message}>
            <Input id="declaredValue" inputMode="decimal" placeholder="0.00" {...form.register("declaredValue")} />
          </Field>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                id="prepaid"
                checked={Boolean(watch.prepaid)}
                onCheckedChange={(checked) => form.setValue("prepaid", checked === true)}
              />
              Freight prepaid by sender
            </label>
          </div>
        </div>

        <div className="rounded-md border border-info/30 bg-info/5 px-3 py-2.5 text-sm">
          <p className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground">
              Shipping fee (computed server-side from the {watch.serviceLevel?.replace("_", " ")} rate
              card + weight + COD handling)
            </span>
            <span className="font-semibold tabular-nums">{formatMoney(estimate, "NGN")}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Base {formatMoney(RATE_CARD[watch.serviceLevel ?? "standard"].baseMinor, "NGN")} +{" "}
            {formatMoney(RATE_CARD[watch.serviceLevel ?? "standard"].perKgMinor, "NGN")}/kg. The
            server recomputes the final charge — this is a preview only.
          </p>
        </div>

        <Field label="Operational notes (optional)" htmlFor="notes" error={errors.notes?.message}>
          <Textarea id="notes" rows={3} placeholder="Anything the hub or driver should know." {...form.register("notes")} />
        </Field>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
          {pending ? "Saving…" : shipment ? "Save changes" : "Create shipment"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
