"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowRight, MessageSquarePlus, ShieldAlert, Wand2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { humanise } from "@/components/ui/status-badge";
import { allowedTransitions } from "@/lib/transitions";
import { DELIVERY_FAILURE_REASONS, SHIPMENT_STATUSES, type Shipment } from "@/types/domain";
import {
  addShipmentNoteAction,
  changeShipmentStatusAction,
  correctShipmentStatusAction,
} from "@/lib/actions/shipments";

const HUB_STATUSES = new Set(["at_origin_hub", "in_transit", "at_destination_hub"]);

export function ShipmentActions({
  shipment,
  canStatus,
  canCorrect,
}: {
  shipment: Shipment;
  canStatus: boolean;
  canCorrect: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [correctOpen, setCorrectOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  const [target, setTarget] = useState<string>("");
  const [transitionReason, setTransitionReason] = useState("");
  const [correctionTarget, setCorrectionTarget] = useState<string>("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const options = allowedTransitions(shipment.status);
  const requiresReason = target === "failed";

  const submitTransition = () => {
    if (!target) {
      setError("Choose the status you want to move to.");
      return;
    }
    if (requiresReason && transitionReason.trim().length < 3) {
      setError("A failed delivery needs a structured reason.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const payload = await changeShipmentStatusAction({
        shipmentId: shipment.id,
        to: target,
        expectedVersion: shipment.version,
        reason: transitionReason.trim() || undefined,
        hubId: HUB_STATUSES.has(target) ? shipment.destinationHubId : undefined,
      });

      if (!payload.ok) {
        if (payload.conflict) {
          setError(
            "Someone else updated this shipment while you were working. The page will refresh with the latest state.",
          );
          setTimeout(() => router.refresh(), 1200);
          return;
        }
        setError(payload.error);
        return;
      }

      toast.success(`Status updated to ${humanise(payload.data.status)}`);
      setOpen(false);
      setTarget("");
      setTransitionReason("");
      router.refresh();
    });
  };

  const submitCorrection = (to: string) => {
    if (correctionReason.trim().length < 8) {
      setError("A correction requires a written reason of at least 8 characters.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const payload = await correctShipmentStatusAction({
        shipmentId: shipment.id,
        to,
        expectedVersion: shipment.version,
        reason: correctionReason.trim(),
      });
      if (!payload.ok) {
        setError(payload.error);
        return;
      }
      toast.success(`Status corrected to ${humanise(payload.data.status)} — recorded in the audit log`);
      setCorrectOpen(false);
      setCorrectionTarget("");
      setCorrectionReason("");
      router.refresh();
    });
  };

  const submitNote = () => {
    if (note.trim().length < 2) return;
    startTransition(async () => {
      const payload = await addShipmentNoteAction({
        shipmentId: shipment.id,
        note: note.trim(),
      });
      if (!payload.ok) {
        toast.error(payload.error);
        return;
      }
      toast.success("Note recorded on the timeline");
      setNoteOpen(false);
      setNote("");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" size="sm" disabled={!canStatus || options.length === 0}>
            <ArrowRight className="size-4" aria-hidden />
            Advance status
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Advance {shipment.trackingNumber}</DialogTitle>
            <DialogDescription>
              Currently <strong>{humanise(shipment.status)}</strong>.
              {options.length === 0
                ? " This is a final state — no further transitions are available."
                : ` Allowed next: ${options.map(humanise).join(", ")}.`}
            </DialogDescription>
          </DialogHeader>

          {options.length > 0 ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="next-status">Move to</Label>
                <Select value={target} onValueChange={(value) => setTarget(value)}>
                  <SelectTrigger id="next-status">
                    <SelectValue placeholder="Choose the next operational state" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {humanise(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {target === "failed" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="failure-reason">Structured failure reason</Label>
                  <Select value={transitionReason} onValueChange={setTransitionReason}>
                    <SelectTrigger id="failure-reason">
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {DELIVERY_FAILURE_REASONS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {humanise(item)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="transition-reason">
                  Note{target === "failed" ? " (required for “other”)" : " (optional)"}
                </Label>
                <Textarea
                  id="transition-reason"
                  value={transitionReason}
                  onChange={(event) => setTransitionReason(event.target.value)}
                  placeholder="What happened? This is written to the tracking timeline."
                  rows={3}
                />
              </div>

              {error ? (
                <p role="alert" className="text-sm font-medium text-danger">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submitTransition} disabled={pending || options.length === 0}>
              {pending ? "Applying…" : "Apply transition"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <MessageSquarePlus className="size-4" aria-hidden />
            Add note
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add an operational note</DialogTitle>
            <DialogDescription>
              Notes appear on the tracking timeline with your name and a timestamp.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
            placeholder="e.g. Customer called and asked to hold until Friday morning."
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submitNote} disabled={pending || note.trim().length < 2}>
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {canCorrect ? (
        <Dialog open={correctOpen} onOpenChange={setCorrectOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="text-warning">
              <Wand2 className="size-4" aria-hidden />
              Correct status
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-warning" aria-hidden />
                Authorised status correction
              </DialogTitle>
              <DialogDescription>
                This bypasses the normal transition rules. The previous state is preserved on the
                timeline, the reason is mandatory, and an audit record is written.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="correct-to">Set status to</Label>
                <Select value={correctionTarget} onValueChange={setCorrectionTarget}>
                  <SelectTrigger id="correct-to">
                    <SelectValue placeholder="Choose the corrected status" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIPMENT_STATUSES.filter((status) => status !== shipment.status).map((status) => (
                      <SelectItem key={status} value={status}>
                        {humanise(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="correct-reason">Reason (required)</Label>
                <Textarea
                  id="correct-reason"
                  value={correctionReason}
                  onChange={(event) => setCorrectionReason(event.target.value)}
                  rows={3}
                  placeholder="Why is this correction necessary?"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 8 characters. Visible to auditors.
                </p>
              </div>
              {error ? (
                <p role="alert" className="text-sm font-medium text-danger">
                  {error}
                </p>
              ) : null}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    disabled={!correctionTarget || correctionReason.trim().length < 8 || pending}
                  >
                    Review correction
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Correct this shipment status?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {shipment.status} → {correctionTarget ? humanise(correctionTarget) : ""}.
                      History is not rewritten — a correction event and an audit entry are added.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => submitCorrection(correctionTarget)}>
                      Apply correction
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCorrectOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

export function ShipmentActionMenu({ shipment }: { shipment: Shipment }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          More actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Shipment</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => router.push(`/shipments/${shipment.id}/edit`)}>
          Edit details
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push(`/tracking/${shipment.trackingNumber}`)}>
          Open public tracking
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={pending || shipment.status === "cancelled"}
          onSelect={() => {
            startTransition(async () => {
              const result = await changeShipmentStatusAction({
                shipmentId: shipment.id,
                to: "cancelled",
                expectedVersion: shipment.version,
                reason: "Cancelled by operations",
              });
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              toast.success("Shipment cancelled");
              router.refresh();
            });
          }}
        >
          Cancel shipment
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
