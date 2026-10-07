"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Banknote, Loader2, Scale } from "lucide-react";
import { DataTable, type Column } from "@/components/tables/data-table";
import { CodStatusBadge, humanise } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/money";
import { collectCodAction, reconcileCodAction } from "@/lib/actions/finance";
import type { CodRecord } from "@/types/domain";

export function CodTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  currency,
  canManage,
}: {
  rows: CodRecord[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  currency: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [collectFor, setCollectFor] = useState<CodRecord | null>(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectNote, setCollectNote] = useState("");

  const [reconcileFor, setReconcileFor] = useState<CodRecord | null>(null);
  const [settled, setSettled] = useState("");
  const [discrepancy, setDiscrepancy] = useState("");

  const close = () => {
    setCollectFor(null);
    setReconcileFor(null);
    setCollectAmount("");
    setCollectNote("");
    setSettled("");
    setDiscrepancy("");
    setError(null);
  };

  const doCollect = () => {
    if (!collectFor) return;
    setError(null);
    startTransition(async () => {
      const payload = await collectCodAction({
        shipmentId: collectFor.shipmentId,
        amount: collectAmount,
        note: collectNote.trim() || undefined,
      });
      if (!payload.ok) {
        setError(payload.error);
        return;
      }
      toast.success(`Collected on ${collectFor.trackingNumber}`);
      close();
      router.refresh();
    });
  };

  const doReconcile = () => {
    if (!reconcileFor) return;
    setError(null);
    const settledMinor = Math.round(Number(settled.replace(/[^0-9.]/g, "")) * 100);
    if (!Number.isFinite(settledMinor) || settledMinor < 0) {
      setError("Enter the settled amount.");
      return;
    }
    startTransition(async () => {
      const payload = await reconcileCodAction({
        codId: reconcileFor.id,
        expectedMinor: reconcileFor.expectedMinor,
        settledMinor,
        discrepancyReason: discrepancy.trim() || undefined,
        expectedVersion: reconcileFor.version,
      });
      if (!payload.ok) {
        if (payload.conflict) {
          setError("That COD record changed while you were working — reloading.");
          setTimeout(() => router.refresh(), 1200);
          return;
        }
        setError(payload.error);
        return;
      }
      toast.success(`${reconcileFor.trackingNumber} reconciled`);
      close();
      router.refresh();
    });
  };

  const columns: Column<CodRecord>[] = [
    {
      key: "trackingNumber",
      header: "Shipment",
      sortable: false,
      mobileLabel: "",
      cell: (row) => (
        <Link
          href={`/shipments/${row.shipmentId}`}
          className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline"
        >
          {row.trackingNumber}
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      mobileLabel: "Customer",
      cell: (row) => (
        <span className="block max-w-[10rem] truncate text-sm">{row.customerName ?? "—"}</span>
      ),
    },
    {
      key: "expectedMinor",
      header: "Expected",
      align: "right",
      mobileLabel: "Expected",
      cell: (row) => (
        <span className="text-xs tabular-nums">{formatMoney(row.expectedMinor, row.currency || currency)}</span>
      ),
    },
    {
      key: "collectedMinor",
      header: "Collected",
      align: "right",
      mobileLabel: "Collected",
      cell: (row) => (
        <span
          className={
            row.collectedMinor < row.expectedMinor
              ? "text-xs font-medium tabular-nums text-warning"
              : "text-xs tabular-nums"
          }
        >
          {formatMoney(row.collectedMinor, row.currency || currency)}
        </span>
      ),
    },
    {
      key: "gap",
      header: "Gap",
      align: "right",
      mobileLabel: "Gap",
      cell: (row) => {
        const gap = row.expectedMinor - row.collectedMinor;
        return gap > 0 ? (
          <span className="text-xs font-medium tabular-nums text-danger">
            {formatMoney(gap, row.currency || currency)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: false,
      mobileLabel: "Status",
      cell: (row) => <CodStatusBadge status={row.status} />,
    },
    {
      key: "reconciledBy",
      header: "Reconciled by",
      mobileLabel: "By",
      defaultHidden: true,
      cell: (row) => <span className="text-xs">{row.reconciledBy ?? "—"}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      mobileLabel: "",
      cell: (row) =>
        canManage && row.status !== "reconciled" ? (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={pending}
              onClick={() => {
                setCollectFor(row);
                setCollectAmount(((row.expectedMinor - row.collectedMinor) / 100).toFixed(2));
                setCollectNote("");
              }}
            >
              <Banknote className="size-3.5" aria-hidden /> Collect
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8"
              disabled={pending}
              onClick={() => {
                setReconcileFor(row);
                setSettled((row.collectedMinor / 100).toFixed(2));
                setDiscrepancy(row.discrepancyReason ?? "");
              }}
            >
              <Scale className="size-3.5" aria-hidden /> Reconcile
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            {row.reconciledAt
              ? new Date(row.reconciledAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "2-digit",
                })
              : "—"}
          </span>
        ),
    },
  ];

  return (
    <>
      <DataTable<CodRecord>
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        sort={sort}
        dir={dir}
        rowKey={(row) => row.id}
        rowHref={(row) => `/shipments/${row.shipmentId}`}
        searchPlaceholder="Search tracking number or customer…"
        caption={`${total} COD record${total === 1 ? "" : "s"} match the current filters`}
        emptyTitle="No COD records match these filters"
        emptyDescription="Cash-on-delivery records appear when a shipment is booked with COD."
      />

      <Dialog open={Boolean(collectFor)} onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Collect COD · {collectFor?.trackingNumber}</DialogTitle>
            <DialogDescription>
              Expected {collectFor ? formatMoney(collectFor.expectedMinor, currency) : ""} · already
              collected {collectFor ? formatMoney(collectFor.collectedMinor, currency) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cod-collect-amount">Amount collected</Label>
              <Input
                id="cod-collect-amount"
                value={collectAmount}
                onChange={(event) => setCollectAmount(event.target.value)}
                inputMode="decimal"
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cod-collect-note">Note</Label>
              <Textarea
                id="cod-collect-note"
                rows={2}
                value={collectNote}
                onChange={(event) => setCollectNote(event.target.value)}
                disabled={pending}
                placeholder="Who handed over the cash and when"
              />
            </div>
          </div>
          {error ? (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" onClick={doCollect} disabled={pending || !collectFor}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Banknote className="size-4" aria-hidden />}
              Record collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(reconcileFor)} onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reconcile · {reconcileFor?.trackingNumber}</DialogTitle>
            <DialogDescription>
              Settle the cash against what was expected. A difference requires a written reason and
              raises a payment exception automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <dl className="grid grid-cols-2 gap-3 rounded-md border border-border bg-background p-3 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Expected</dt>
                <dd className="font-medium tabular-nums">
                  {reconcileFor ? formatMoney(reconcileFor.expectedMinor, currency) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Collected</dt>
                <dd className="font-medium tabular-nums">
                  {reconcileFor ? formatMoney(reconcileFor.collectedMinor, currency) : "—"}
                </dd>
              </div>
            </dl>
            <div className="space-y-1.5">
              <Label htmlFor="cod-settled">Settled amount received by finance</Label>
              <Input
                id="cod-settled"
                value={settled}
                onChange={(event) => setSettled(event.target.value)}
                inputMode="decimal"
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cod-discrepancy">Discrepancy reason</Label>
              <Textarea
                id="cod-discrepancy"
                rows={2}
                value={discrepancy}
                onChange={(event) => setDiscrepancy(event.target.value)}
                disabled={pending}
                placeholder="Required when settled differs from collected"
              />
            </div>
          </div>
          {error ? (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" onClick={doReconcile} disabled={pending || !reconcileFor}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Scale className="size-4" aria-hidden />}
              Reconcile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
