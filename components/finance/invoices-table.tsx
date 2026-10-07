"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/tables/data-table";
import { InvoiceStatusBadge } from "@/components/ui/status-badge";
import { formatMoney } from "@/lib/money";
import type { Invoice } from "@/types/domain";

function formatDate(value?: string): { text: string; overdue: boolean } {
  if (!value) return { text: "—", overdue: false };
  const date = new Date(value);
  return {
    text: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }),
    overdue: date.getTime() < Date.now(),
  };
}

export function InvoicesTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  currency,
  showCustomer = true,
}: {
  rows: Invoice[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  currency: string;
  showCustomer?: boolean;
}) {
  const columns: Column<Invoice>[] = [
    {
      key: "invoiceNumber",
      header: "Invoice",
      sortable: true,
      mobileLabel: "",
      cell: (row) => (
        <Link
          href={`/finance/invoices/${row.id}`}
          className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline"
        >
          {row.invoiceNumber}
        </Link>
      ),
    },
    ...(showCustomer
      ? [
          {
            key: "customer",
            header: "Customer",
            sortable: false,
            mobileLabel: "Customer",
            cell: (row: Invoice) => (
              <span className="block max-w-[12rem] truncate text-sm">
                {row.customerName ?? "—"}
              </span>
            ),
          } satisfies Column<Invoice>,
        ]
      : []),
    {
      key: "totalMinor",
      header: "Total",
      sortable: true,
      align: "right",
      mobileLabel: "Total",
      cell: (row) => (
        <span className="text-xs tabular-nums">{formatMoney(row.totalMinor, row.currency || currency)}</span>
      ),
    },
    {
      key: "balanceMinor",
      header: "Balance",
      sortable: true,
      align: "right",
      mobileLabel: "Balance",
      cell: (row) => (
        <span
          className={
            row.balanceMinor > 0
              ? "text-xs font-medium tabular-nums text-warning"
              : "text-xs tabular-nums text-muted-foreground"
          }
        >
          {formatMoney(row.balanceMinor, row.currency || currency)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      mobileLabel: "Status",
      cell: (row) => <InvoiceStatusBadge status={row.status} />,
    },
    {
      key: "dueAt",
      header: "Due",
      sortable: true,
      mobileLabel: "Due",
      cell: (row) => {
        const due = formatDate(row.dueAt);
        return (
          <span className={due.overdue && row.balanceMinor > 0 ? "text-xs font-medium tabular-nums text-danger" : "text-xs tabular-nums"}>
            {due.text}
            {due.overdue && row.balanceMinor > 0 ? " · overdue" : ""}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      header: "Issued",
      sortable: true,
      mobileLabel: "Issued",
      defaultHidden: true,
      cell: (row) => <span className="text-xs tabular-nums">{formatDate(row.createdAt).text}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      mobileLabel: "",
      cell: (row) => (
        <Link
          href={`/finance/invoices/${row.id}`}
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          Open
        </Link>
      ),
    },
  ];

  return (
    <DataTable<Invoice>
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      sort={sort}
      dir={dir}
      rowKey={(row) => row.id}
      rowHref={(row) => `/finance/invoices/${row.id}`}
      searchPlaceholder="Search invoice number or customer…"
      caption={`${total} invoice${total === 1 ? "" : "s"} match the current filters`}
      emptyTitle="No invoices match these filters"
      emptyDescription="Invoices are created by finance from the billing screen or from a customer account."
    />
  );
}
