"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateSettingsAction } from "@/lib/actions/system";
import { SERVICE_LEVELS } from "@/types/domain";
import { humanise } from "@/components/ui/status-badge";
import type { SystemSettings } from "@/types/domain";

export function SettingsForm({
  settings,
  hubs,
}: {
  settings: SystemSettings;
  hubs: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    companyName: settings.companyName,
    tagline: settings.tagline,
    currency: settings.currency,
    timezone: settings.timezone,
    defaultOriginHubId: settings.defaultOriginHubId ?? "none",
    defaultServiceLevel: settings.defaultServiceLevel,
    delayThresholdHours: String(settings.delayThresholdHours),
    complianceWarningDays: String(settings.complianceWarningDays),
    invoicePrefix: settings.invoicePrefix,
    capacityWarningRatio: String(settings.capacityWarningRatio),
    codEnabled: settings.codEnabled,
  });
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const payload = await updateSettingsAction({
        ...form,
        defaultOriginHubId: form.defaultOriginHubId === "none" ? undefined : form.defaultOriginHubId,
      });
      if (!payload.ok) {
        const fields = payload.fieldErrors ? Object.values(payload.fieldErrors).flat().join(" ") : "";
        setError([payload.error, fields].filter(Boolean).join(" "));
        return;
      }
      toast.success("Settings saved");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name">
          <Input value={form.companyName} onChange={(event) => set("companyName", event.target.value)} disabled={pending} />
        </Field>
        <Field label="Tagline">
          <Input value={form.tagline} onChange={(event) => set("tagline", event.target.value)} disabled={pending} />
        </Field>
        <Field label="Currency (ISO)">
          <Input value={form.currency} onChange={(event) => set("currency", event.target.value.toUpperCase())} disabled={pending} />
        </Field>
        <Field label="Timezone">
          <Input value={form.timezone} onChange={(event) => set("timezone", event.target.value)} disabled={pending} />
        </Field>
        <Field label="Default origin hub">
          <Select
            value={form.defaultOriginHubId}
            onValueChange={(value) => set("defaultOriginHubId", value)}
            disabled={pending}
          >
            <SelectTrigger className="w-full bg-card">
              <SelectValue placeholder="No default" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No default hub</SelectItem>
              {hubs.map((hub) => (
                <SelectItem key={hub.value} value={hub.value}>
                  {hub.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Default service level">
          <Select
            value={form.defaultServiceLevel}
            onValueChange={(value) => set("defaultServiceLevel", value)}
            disabled={pending}
          >
            <SelectTrigger className="w-full bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {humanise(level)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Delay threshold (hours past promise)">
          <Input
            value={form.delayThresholdHours}
            inputMode="numeric"
            onChange={(event) => set("delayThresholdHours", event.target.value)}
            disabled={pending}
          />
        </Field>
        <Field label="Compliance warning (days ahead)">
          <Input
            value={form.complianceWarningDays}
            inputMode="numeric"
            onChange={(event) => set("complianceWarningDays", event.target.value)}
            disabled={pending}
          />
        </Field>
        <Field label="Invoice number prefix">
          <Input value={form.invoicePrefix} onChange={(event) => set("invoicePrefix", event.target.value)} disabled={pending} />
        </Field>
        <Field label="Capacity warning ratio (0.1 – 1)">
          <Input
            value={form.capacityWarningRatio}
            inputMode="decimal"
            onChange={(event) => set("capacityWarningRatio", event.target.value)}
            disabled={pending}
          />
        </Field>
      </div>

      <div className="flex items-center justify-between rounded-md border border-border bg-background px-4 py-3">
        <div>
          <p className="text-sm font-medium">Cash on delivery</p>
          <p className="text-xs text-muted-foreground">
            When off, COD is not offered on new shipments and reconciliation is hidden.
          </p>
        </div>
        <Switch
          checked={form.codEnabled}
          onCheckedChange={(checked) => set("codEnabled", checked)}
          disabled={pending}
          aria-label="Enable cash on delivery"
        />
      </div>

      {error ? (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Button type="button" onClick={submit} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
        Save settings
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
