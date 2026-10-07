"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, PackagePlus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge, TripStatusBadge, humanise } from "@/components/ui/status-badge";
import { ShipmentStatusBadge } from "@/components/ui/status-badge";
import { TRIP_TRANSITIONS } from "@/lib/transitions";
import {
  assignTripAction,
  changeTripStatusAction,
  searchLoadableShipmentsAction,
  setTripShipmentsAction,
} from "@/lib/actions/dispatch";
import type { LoadableShipment } from "@/lib/dispatch";
import type { ShipmentStatus, Trip } from "@/types/domain";

export interface Option {
  value: string;
  label: string;
}

export function TripPanel({
  trip,
  drivers,
  vehicles,
  canAssign,
  canDispatch,
  shipmentStatuses = {},
}: {
  trip: Trip;
  drivers: Option[];
  vehicles: Option[];
  canAssign: boolean;
  canDispatch: boolean;
  shipmentStatuses?: Record<string, { status: string; delayed?: boolean }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [driverId, setDriverId] = useState(trip.driverId ?? "none");
  const [vehicleId, setVehicleId] = useState(trip.vehicleId ?? "none");

  const [loadOpen, setLoadOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LoadableShipment[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);

  const run = async (payload: Record<string, unknown>, success: string) => {
    setError(null);
    startTransition(async () => {
      const result = await assignTripAction({
        ...payload,
        tripId: trip.id,
        expectedVersion: trip.version,
      });
      if (!result.ok) {
        if (result.conflict) {
          setError("This trip changed while you were working — reloading it.");
          setTimeout(() => router.refresh(), 1200);
          return;
        }
        setError(result.error);
        return;
      }
      toast.success(success);
      router.refresh();
    });
  };

  const move = (to: string) => {
    setError(null);
    startTransition(async () => {
      const result = await changeTripStatusAction({
        tripId: trip.id,
        to,
        expectedVersion: trip.version,
      });
      if (!result.ok) {
        setError(result.error);
        if (!result.conflict) toast.error(result.error);
        else setTimeout(() => router.refresh(), 1200);
        return;
      }
      toast.success(`${trip.tripNumber} → ${humanise(result.data.status)}`);
      router.refresh();
    });
  };

  const openLoad = () => {
    setLoadOpen(true);
    setQuery("");
    setSelected([]);
    setSearching(true);
    searchLoadableShipmentsAction(trip.id, "").then((rows) => {
      setResults(rows);
      setSearching(false);
    });
  };

  const search = (value: string) => {
    setQuery(value);
    setSearching(true);
    searchLoadableShipmentsAction(trip.id, value).then((rows) => {
      setResults(rows);
      setSearching(false);
    });
  };

  const addSelected = () => {
    setError(null);
    startTransition(async () => {
      const result = await setTripShipmentsAction({
        tripId: trip.id,
        shipmentIds: selected,
        expectedVersion: trip.version,
        mode: "add",
      });
      if (!result.ok) {
        if (result.conflict) setTimeout(() => router.refresh(), 1200);
        setError(result.error);
        return;
      }
      toast.success(`${result.data.loaded} shipment${result.data.loaded === 1 ? "" : "s"} loaded`);
      setLoadOpen(false);
      router.refresh();
    });
  };

  const removeShipment = (shipmentId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await setTripShipmentsAction({
        tripId: trip.id,
        shipmentIds: [shipmentId],
        expectedVersion: trip.version,
        mode: "remove",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Shipment removed from the manifest");
      router.refresh();
    });
  };

  const locked = ["dispatched", "in_transit", "arrived", "completed", "cancelled"].includes(trip.status);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-card">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Assignment</h2>
            <p className="text-xs text-muted-foreground">
              Driver and vehicle are written to every shipment on this trip.
            </p>
          </div>
          <TripStatusBadge status={trip.status} />
        </header>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="trip-driver-select">Driver</Label>
            <Select value={driverId} onValueChange={setDriverId} disabled={pending || !canAssign || locked}>
              <SelectTrigger id="trip-driver-select" className="w-full bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No driver</SelectItem>
                {drivers.map((driver) => (
                  <SelectItem key={driver.value} value={driver.value}>
                    {driver.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trip-vehicle-select">Vehicle</Label>
            <Select value={vehicleId} onValueChange={setVehicleId} disabled={pending || !canAssign || locked}>
              <SelectTrigger id="trip-vehicle-select" className="w-full bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No vehicle</SelectItem>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.value} value={vehicle.value}>
                    {vehicle.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button
              type="button"
              disabled={
                pending ||
                !canAssign ||
                locked ||
                (driverId === (trip.driverId ?? "none") && vehicleId === (trip.vehicleId ?? "none"))
              }
              onClick={() =>
                run(
                  {
                    driverId: driverId === "none" ? "" : driverId,
                    vehicleId: vehicleId === "none" ? "" : vehicleId,
                  },
                  "Assignment saved",
                )
              }
            >
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Save assignment
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Status</h2>
          <p className="text-xs text-muted-foreground">
            The trip state machine is enforced on the server — {humanise(trip.status)} can move to{" "}
            {(TRIP_TRANSITIONS[trip.status] ?? []).map(humanise).join(", ") || "no further states"}.
          </p>
        </header>
        <div className="flex flex-wrap gap-2 p-4">
          {(TRIP_TRANSITIONS[trip.status] ?? []).map((target) => (
            <Button
              key={target}
              type="button"
              variant={target === "dispatched" ? "default" : "outline"}
              size="sm"
              disabled={pending || !canDispatch}
              onClick={() => move(target)}
            >
              {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
              {target === "dispatched" ? "Dispatch trip" : `Mark ${humanise(target).toLowerCase()}`}
            </Button>
          ))}
          {(TRIP_TRANSITIONS[trip.status] ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This trip is in a final state ({humanise(trip.status)}).
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">
              Manifest · {trip.shipments.length} shipment{trip.shipments.length === 1 ? "" : "s"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {trip.totalPackages} package{trip.totalPackages === 1 ? "" : "s"} ·{" "}
              {trip.totalWeightKg} kg
              {trip.capacityPackages > 0
                ? ` of ${trip.capacityPackages} pkg / ${trip.capacityWeightKg} kg capacity`
                : ""}
            </p>
          </div>
          {canAssign && !locked ? (
            <Button type="button" size="sm" onClick={openLoad} disabled={pending}>
              <PackagePlus className="size-4" aria-hidden />
              Load shipments
            </Button>
          ) : null}
        </header>

        {trip.overCapacity ? (
          <p className="border-b border-border bg-danger/5 px-4 py-2.5 text-sm text-danger">
            This trip exceeds the assigned vehicle capacity. Remove load or change the vehicle
            before dispatching.
          </p>
        ) : null}

        {trip.shipments.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            Nothing loaded yet. Shipments booked to {trip.destinationHubName ?? "the destination"}{" "}
            can be added to this manifest.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {trip.shipments.map((entry) => (
              <li key={entry.shipmentId} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <Link
                    href={`/shipments/${entry.shipmentId}`}
                    className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    {entry.trackingNumber}
                  </Link>
                  <p className="text-[11px] text-muted-foreground">
                    {entry.packages} pkg · {entry.weightKg} kg
                    {entry.addedBy ? ` · loaded by ${entry.addedBy}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {shipmentStatuses[entry.shipmentId] ? (
                    <span className="flex items-center gap-1">
                      <ShipmentStatusBadge
                        status={shipmentStatuses[entry.shipmentId].status as ShipmentStatus}
                      />
                      {shipmentStatuses[entry.shipmentId].delayed ? (
                        <StatusBadge label="Delayed" tone="danger" />
                      ) : null}
                    </span>
                  ) : null}
                  {canAssign && !locked ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-muted-foreground"
                      disabled={pending}
                      onClick={() => removeShipment(entry.shipmentId)}
                      aria-label={`Remove ${entry.trackingNumber}`}
                    >
                      <X className="size-4" aria-hidden />
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Dialog open={loadOpen} onOpenChange={setLoadOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Load shipments onto {trip.tripNumber}</DialogTitle>
            <DialogDescription>
              Only shipments booked to {trip.destinationHubName ?? "the destination hub"} and not yet
              on another trip can be loaded.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(event) => search(event.target.value)}
                placeholder="Search tracking number, recipient or city…"
                className="pl-9"
                autoFocus
              />
            </div>

            <div className="max-h-72 overflow-y-auto rounded-md border border-border">
              {searching ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">Searching…</p>
              ) : results.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No loadable shipments match. They may already be on a trip or headed elsewhere.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {results.map((row) => {
                    const checked = selected.includes(row.id);
                    return (
                      <li key={row.id} className="flex items-center gap-3 px-3 py-2.5">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(next) =>
                            setSelected((current) =>
                              next ? [...current, row.id] : current.filter((id) => id !== row.id),
                            )
                          }
                          aria-label={`Select ${row.trackingNumber}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-xs font-semibold">{row.trackingNumber}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {row.recipientCity} · {humanise(row.status)} · {row.packages} pkg ·{" "}
                            {row.weightKg} kg
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {trip.overCapacity ? (
              <StatusBadge label="Current load is already over capacity" tone="danger" />
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLoadOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={addSelected} disabled={pending || selected.length === 0}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Load {selected.length || ""} shipment{selected.length === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
