"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown, Loader2, Truck } from "lucide-react";
import { DataTable, type Column } from "@/components/tables/data-table";
import { StatusBadge, TripStatusBadge, humanise } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TRIP_TRANSITIONS } from "@/lib/transitions";
import { changeTripStatusAction } from "@/lib/actions/dispatch";
import type { Trip } from "@/types/domain";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

export function TripsTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  canDispatch,
}: {
  rows: Trip[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  canDispatch: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const move = (trip: Trip, to: string) => {
    setError(null);
    startTransition(async () => {
      const payload = await changeTripStatusAction({
        tripId: trip.id,
        to,
        expectedVersion: trip.version,
      });
      if (!payload.ok) {
        if (payload.conflict) {
          setError("This trip changed while you were working — reloading it.");
          setTimeout(() => router.refresh(), 1200);
          return;
        }
        setError(payload.error);
        toast.error(payload.error);
        return;
      }
      toast.success(`${trip.tripNumber} → ${humanise(payload.data.status)}`);
      router.refresh();
    });
  };

  const columns: Column<Trip>[] = [
    {
      key: "tripNumber",
      header: "Trip",
      sortable: true,
      mobileLabel: "",
      cell: (row) => (
        <div className="min-w-0">
          <Link
            href={`/dispatch/${row.id}`}
            className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline"
          >
            {row.tripNumber}
          </Link>
          <p className="text-[11px] text-muted-foreground">{formatDate(row.date)}</p>
        </div>
      ),
    },
    {
      key: "route",
      header: "Route",
      mobileLabel: "Route",
      cell: (row) => (
        <div className="min-w-0">
          <p className="max-w-[16rem] truncate text-sm">
            {row.originHubName ?? "—"} → {row.destinationHubName ?? "—"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {row.plannedDepartureAt
              ? `Departs ${new Date(row.plannedDepartureAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`
              : "No departure time set"}
          </p>
        </div>
      ),
    },
    {
      key: "driver",
      header: "Driver",
      mobileLabel: "Driver",
      cell: (row) =>
        row.driverName ? (
          <span className="block max-w-[9rem] truncate text-sm">{row.driverName}</span>
        ) : (
          <StatusBadge label="No driver" tone="warning" dot={false} />
        ),
    },
    {
      key: "vehicle",
      header: "Vehicle",
      mobileLabel: "Vehicle",
      cell: (row) =>
        row.vehicleRegistration ? (
          <span className="font-mono text-xs">{row.vehicleRegistration}</span>
        ) : (
          <StatusBadge label="No vehicle" tone="warning" dot={false} />
        ),
    },
    {
      key: "load",
      header: "Load",
      sortable: false,
      mobileLabel: "Load",
      cell: (row) => (
        <div className="min-w-0">
          <p className="text-sm tabular-nums">
            {row.totalPackages} pkg · {row.totalWeightKg} kg
          </p>
          {row.capacityPackages > 0 ? (
            <p className="text-[11px] text-muted-foreground">
              of {row.capacityPackages} pkg / {row.capacityWeightKg} kg
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "capacity",
      header: "Capacity",
      mobileLabel: "Capacity",
      cell: (row) =>
        row.overCapacity ? (
          <StatusBadge label="Over capacity" tone="danger" />
        ) : row.capacityPackages > 0 ? (
          <StatusBadge label="Within capacity" tone="success" />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      mobileLabel: "Status",
      cell: (row) => <TripStatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      mobileLabel: "",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={`/dispatch/${row.id}`}
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Open
          </Link>
          {canDispatch && (TRIP_TRANSITIONS[row.status] ?? []).length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-8" disabled={pending}>
                  {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Truck className="size-3.5" aria-hidden />}
                  Move <ChevronDown className="size-3.5" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Move to</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(TRIP_TRANSITIONS[row.status] ?? []).map((target) => (
                  <DropdownMenuItem key={target} onSelect={() => move(row, target)}>
                    {humanise(target)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      {error ? (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <DataTable<Trip>
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        sort={sort}
        dir={dir}
        rowKey={(row) => row.id}
        rowHref={(row) => `/dispatch/${row.id}`}
        searchPlaceholder="Search trip number, driver, hub…"
        caption={`${total} trip${total === 1 ? "" : "s"} match the current filters`}
        emptyTitle="No trips match these filters"
        emptyDescription="Trips appear once a dispatcher plans a route between two hubs. Create one to start loading shipments."
      />
    </>
  );
}
