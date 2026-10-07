"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Customer } from "@/types/domain";

const ACCOUNT_TONES = {
  active: "success",
  on_hold: "warning",
  closed: "neutral",
} as const;

export function CustomersTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
}: {
  rows: Customer[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
}) {
  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: "Customer",
      sortable: true,
      mobileLabel: "",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <p className="font-mono text-[11px] text-muted-foreground">{row.code}</p>
        </div>
      ),
    },
    {
      key: "kind",
      header: "Type",
      mobileLabel: "Type",
      cell: (row) => (
        <span className="text-xs capitalize">{row.kind === "business" ? "Business" : "Personal"}</span>
      ),
    },
    {
      key: "contactPerson",
      header: "Contact",
      mobileLabel: "Contact",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{row.contactPerson}</p>
          <p className="truncate text-[11px] text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      mobileLabel: "Phone",
      defaultHidden: true,
      cell: (row) => <span className="text-xs tabular-nums">{row.phone}</span>,
    },
    {
      key: "city",
      header: "City",
      mobileLabel: "City",
      cell: (row) => <span className="text-xs">{row.addresses[0]?.city ?? "—"}</span>,
    },
    {
      key: "creditTermsDays",
      header: "Terms",
      sortable: true,
      align: "right",
      mobileLabel: "Terms",
      cell: (row) => (
        <span className="text-xs tabular-nums">{row.creditTermsDays ? `${row.creditTermsDays}d` : "—"}</span>
      ),
    },
    {
      key: "accountStatus",
      header: "Account",
      sortable: true,
      mobileLabel: "Account",
      cell: (row) => (
        <StatusBadge
          label={row.accountStatus.replace("_", " ")}
          tone={ACCOUNT_TONES[row.accountStatus] ?? "neutral"}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      mobileLabel: "",
      cell: (row) => (
        <Link
          href={`/customers/${row.id}`}
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          Open
        </Link>
      ),
    },
  ];

  return (
    <DataTable<Customer>
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      sort={sort}
      dir={dir}
      rowKey={(row) => row.id}
      rowHref={(row) => `/customers/${row.id}`}
      searchPlaceholder="Search name, contact, email…"
      caption={`${total} customer${total === 1 ? "" : "s"} match the current filters`}
      emptyTitle="No customers match these filters"
      emptyDescription="Clear the filters, or register the customer from the shipments screen."
    />
  );
}
