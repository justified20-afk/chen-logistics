"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown, Loader2, UserPlus } from "lucide-react";
import { DataTable, type Column } from "@/components/tables/data-table";
import { PickupStatusBadge, humanise } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DELIVERY_FAILURE_REASONS, type Pickup } from "@/types/domain";
import { canPickupTransition } from "@/lib/transitions";
import { updatePickupAction } from "@/lib/actions/pickups";

const NEXT_LABELS: Record<string, string> = {
  driver_assigned: "Mark driver assigned",
  en_route: "Start the run",
  arrived: "Arrived at pickup",
  picked_up: "Collected",
  failed: "Report failed pickup",
  cancelled: "Cancel pickup",
  scheduled: "Return to queue",
};

export function PickupsTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  drivers,
  canManage,
}: {
  rows: Pickup[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  drivers: { value: string; label: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [assignFor, setAssignFor] = useState<Pickup | null>(null);
  const [driverId, setDriverId] = useState("");
  const [failFor, setFailFor] = useState<Pickup | null>(null);
  const [failReason, setFailReason] = useState("");
  const [failNote, setFailNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = (payload: Record<string, unknown>, success: string) => {
    setError(null);
    startTransition(async () => {
      const result = await updatePickupAction(payload);
      if (!result.ok) {
        if (result.conflict) {
          setError("This pickup changed while you were working. Reloading the latest state.");
          setTimeout(() => router.refresh(), 1200);
          return;
        }
        setError(result.error);
        return;
      }
      toast.success(success);
      setAssignFor(null);
      setFailFor(null);
      setDriverId("");
      setFailReason("");
      setFailNote("");
      router.refresh();
    });
  };

  const columns: Column<Pickup>[] = [
    {
      key: "reference",
      header: "Reference",
      sortable: true,
      mobileLabel: "",
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold text-primary">{row.reference}</p>
          <Link
            href={`/shipments/${row.shipmentId}`}
            className="font-mono text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {row.trackingNumber}
          </Link>
        </div>
      ),
    },
    {
      key: "scheduledFor",
      header: "Scheduled",
      sortable: true,
      mobileLabel: "Scheduled",
      cell: (row) => (
        <span className="text-xs tabular-nums">
          {new Date(row.scheduledFor).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
    {
      key: "address",
      header: "Pickup address",
      mobileLabel: "Address",
      cell: (row) => (
        <div className="min-w-0">
          <p className="max-w-[16rem] truncate text-sm">{row.address?.name ?? "—"}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {row.address?.street ? `${row.address.street}, ` : ""}
            {row.address?.city ?? ""}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      mobileLabel: "Status",
      cell: (row) => <PickupStatusBadge status={row.status} />,
    },
    {
      key: "driver",
      header: "Driver",
      mobileLabel: "Driver",
      cell: (row) =>
        row.driverName ? (
          <span className="block max-w-[9rem] truncate text-sm">{row.driverName}</span>
        ) : (
          <span className="text-xs font-medium text-warning">Unassigned</span>
        ),
    },
    {
      key: "failureReason",
      header: "Failure",
      mobileLabel: "Failure",
      defaultHidden: true,
      cell: (row) => (
        <span className="text-xs">{row.failureReason ? humanise(row.failureReason) : "—"}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      mobileLabel: "",
      cell: (row) =>
        canManage ? (
          <div className="flex items-center justify-end gap-1.5">
            {!row.driverName ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled={pending}
                onClick={() => {
                  setAssignFor(row);
                  setDriverId(row.driverId ?? "");
                }}
              >
                <UserPlus className="size-3.5" aria-hidden /> Assign
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-8" disabled={pending}>
                  Advance <ChevronDown className="size-3.5" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Move to</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(["driver_assigned", "en_route", "arrived", "picked_up", "failed", "cancelled"] as const)
                  .filter((target) => canPickupTransition(row.status, target))
                  .map((target) => (
                    <DropdownMenuItem
                      key={target}
                      onSelect={() => {
                        if (target === "failed") {
                          setFailFor(row);
                          setFailReason("");
                          setFailNote("");
                        } else {
                          run(
                            { pickupId: row.id, expectedVersion: row.version, status: target },
                            `${row.reference} → ${humanise(target)}`,
                          );
                        }
                      }}
                    >
                      {NEXT_LABELS[target] ?? humanise(target)}
                    </DropdownMenuItem>
                  ))}
                {(["driver_assigned", "en_route", "arrived", "picked_up", "failed", "cancelled"] as const).every(
                  (target) => !canPickupTransition(row.status, target),
                ) ? (
                  <DropdownMenuItem disabled>No further moves</DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Link
            href={`/shipments/${row.shipmentId}`}
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Open
          </Link>
        ),
    },
  ];

  return (
    <>
      <DataTable<Pickup>
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        sort={sort}
        dir={dir}
        rowKey={(row) => row.id}
        rowHref={(row) => `/shipments/${row.shipmentId}`}
        searchPlaceholder="Search reference, tracking number, address…"
        caption={`${total} pickup${total === 1 ? "" : "s"} match the current filters`}
        emptyTitle="No pickups match these filters"
        emptyDescription="Pickups appear here when a shipment is booked but not yet collected. Widen the filters to check."
      />

      <Dialog open={Boolean(assignFor)} onOpenChange={(open) => !open && setAssignFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign {assignFor?.reference}</DialogTitle>
            <DialogDescription>
              {assignFor?.trackingNumber} · scheduled{" "}
              {assignFor
                ? new Date(assignFor.scheduledFor).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="pickup-driver">Driver</Label>
            <Select value={driverId} onValueChange={setDriverId} disabled={pending}>
              <SelectTrigger id="pickup-driver" className="w-full bg-card">
                <SelectValue placeholder="Choose a driver" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((driver) => (
                  <SelectItem key={driver.value} value={driver.value}>
                    {driver.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              The driver&apos;s assigned vehicle is attached automatically.
            </p>
          </div>
          {error ? (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAssignFor(null)} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending || !driverId || !assignFor}
              onClick={() =>
                assignFor &&
                run(
                  {
                    pickupId: assignFor.id,
                    expectedVersion: assignFor.version,
                    driverId,
                    status: assignFor.status === "scheduled" ? "driver_assigned" : undefined,
                  },
                  `${assignFor.reference} assigned`,
                )
              }
            >
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Assign driver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(failFor)} onOpenChange={(open) => !open && setFailFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Failed pickup {failFor?.reference}</DialogTitle>
            <DialogDescription>
              The shipment stays booked — an operator decides what happens next.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="fail-reason">Reason</Label>
              <Select value={failReason} onValueChange={setFailReason} disabled={pending}>
                <SelectTrigger id="fail-reason" className="w-full bg-card">
                  <SelectValue placeholder="Choose a reason" />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERY_FAILURE_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {humanise(reason)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fail-note">Note</Label>
              <Textarea
                id="fail-note"
                rows={3}
                value={failNote}
                onChange={(event) => setFailNote(event.target.value)}
                disabled={pending}
                placeholder="What happened on site"
              />
            </div>
          </div>
          {error ? (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFailFor(null)} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending || !failReason || !failFor}
              onClick={() =>
                failFor &&
                run(
                  {
                    pickupId: failFor.id,
                    expectedVersion: failFor.version,
                    status: "failed",
                    failureReason: failReason,
                    failureNote: failNote.trim() || undefined,
                  },
                  `${failFor.reference} marked failed`,
                )
              }
            >
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Record failure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
