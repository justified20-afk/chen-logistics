"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CirclePlus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTripAction } from "@/lib/actions/dispatch";

export interface Option {
  value: string;
  label: string;
}

export function NewTripButton({
  hubs,
  drivers,
  vehicles,
}: {
  hubs: Option[];
  drivers: Option[];
  vehicles: Option[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [originHubId, setOriginHubId] = useState("");
  const [destinationHubId, setDestinationHubId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [departure, setDeparture] = useState("");
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const payload = await createTripAction({
        originHubId,
        destinationHubId,
        date,
        plannedDepartureAt: departure || undefined,
        driverId: driverId || undefined,
        vehicleId: vehicleId || undefined,
        notes: notes.trim() || undefined,
      });

      if (!payload.ok) {
        const fields = payload.fieldErrors ? Object.values(payload.fieldErrors).flat().join(" ") : "";
        setError([payload.error, fields].filter(Boolean).join(" "));
        return;
      }

      toast.success(`${payload.data.tripNumber} planned`);
      setOpen(false);
      router.push(`/dispatch/${payload.data.id}`);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">
          <CirclePlus className="size-4" aria-hidden />
          Plan trip
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Plan a trip</DialogTitle>
          <DialogDescription>
            A trip runs hub to hub. Load shipments, assign a driver and vehicle, then dispatch when
            it is ready to roll.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="trip-origin">From hub</Label>
              <Select value={originHubId} onValueChange={setOriginHubId} disabled={pending}>
                <SelectTrigger id="trip-origin" className="w-full bg-card">
                  <SelectValue placeholder="Origin" />
                </SelectTrigger>
                <SelectContent>
                  {hubs.map((hub) => (
                    <SelectItem key={hub.value} value={hub.value}>
                      {hub.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trip-destination">To hub</Label>
              <Select value={destinationHubId} onValueChange={setDestinationHubId} disabled={pending}>
                <SelectTrigger id="trip-destination" className="w-full bg-card">
                  <SelectValue placeholder="Destination" />
                </SelectTrigger>
                <SelectContent>
                  {hubs
                    .filter((hub) => hub.value !== originHubId)
                    .map((hub) => (
                      <SelectItem key={hub.value} value={hub.value}>
                        {hub.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trip-date">Trip date</Label>
              <Input
                id="trip-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trip-departure">Planned departure</Label>
              <Input
                id="trip-departure"
                type="datetime-local"
                value={departure}
                onChange={(event) => setDeparture(event.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trip-driver">Driver (optional)</Label>
              <Select value={driverId} onValueChange={setDriverId} disabled={pending}>
                <SelectTrigger id="trip-driver" className="w-full bg-card">
                  <SelectValue placeholder="Assign later" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.value} value={driver.value}>
                      {driver.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trip-vehicle">Vehicle (optional)</Label>
              <Select value={vehicleId} onValueChange={setVehicleId} disabled={pending}>
                <SelectTrigger id="trip-vehicle" className="w-full bg-card">
                  <SelectValue placeholder="Assign later" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.value} value={vehicle.value}>
                      {vehicle.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trip-notes">Notes</Label>
            <Textarea
              id="trip-notes"
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={pending}
              placeholder="Handling notes for the hub team"
            />
          </div>

          {error ? (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={pending || !originHubId || !destinationHubId || !date}
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CirclePlus className="size-4" aria-hidden />}
            Plan trip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
