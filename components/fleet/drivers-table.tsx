"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/tables/data-table";
import { DriverStatusBadge, humanise } from "@/components/ui/status-badge";
import type { Driver } from "@/types/domain";

export function DriversTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
}: {
  rows: Driver[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
}) {
  const columns: Column<Driver>[] = [
    {
      key: "name",
      header: "Driver",
      sortable: true,
      mobileLabel: "",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <p className="font-mono text-[11px] text-muted-foreground">{row.employeeId}</p>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      mobileLabel: "Phone",
      cell: (row) => <span className="text-xs tabular-nums">{row.phone}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      mobileLabel: "Status",
      cell: (row) => <DriverStatusBadge status={row.status} />,
    },
    {
      key: "hub",
      header: "Base hub",
      sortable: false,
      mobileLabel: "Hub",
      cell: (row) => <span className="text-xs">{row.hubName ?? "—"}</span>,
    },
    {
      key: "vehicle",
      header: "Vehicle",
      mobileLabel: "Vehicle",
      cell: (row) =>
        row.vehicleRegistration ? (
          <span className="font-mono text-xs">{row.vehicleRegistration}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "licenseExpiry",
      header: "Licence expiry",
      sortable: true,
      mobileLabel: "Licence",
      cell: (row) => {
        if (!row.licenseExpiry) return <span className="text-xs text-muted-foreground">—</span>;
        const expiry = new Date(row.licenseExpiry);
        const days = Math.round((expiry.getTime() - Date.now()) / 86_400_000);
        return (
          <span className={days < 30 ? "text-xs font-medium tabular-nums text-danger" : "text-xs tabular-nums"}>
            {expiry.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
            {days < 30 ? ` · ${days}d` : ""}
          </span>
        );
      },
    },
    {
      key: "completedJobs",
      header: "Completed",
      sortable: true,
      align: "right",
      mobileLabel: "Completed",
      cell: (row) => <span className="text-xs tabular-nums">{row.completedJobs}</span>,
    },
    {
      key: "failedDeliveries",
      header: "Failed",
      sortable: true,
      align: "right",
      mobileLabel: "Failed",
      cell: (row) => (
        <span className={row.failedDeliveries > 0 ? "text-xs font-medium tabular-nums text-danger" : "text-xs tabular-nums"}>
          {row.failedDeliveries}
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
          href={`/dispatch?driverId=${row.id}`}
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          Trips
        </Link>
      ),
    },
  ];

  return (
    <DataTable<Driver>
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      sort={sort}
      dir={dir}
      rowKey={(row) => row.id}
      rowHref={(row) => `/dispatch?driverId=${row.id}`}
      searchPlaceholder="Search name, employee id, phone…"
      caption={`${total} driver${total === 1 ? "" : "s"} match the current filters`}
      emptyTitle="No drivers match these filters"
      emptyDescription="Clear a filter, or add drivers to the fleet directory."
    />
  );
}
