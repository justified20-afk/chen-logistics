"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, ScanLine } from "lucide-react";
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
import { HUB_OPERATIONS } from "@/types/domain";
import { humanise } from "@/components/ui/status-badge";
import { recordHubOperationAction } from "@/lib/actions/hubs";

const HELP: Record<string, string> = {
  received: "Shipment arrived at this hub — moves it onto the floor.",
  sorted: "Sorted into a lane — history only.",
  staged: "Staged for the next leg — history only.",
  handed_over: "Released to the next leg: inbound trip or out for delivery.",
  damaged: "Damage found — raises a high-severity exception automatically.",
  missing: "Cannot be located — raises a critical exception automatically.",
  held: "Held at the hub, e.g. awaiting payment or instructions.",
  released: "Released from hold.",
};

export function RecordOperationButton({
  hubId,
  hubName,
}: {
  hubId: string;
  hubName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [operation, setOperation] = useState("received");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const payload = await recordHubOperationAction({
        trackingNumber: trackingNumber.trim().toUpperCase(),
        operation,
        hubId,
        note: note.trim() || undefined,
      });

      if (!payload.ok) {
        const fields = payload.fieldErrors ? Object.values(payload.fieldErrors).flat().join(" ") : "";
        setError([payload.error, fields].filter(Boolean).join(" "));
        return;
      }

      toast.success(`${humanise(payload.data.operation)} recorded at ${hubName}`);
      setTrackingNumber("");
      setNote("");
      setOperation("received");
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">
          <ScanLine className="size-4" aria-hidden />
          Record operation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Floor operation · {hubName}</DialogTitle>
          <DialogDescription>
            Scan or type a tracking number and record what the floor just did with it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="hop-tracking">Tracking number</Label>
            <Input
              id="hop-tracking"
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value.toUpperCase())}
              placeholder="AV-10482"
              disabled={pending}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hop-operation">Operation</Label>
            <Select value={operation} onValueChange={setOperation} disabled={pending}>
              <SelectTrigger id="hop-operation" className="w-full bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HUB_OPERATIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {humanise(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">{HELP[operation]}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hop-note">Note (required for damaged / missing)</Label>
            <Textarea
              id="hop-note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={pending}
              placeholder="What happened on the floor"
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
            disabled={pending || trackingNumber.trim().length < 3}
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ScanLine className="size-4" aria-hidden />}
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
