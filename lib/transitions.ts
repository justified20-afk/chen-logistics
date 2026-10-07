import type {
  ExceptionStatus,
  PickupStatus,
  ShipmentStatus,
  TripStatus,
} from "@/types/domain";

/**
 * Canonical shipment lifecycle. Nothing outside this map is reachable through a
 * normal status action; exceptional corrections go through the audited
 * correction workflow instead.
 */
export const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  draft: ["booked", "cancelled"],
  booked: ["awaiting_pickup", "cancelled"],
  awaiting_pickup: ["picked_up", "cancelled", "failed"],
  picked_up: ["at_origin_hub", "failed"],
  at_origin_hub: ["in_transit", "failed"],
  in_transit: ["at_destination_hub", "failed"],
  at_destination_hub: ["out_for_delivery", "failed"],
  out_for_delivery: ["delivered", "delivery_attempted"],
  delivery_attempted: ["out_for_delivery", "failed", "delivered"],
  delivered: [],
  failed: ["return_initiated", "out_for_delivery"],
  return_initiated: ["returned"],
  returned: [],
  cancelled: [],
};

export const TERMINAL_STATUSES: ShipmentStatus[] = ["delivered", "returned", "cancelled"];

export const HUB_RELATED_STATUSES: ShipmentStatus[] = [
  "at_origin_hub",
  "in_transit",
  "at_destination_hub",
];

export function canTransition(from: ShipmentStatus, to: ShipmentStatus): boolean {
  return (SHIPMENT_TRANSITIONS[from] ?? []).includes(to);
}

export function allowedTransitions(from: ShipmentStatus): ShipmentStatus[] {
  return SHIPMENT_TRANSITIONS[from] ?? [];
}

export function isTerminal(status: ShipmentStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export const TRIP_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  draft: ["planned", "cancelled"],
  planned: ["assigned", "draft", "cancelled"],
  assigned: ["ready", "planned", "cancelled"],
  ready: ["dispatched", "assigned", "cancelled"],
  dispatched: ["in_transit", "cancelled"],
  in_transit: ["arrived", "cancelled"],
  arrived: ["completed"],
  completed: [],
  cancelled: [],
};

export function canTripTransition(from: TripStatus, to: TripStatus): boolean {
  return (TRIP_TRANSITIONS[from] ?? []).includes(to);
}

export const PICKUP_TRANSITIONS: Record<PickupStatus, PickupStatus[]> = {
  scheduled: ["driver_assigned", "cancelled"],
  driver_assigned: ["en_route", "cancelled", "scheduled"],
  en_route: ["arrived", "failed", "cancelled"],
  arrived: ["picked_up", "failed"],
  picked_up: [],
  failed: ["scheduled"],
  cancelled: [],
};

export function canPickupTransition(from: PickupStatus, to: PickupStatus): boolean {
  return (PICKUP_TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Exception queue states. An exception is only ever closed or resolved with a
 * recorded resolution, and closed work can be reopened for a fresh audit trail.
 */
export const EXCEPTION_TRANSITIONS: Record<ExceptionStatus, ExceptionStatus[]> = {
  open: ["acknowledged", "investigating", "waiting", "resolved", "closed"],
  acknowledged: ["investigating", "waiting", "resolved", "closed"],
  investigating: ["waiting", "resolved", "closed"],
  waiting: ["investigating", "resolved", "closed"],
  resolved: ["closed", "open"],
  closed: ["open"],
};

export function canExceptionTransition(from: ExceptionStatus, to: ExceptionStatus): boolean {
  return (EXCEPTION_TRANSITIONS[from] ?? []).includes(to);
}

export function allowedExceptionTransitions(from: ExceptionStatus): ExceptionStatus[] {
  return EXCEPTION_TRANSITIONS[from] ?? [];
}

export interface TransitionBlock {
  blocked: boolean;
  reason?: string;
}

/** Human-readable blocker used by the UI to explain why an action is unavailable. */
export function explainTransition(
  from: ShipmentStatus,
  to: ShipmentStatus,
): TransitionBlock {
  if (from === to) return { blocked: true, reason: `Shipment is already ${labelFor(to)}.` };
  if (!canTransition(from, to)) {
    if (isTerminal(from)) {
      return {
        blocked: true,
        reason: `${labelFor(from)} is a final state. Use an authorised status correction if this is wrong.`,
      };
    }
    return {
      blocked: true,
      reason: `${labelFor(from)} → ${labelFor(to)} is not a valid operational step.`,
    };
  }
  return { blocked: false };
}

const LABELS: Record<ShipmentStatus, string> = {
  draft: "draft",
  booked: "booked",
  awaiting_pickup: "awaiting pickup",
  picked_up: "picked up",
  at_origin_hub: "at the origin hub",
  in_transit: "in transit",
  at_destination_hub: "at the destination hub",
  out_for_delivery: "out for delivery",
  delivery_attempted: "delivery attempted",
  delivered: "delivered",
  failed: "failed",
  return_initiated: "return initiated",
  returned: "returned",
  cancelled: "cancelled",
};

export function labelFor(status: ShipmentStatus): string {
  return LABELS[status] ?? status;
}
