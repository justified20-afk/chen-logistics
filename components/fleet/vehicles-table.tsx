"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/tables/data-table";
import { VehicleStatusBadge, humanise } from "@/components/ui/status-badge";
import type { Vehicle } from "@/types/domain";

function daysUntil(value: string): number {
  return Math.round((new Date(value).getTime() - Date.now()) / 86_400_000);
}

function ExpiryCell({ value, label }: { value?: string; label: string }) {
  if (!value) return <span className="text-xs text-muted-foreground">—</span>;
  const date = new Date(value);
  const days = daysUntil(value);
  const soon = days < 30;
  return (
    <span className={soon ? "text-xs font-medium tabular-nums text-danger" : "text-xs tabular-nums"}>
      {date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
      {soon ? ` · ${label} ${days}d` : ""}
    </span>
  );
}

export function VehiclesTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
}: {
  rows: Vehicle[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
}) {
  const columns: Column<Vehicle>[] = [
    {
      key: "registrationNumber",
      header: "Vehicle",
      sortable: true,
      mobileLabel: "",
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold">{row.registrationNumber}</p>
          <p className="text-[11px] capitalize text-muted-foreground">
            {humanise(row.type)}
            {row.year ? ` · ${row.year}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      mobileLabel: "Status",
      cell: (row) => <VehicleStatusBadge status={row.status} />,
    },
    {
      key: "capacity",
      header: "Capacity",
      mobileLabel: "Capacity",
      cell: (row) => (
        <span className="text-xs tabular-nums">
          {row.capacityWeightKg} kg · {row.capacityPackages} pkg
        </span>
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
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "hub",
      header: "Base hub",
      mobileLabel: "Hub",
      defaultHidden: true,
      cell: (row) => <span className="text-xs">{row.hubName ?? "—"}</span>,
    },
    {
      key: "insuranceExpiry",
      header: "Insurance",
      sortable: true,
      mobileLabel: "Insurance",
      cell: (row) => <ExpiryCell value={row.insuranceExpiry} label="expires" />,
    },
    {
      key: "inspectionExpiry",
      header: "Inspection",
      sortable: true,
      mobileLabel: "Inspection",
      cell: (row) => <ExpiryCell value={row.inspectionExpiry} label="expires" />,
    },
    {
      key: "odometerKm",
      header: "Odometer",
      sortable: true,
      align: "right",
      mobileLabel: "Odometer",
      defaultHidden: true,
      cell: (row) => (
        <span className="text-xs tabular-nums">
          {row.odometerKm ? `${row.odometerKm.toLocaleString("en-US")} km` : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      mobileLabel: "",
      cell: (row) => (
        <Link
          href={`/dispatch?q=${encodeURIComponent(row.registrationNumber)}`}
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          Trips
        </Link>
      ),
    },
  ];

  return (
    <DataTable<Vehicle>
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      sort={sort}
      dir={dir}
      rowKey={(row) => row.id}
      rowHref={(row) => `/dispatch?q=${encodeURIComponent(row.registrationNumber)}`}
      searchPlaceholder="Search registration, driver, hub…"
      caption={`${total} vehicle${total === 1 ? "" : "s"} match the current filters`}
      emptyTitle="No vehicles match these filters"
      emptyDescription="Clear a filter to see the rest of the fleet directory."
    />
  );
}
