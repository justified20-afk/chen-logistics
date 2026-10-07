"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney } from "@/lib/money";
import { humanise } from "@/components/ui/status-badge";
import type { Payment } from "@/types/domain";

export function PaymentsTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  currency,
}: {
  rows: Payment[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  currency: string;
}) {
  const columns: Column<Payment>[] = [
    {
      key: "reference",
      header: "Reference",
      sortable: true,
      mobileLabel: "",
      cell: (row) => <span className="font-mono text-xs font-semibold">{row.reference}</span>,
    },
    {
      key: "receivedAt",
      header: "Received",
      sortable: true,
      mobileLabel: "Received",
      cell: (row) => (
        <span className="text-xs tabular-nums">
          {new Date(row.receivedAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "2-digit",
          })}
        </span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      mobileLabel: "Customer",
      cell: (row) => (
        <span className="block max-w-[11rem] truncate text-sm">{row.customerName ?? "—"}</span>
      ),
    },
    {
      key: "invoice",
      header: "Invoice",
      mobileLabel: "Invoice",
      cell: (row) =>
        row.invoiceId ? (
          <Link
            href={`/finance/invoices/${row.invoiceId}`}
            className="font-mono text-xs text-primary underline-offset-4 hover:underline"
          >
            {row.invoiceNumber ?? "Open"}
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "method",
      header: "Method",
      sortable: true,
      mobileLabel: "Method",
      cell: (row) => <span className="text-xs capitalize">{row.method.replace("_", " ")}</span>,
    },
    {
      key: "collectedByRole",
      header: "Collected by",
      mobileLabel: "Collected by",
      cell: (row) => (
        <span className="text-xs capitalize">{row.collectedByRole ? humanise(row.collectedByRole) : "—"}</span>
      ),
    },
    {
      key: "amountMinor",
      header: "Amount",
      sortable: true,
      align: "right",
      mobileLabel: "Amount",
      cell: (row) => (
        <span className="text-sm font-medium tabular-nums">
          {formatMoney(row.amountMinor, row.currency || currency)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      mobileLabel: "Status",
      defaultHidden: true,
      cell: (row) => (
        <StatusBadge
          label={humanise(row.status)}
          tone={row.status === "recorded" ? "success" : "neutral"}
        />
      ),
    },
    {
      key: "recordedBy",
      header: "Recorded by",
      mobileLabel: "By",
      defaultHidden: true,
      cell: (row) => <span className="text-xs">{row.recordedBy ?? "—"}</span>,
    },
  ];

  return (
    <DataTable<Payment>
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      sort={sort}
      dir={dir}
      rowKey={(row) => row.id}
      searchPlaceholder="Search reference, customer, invoice…"
      caption={`${total} payment${total === 1 ? "" : "s"} match the current filters`}
      emptyTitle="No payments match these filters"
      emptyDescription="Recorded payments appear here the moment finance enters them."
    />
  );
}
