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
import { humanise } from "@/components/ui/status-badge";
import { EXCEPTION_TYPES, SEVERITIES } from "@/types/domain";
import { createExceptionAction } from "@/lib/actions/exceptions";

export interface LinkOption {
  value: string;
  label: string;
}

export function NewExceptionButton({
  hubs,
  drivers,
  vehicles,
}: {
  hubs: LinkOption[];
  drivers: LinkOption[];
  vehicles: LinkOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [type, setType] = useState<string>("delayed");
  const [severity, setSeverity] = useState<string>("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [linkKind, setLinkKind] = useState<string>("shipment");
  const [linkValue, setLinkValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setType("delayed");
    setSeverity("medium");
    setTitle("");
    setDescription("");
    setDueAt("");
    setLinkKind("shipment");
    setLinkValue("");
    setError(null);
  };

  const submit = () => {
    if (!linkValue.trim()) {
      setError(linkKind === "shipment" ? "Enter the tracking number to link." : "Choose what to link.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const payload = await createExceptionAction({
        type,
        severity,
        title: title.trim(),
        description: description.trim(),
        dueAt: dueAt || undefined,
        ...(linkKind === "shipment"
          ? { trackingNumber: linkValue.trim().toUpperCase() }
          : { [linkKind]: linkValue }),
      });

      if (!payload.ok) {
        const fields = payload.fieldErrors
          ? Object.values(payload.fieldErrors).flat().join(" ")
          : "";
        setError([payload.error, fields].filter(Boolean).join(" "));
        return;
      }

      toast.success(`${payload.data.reference} raised`);
      setOpen(false);
      reset();
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button">
          <CirclePlus className="size-4" aria-hidden />
          Raise exception
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Raise an exception</DialogTitle>
          <DialogDescription>
            Exceptions stay visible until someone records a resolution. High and critical severities
            notify the operations team immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ex-type">Type</Label>
              <Select value={type} onValueChange={setType} disabled={pending}>
                <SelectTrigger id="ex-type" className="w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXCEPTION_TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {humanise(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ex-severity">Severity</Label>
              <Select value={severity} onValueChange={setSeverity} disabled={pending}>
                <SelectTrigger id="ex-severity" className="w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {humanise(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ex-title">Title</Label>
            <Input
              id="ex-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Shipment past promised delivery window"
              disabled={pending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ex-description">What happened</Label>
            <Textarea
              id="ex-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Enough context for another operator to act without asking you."
              disabled={pending}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ex-link-kind">Link to</Label>
              <Select value={linkKind} onValueChange={setLinkKind} disabled={pending}>
                <SelectTrigger id="ex-link-kind" className="w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shipment">Shipment</SelectItem>
                  <SelectItem value="hub">Hub</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ex-link-value">
                {linkKind === "shipment" ? "Tracking number" : "Record"}
              </Label>
              {linkKind === "shipment" ? (
                <Input
                  id="ex-link-value"
                  value={linkValue}
                  onChange={(event) => setLinkValue(event.target.value)}
                  placeholder="CH-10482"
                  disabled={pending}
                />
              ) : (
                <Select value={linkValue} onValueChange={setLinkValue} disabled={pending}>
                  <SelectTrigger id="ex-link-value" className="w-full bg-card">
                    <SelectValue placeholder="Choose…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(linkKind === "hub" ? hubs : linkKind === "driver" ? drivers : vehicles).map(
                      (option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ex-due">Resolve by (optional)</Label>
            <Input
              id="ex-due"
              type="date"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
              disabled={pending}
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
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CirclePlus className="size-4" aria-hidden />}
            Raise exception
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
