import type { ReactNode } from "react";
import { cn } from "cn";
import type {
  CodStatus,
  ExceptionStatus,
  InvoiceStatus,
  PaymentStatus,
  PickupStatus,
  Severity,
  ShipmentStatus,
  TripStatus,
  VehicleStatus,
  DriverStatus,
} from "@/types/domain";

export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
  info: "border-info/30 bg-info/10 text-info",
  neutral: "border-border bg-muted text-muted-foreground",
};

const TONE_DOT: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-muted-foreground",
};

export function humanise(value: string): string {
  return value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export function StatusBadge({
  label,
  tone,
  dot = true,
  className,
}: {
  label: string;
  tone: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium",
        TONE_CLASS[tone],
        className,
      )}
    >
      {dot ? <span className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[tone])} aria-hidden /> : null}
      <span className="truncate">{label}</span>
    </span>
  );
}

const SHIPMENT_TONES: Record<ShipmentStatus, Tone> = {
  draft: "neutral",
  booked: "warning",
  awaiting_pickup: "warning",
  picked_up: "info",
  at_origin_hub: "info",
  in_transit: "info",
  at_destination_hub: "info",
  out_for_delivery: "info",
  delivery_attempted: "warning",
  delivered: "success",
  failed: "danger",
  return_initiated: "warning",
  returned: "danger",
  cancelled: "neutral",
};

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  return <StatusBadge label={humanise(status)} tone={SHIPMENT_TONES[status] ?? "neutral"} />;
}

const TRIP_TONES: Record<TripStatus, Tone> = {
  draft: "neutral",
  planned: "warning",
  assigned: "warning",
  ready: "warning",
  dispatched: "info",
  in_transit: "info",
  arrived: "info",
  completed: "success",
  cancelled: "neutral",
};

export function TripStatusBadge({ status }: { status: TripStatus }) {
  return <StatusBadge label={humanise(status)} tone={TRIP_TONES[status] ?? "neutral"} />;
}

const PICKUP_TONES: Record<PickupStatus, Tone> = {
  scheduled: "warning",
  driver_assigned: "warning",
  en_route: "info",
  arrived: "info",
  picked_up: "success",
  failed: "danger",
  cancelled: "neutral",
};

export function PickupStatusBadge({ status }: { status: PickupStatus }) {
  return <StatusBadge label={humanise(status)} tone={PICKUP_TONES[status] ?? "neutral"} />;
}

const EXCEPTION_TONES: Record<ExceptionStatus, Tone> = {
  open: "danger",
  acknowledged: "warning",
  investigating: "warning",
  waiting: "warning",
  resolved: "success",
  closed: "neutral",
};

export function ExceptionStatusBadge({ status }: { status: ExceptionStatus }) {
  return <StatusBadge label={humanise(status)} tone={EXCEPTION_TONES[status] ?? "neutral"} />;
}

const SEVERITY_TONES: Record<Severity, Tone> = {
  critical: "danger",
  high: "danger",
  medium: "warning",
  low: "neutral",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <StatusBadge
      label={humanise(severity)}
      tone={SEVERITY_TONES[severity]}
      className="font-semibold uppercase tracking-wide"
    />
  );
}

const PAYMENT_TONES: Record<PaymentStatus, Tone> = {
  unpaid: "warning",
  paid: "success",
  cod_pending: "warning",
  cod_collected: "info",
  reconciled: "success",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <StatusBadge label={humanise(status)} tone={PAYMENT_TONES[status] ?? "neutral"} />;
}

const COD_TONES: Record<CodStatus, Tone> = {
  pending: "warning",
  collected: "info",
  partially_collected: "warning",
  not_collected: "danger",
  reconciled: "success",
};

export function CodStatusBadge({ status }: { status: CodStatus }) {
  return <StatusBadge label={humanise(status)} tone={COD_TONES[status] ?? "neutral"} />;
}

const INVOICE_TONES: Record<InvoiceStatus, Tone> = {
  draft: "neutral",
  issued: "warning",
  partially_paid: "warning",
  paid: "success",
  void: "neutral",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <StatusBadge label={humanise(status)} tone={INVOICE_TONES[status] ?? "neutral"} />;
}

const VEHICLE_TONES: Record<VehicleStatus, Tone> = {
  available: "success",
  assigned: "warning",
  on_trip: "info",
  maintenance: "danger",
  inactive: "neutral",
};

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  return <StatusBadge label={humanise(status)} tone={VEHICLE_TONES[status] ?? "neutral"} />;
}

const DRIVER_TONES: Record<DriverStatus, Tone> = {
  available: "success",
  assigned: "warning",
  on_trip: "info",
  off_duty: "neutral",
  suspended: "danger",
  inactive: "neutral",
};

export function DriverStatusBadge({ status }: { status: DriverStatus }) {
  return <StatusBadge label={humanise(status)} tone={DRIVER_TONES[status] ?? "neutral"} />;
}

export function DelayBadge({ reason }: { reason?: string | null }) {
  if (!reason) return null;
  return <StatusBadge label={reason} tone="danger" />;
}

export function Card({
  title,
  description,
  actions,
  children,
  className,
  id,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn("rounded-lg border border-border bg-card", className)}
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      {title ? (
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 id={id ? `${id}-title` : undefined} className="text-sm font-semibold">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}
