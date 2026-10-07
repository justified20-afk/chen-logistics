import { cn } from "cn";
import { humanise } from "@/components/ui/status-badge";
import type { TrackingEvent } from "@/types/domain";

const TYPE_TONE: Record<TrackingEvent["type"], string> = {
  status_changed: "bg-primary",
  assigned: "bg-info",
  reassigned: "bg-warning",
  hub_operation: "bg-info",
  delivery_attempt: "bg-warning",
  proof_of_delivery: "bg-success",
  note: "bg-muted-foreground",
  exception: "bg-danger",
  pickup: "bg-info",
};

function formatStamp(value: string) {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    time: date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
  };
}

export function ShipmentTimeline({ events }: { events: TrackingEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No tracking events have been recorded for this shipment yet.
      </p>
    );
  }

  return (
    <ol className="relative space-y-0">
      {[...events].reverse().map((event, index) => {
        const stamp = formatStamp(event.createdAt);
        const isLatest = index === 0;
        return (
          <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
            {index < events.length - 1 ? (
              <span
                aria-hidden
                className="absolute left-[7px] top-5 h-full w-px bg-border"
              />
            ) : null}
            <span
              aria-hidden
              className={cn(
                "relative z-10 mt-1 size-3.5 shrink-0 rounded-full ring-4 ring-card",
                TYPE_TONE[event.type] ?? "bg-muted-foreground",
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className={cn("text-sm", isLatest ? "font-semibold" : "font-medium")}>
                  {event.label}
                </p>
                {event.newStatus ? (
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {humanise(event.newStatus)}
                  </span>
                ) : null}
                <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                  {stamp.date} · {stamp.time}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {event.location ? <span>{event.location}</span> : null}
                {event.actorName ? (
                  <span>
                    by <span className="text-foreground">{event.actorName}</span>
                  </span>
                ) : null}
                {event.previousStatus && event.newStatus ? (
                  <span className="font-mono">
                    {event.previousStatus} → {event.newStatus}
                  </span>
                ) : null}
              </div>
              {event.note ? (
                <p className="mt-1.5 rounded-md border border-border bg-muted/60 px-2.5 py-1.5 text-xs leading-relaxed text-foreground">
                  {event.note}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
