"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FilePlus2, Loader2, Trash2 } from "lucide-react";
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
import { createInvoiceAction } from "@/lib/actions/finance";

export interface CustomerOption {
  value: string;
  label: string;
}

interface Line {
  description: string;
  quantity: string;
  unitAmount: string;
}

const EMPTY_LINE: Line = { description: "", quantity: "1", unitAmount: "" };

/** Default due date: 30 days from now, computed outside the render body. */
function defaultDueDate(): string {
  return new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
}

export function NewInvoiceButton({ customers }: { customers: CustomerOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [customerId, setCustomerId] = useState("");
  const [dueAt, setDueAt] = useState(defaultDueDate);
  const [taxRatePercent, setTaxRate] = useState("7.5");
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }]);
  const [error, setError] = useState<string | null>(null);

  const updateLine = (index: number, patch: Partial<Line>) =>
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const previewTotal = lines.reduce((sum, line) => {
    const quantity = Number(line.quantity) || 0;
    const unit = Number(line.unitAmount.replace(/[^0-9.]/g, "")) || 0;
    return sum + quantity * unit;
  }, 0);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const payload = await createInvoiceAction({
        customerId,
        dueAt,
        taxRatePercent: Number(taxRatePercent) || 0,
        discount: discount.trim() || undefined,
        notes: notes.trim() || undefined,
        shipmentIds: [],
        lines: lines
          .filter((line) => line.description.trim() && line.unitAmount.trim())
          .map((line) => ({
            description: line.description.trim(),
            quantity: Number(line.quantity) || 1,
            unitAmount: line.unitAmount.trim(),
          })),
      });

      if (!payload.ok) {
        const fields = payload.fieldErrors ? Object.values(payload.fieldErrors).flat().join(" ") : "";
        setError([payload.error, fields].filter(Boolean).join(" "));
        return;
      }

      toast.success(`${payload.data.invoiceNumber} issued · totals computed on the server`);
      setOpen(false);
      setLines([{ ...EMPTY_LINE }]);
      router.push(`/finance/invoices/${payload.data.id}`);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">
          <FilePlus2 className="size-4" aria-hidden />
          New invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Issue an invoice</DialogTitle>
          <DialogDescription>
            Subtotal, tax, discount and payable balance are derived on the server from the lines you
            enter — client totals are never trusted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="inv-customer">Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId} disabled={pending}>
                <SelectTrigger id="inv-customer" className="w-full bg-card">
                  <SelectValue placeholder="Choose a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.value} value={customer.value}>
                      {customer.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-due">Due date</Label>
              <Input
                id="inv-due"
                type="date"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Lines</Label>
            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-12 gap-2">
                <Input
                  className="col-span-12 sm:col-span-6"
                  placeholder="Description"
                  value={line.description}
                  onChange={(event) => updateLine(index, { description: event.target.value })}
                  disabled={pending}
                />
                <Input
                  className="col-span-4 sm:col-span-2"
                  placeholder="Qty"
                  inputMode="numeric"
                  value={line.quantity}
                  onChange={(event) => updateLine(index, { quantity: event.target.value })}
                  disabled={pending}
                />
                <Input
                  className="col-span-6 sm:col-span-3"
                  placeholder="Unit amount"
                  inputMode="decimal"
                  value={line.unitAmount}
                  onChange={(event) => updateLine(index, { unitAmount: event.target.value })}
                  disabled={pending}
                />
                <div className="col-span-2 flex items-center justify-end sm:col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 text-muted-foreground"
                    disabled={pending || lines.length === 1}
                    onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                    aria-label="Remove line"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setLines((current) => [...current, { ...EMPTY_LINE }])}
            >
              Add line
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="inv-tax">Tax rate %</Label>
              <Input
                id="inv-tax"
                value={taxRatePercent}
                onChange={(event) => setTaxRate(event.target.value)}
                inputMode="decimal"
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-discount">Discount</Label>
              <Input
                id="inv-discount"
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                disabled={pending}
              />
            </div>
            <div className="flex items-end">
              <p className="text-xs text-muted-foreground">
                Subtotal preview{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {previewTotal.toFixed(2)}
                </span>{" "}
                — final totals are computed on the server.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inv-notes">Notes</Label>
            <Textarea
              id="inv-notes"
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
          <Button type="button" onClick={submit} disabled={pending || !customerId}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FilePlus2 className="size-4" aria-hidden />}
            Issue invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
