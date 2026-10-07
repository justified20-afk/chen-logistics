"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/tables/data-table";
import {
  ExceptionStatusBadge,
  SeverityBadge,
  humanise,
} from "@/components/ui/status-badge";
import type { Exception } from "@/types/domain";

function formatWhen(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

function linkedTo(exception: Exception): { label: string; href: string } | null {
  if (exception.shipmentTrackingNumber) {
    return {
      label: exception.shipmentTrackingNumber,
      href: exception.shipmentId ? `/shipments/${exception.shipmentId}` : "/shipments",
    };
  }
  if (exception.tripNumber) return { label: exception.tripNumber, href: "/dispatch" };
  if (exception.driverName) return { label: exception.driverName, href: "/fleet/drivers" };
  if (exception.vehicleRegistration) {
    return { label: exception.vehicleRegistration, href: "/fleet/vehicles" };
  }
  return null;
}

export function ExceptionsTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
}: {
  rows: Exception[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
}) {
  const columns: Column<Exception>[] = [
    {
      key: "reference",
      header: "Reference",
      sortable: true,
      mobileLabel: "",
      cell: (row) => (
        <Link
          href={`/exceptions/${row.id}`}
          className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline"
        >
          {row.reference}
        </Link>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      sortable: true,
      mobileLabel: "Severity",
      cell: (row) => <SeverityBadge severity={row.severity} />,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      mobileLabel: "Status",
      cell: (row) => <ExceptionStatusBadge status={row.status} />,
    },
    {
      key: "title",
      header: "Problem",
      sortable: true,
      mobileLabel: "Problem",
      cell: (row) => (
        <div className="min-w-0">
          <p className="max-w-[26rem] truncate text-sm font-medium">{row.title}</p>
          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            {humanise(row.type)}
          </p>
        </div>
      ),
    },
    {
      key: "linked",
      header: "Linked to",
      mobileLabel: "Linked",
      cell: (row) => {
        const link = linkedTo(row);
        return link ? (
          <Link
            href={link.href}
            className="font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {link.label}
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
    {
      key: "owner",
      header: "Owner",
      mobileLabel: "Owner",
      cell: (row) =>
        row.ownerName ? (
          <span className="block max-w-[9rem] truncate text-sm">{row.ownerName}</span>
        ) : (
          <span className="text-xs font-medium text-warning">Unowned</span>
        ),
    },
    {
      key: "dueAt",
      header: "Due",
      sortable: true,
      mobileLabel: "Due",
      cell: (row) => <span className="text-xs tabular-nums">{formatWhen(row.dueAt)}</span>,
    },
    {
      key: "createdAt",
      header: "Raised",
      sortable: true,
      mobileLabel: "Raised",
      defaultHidden: true,
      cell: (row) => <span className="text-xs tabular-nums">{formatWhen(row.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      mobileLabel: "",
      hideOnMobile: true,
      cell: (row) => (
        <Link
          href={`/exceptions/${row.id}`}
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          Open
        </Link>
      ),
    },
  ];

  return (
    <DataTable<Exception>
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      sort={sort}
      dir={dir}
      rowKey={(row) => row.id}
      rowHref={(row) => `/exceptions/${row.id}`}
      searchPlaceholder="Search reference, problem, tracking number…"
      caption={`${total} exception${total === 1 ? "" : "s"} match the current filters`}
      emptyTitle="No exceptions match these filters"
      emptyDescription="Either the queue is genuinely clear for this view, or a filter is hiding the work. Clear the filters to confirm."
    />
  );
}
