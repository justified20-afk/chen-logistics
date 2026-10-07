"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Ban, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { humanise } from "@/components/ui/status-badge";
import { changeInvoiceStatusAction } from "@/lib/actions/finance";
import type { Invoice } from "@/types/domain";

export function InvoiceStatusActions({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const target = invoice.status === "void" ? "issued" : "void";

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const payload = await changeInvoiceStatusAction({
        invoiceId: invoice.id,
        status: target,
        expectedVersion: invoice.version,
        reason: reason.trim() || undefined,
      });
      if (!payload.ok) {
        if (payload.conflict) {
          setError("This invoice changed while you were working — reloading.");
          setTimeout(() => router.refresh(), 1200);
          return;
        }
        setError(payload.error);
        return;
      }
      toast.success(`${invoice.invoiceNumber} → ${humanise(payload.data.status)}`);
      setOpen(false);
      setReason("");
      router.refresh();
    });
  };

  if (invoice.status === "paid") return null;

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)} disabled={pending}>
        <Ban className="size-4" aria-hidden />
        {invoice.status === "void" ? "Re-issue invoice" : "Void invoice"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {target === "void" ? `Void ${invoice.invoiceNumber}` : `Re-issue ${invoice.invoiceNumber}`}
            </DialogTitle>
            <DialogDescription>
              {target === "void"
                ? "Voiding is permanent and audited. An invoice with payments recorded cannot be voided."
                : "Re-issuing makes the invoice payable again."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="invoice-reason">Reason {target === "void" ? "(required)" : "(optional)"}</Label>
            <Textarea
              id="invoice-reason"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={pending}
              placeholder="Why this invoice is being changed"
            />
          </div>

          {error ? (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={target === "void" ? "destructive" : "default"}
              onClick={submit}
              disabled={pending || (target === "void" && reason.trim().length < 5)}
            >
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Ban className="size-4" aria-hidden />}
              {target === "void" ? "Void invoice" : "Re-issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
