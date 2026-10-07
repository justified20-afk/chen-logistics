"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Banknote, Loader2 } from "lucide-react";
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
import { PAYMENT_METHODS } from "@/types/domain";
import { humanise } from "@/components/ui/status-badge";
import { formatMoney } from "@/lib/money";
import { recordPaymentAction } from "@/lib/actions/finance";
import type { Invoice } from "@/types/domain";

export interface CustomerOption {
  value: string;
  label: string;
}

export interface OpenInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  balanceMinor: number;
}

export function RecordPaymentButton({
  invoice,
  customers,
  openInvoices = [],
  label = "Record payment",
}: {
  invoice?: Invoice;
  customers?: CustomerOption[];
  openInvoices?: OpenInvoice[];
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [customerId, setCustomerId] = useState(invoice?.customerId ?? "");
  const [invoiceId, setInvoiceId] = useState(invoice?.id ?? "none");
  const [amount, setAmount] = useState(
    invoice ? (invoice.balanceMinor / 100).toFixed(2) : "",
  );
  const [method, setMethod] = useState("bank_transfer");
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const customerInvoices = openInvoices.filter((row) => row.customerId === customerId);
  const fixed = Boolean(invoice);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const payload = await recordPaymentAction({
        customerId: invoice?.customerId ?? customerId,
        invoiceId: fixed ? invoice?.id : invoiceId === "none" ? undefined : invoiceId,
        amount: amount.trim(),
        method,
        receivedAt,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (!payload.ok) {
        const fields = payload.fieldErrors ? Object.values(payload.fieldErrors).flat().join(" ") : "";
        setError([payload.error, fields].filter(Boolean).join(" "));
        return;
      }

      toast.success(`Payment recorded · ${payload.data.reference}`);
      setOpen(false);
      setReference("");
      setNotes("");
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">
          <Banknote className="size-4" aria-hidden />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            {invoice
              ? `${invoice.invoiceNumber} · outstanding ${formatMoney(invoice.balanceMinor, invoice.currency)}`
              : "Payments are stored as immutable records; invoice balances are recomputed on the server."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!fixed ? (
            <div className="space-y-1.5">
              <Label htmlFor="pay-customer">Customer</Label>
              <Select value={customerId} onValueChange={(value) => { setCustomerId(value); setInvoiceId("none"); }} disabled={pending}>
                <SelectTrigger id="pay-customer" className="w-full bg-card">
                  <SelectValue placeholder="Choose a customer" />
                </SelectTrigger>
                <SelectContent>
                  {(customers ?? []).map((customer) => (
                    <SelectItem key={customer.value} value={customer.value}>
                      {customer.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {!fixed ? (
            <div className="space-y-1.5">
              <Label htmlFor="pay-invoice">Apply to invoice (optional)</Label>
              <Select value={invoiceId} onValueChange={setInvoiceId} disabled={pending || !customerId}>
                <SelectTrigger id="pay-invoice" className="w-full bg-card">
                  <SelectValue placeholder="Choose an invoice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unallocated payment</SelectItem>
                  {customerInvoices.map((row) => (
                    <SelectItem key={row.id} value={row.id}>
                      {row.invoiceNumber} · {formatMoney(row.balanceMinor)} due
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pay-amount">Amount</Label>
              <Input
                id="pay-amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-method">Method</Label>
              <Select value={method} onValueChange={setMethod} disabled={pending}>
                <SelectTrigger id="pay-method" className="w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {humanise(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-date">Received on</Label>
              <Input
                id="pay-date"
                type="date"
                value={receivedAt}
                onChange={(event) => setReceivedAt(event.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-reference">Reference</Label>
              <Input
                id="pay-reference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Bank transfer ref"
                disabled={pending}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-notes">Notes</Label>
            <Textarea
              id="pay-notes"
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
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
          <Button
            type="button"
            onClick={submit}
            disabled={pending || !amount.trim() || (!fixed && !customerId)}
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Banknote className="size-4" aria-hidden />}
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
