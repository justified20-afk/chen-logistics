"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Download, PackagePlus } from "lucide-react";
import { DataTable, type Column } from "@/components/tables/data-table";
import {
  PaymentStatusBadge,
  ShipmentStatusBadge,
  StatusBadge,
} from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { bulkShipmentHubAction, bulkShipmentPriorityAction } from "@/lib/actions/shipments";
import type { Shipment } from "@/types/domain";

function formatWhen(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

export function ShipmentsTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  canEdit,
  canCreate = true,
  canExport = true,
  createHref = "/shipments/new",
  hubs,
  currency,
}: {
  rows: Shipment[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  canEdit: boolean;
  canCreate?: boolean;
  canExport?: boolean;
  createHref?: string;
  hubs: { value: string; label: string }[];
  currency: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const columns: Column<Shipment>[] = [
    {
      key: "trackingNumber",
      header: "Tracking",
      sortable: true,
      mobileLabel: "",
      cell: (row) => (
        <Link
          href={`/shipments/${row.id}`}
          className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline"
        >
          {row.trackingNumber}
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      sortable: true,
      mobileLabel: "Customer",
      cell: (row) => (
        <span className="block max-w-[12rem] truncate text-sm">{row.customerName ?? "—"}</span>
      ),
    },
    {
      key: "destination",
      header: "Destination",
      sortable: false,
      mobileLabel: "Destination",
      cell: (row) => (
        <span className="block max-w-[11rem] truncate text-sm">
          {row.recipient.city}, {row.recipient.state}
        </span>
      ),
    },
    {
      key: "originHub",
      header: "Origin hub",
      mobileLabel: "Hub",
      defaultHidden: true,
      cell: (row) => <span className="text-xs">{row.originHubName ?? "—"}</span>,
    },
    {
      key: "serviceLevel",
      header: "Service",
      sortable: false,
      mobileLabel: "Service",
      cell: (row) => (
        <span className="text-xs capitalize">{row.serviceLevel.replace("_", " ")}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      mobileLabel: "Status",
      cell: (row) => (
        <span className="flex flex-wrap items-center gap-1">
          <ShipmentStatusBadge status={row.status} />
          {row.delayedReason ? <StatusBadge label="Delayed" tone="danger" /> : null}
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
          <StatusBadge label="Unassigned" tone="warning" dot={false} />
        ),
    },
    {
      key: "promisedDeliveryAt",
      header: "Promised",
      sortable: true,
      mobileLabel: "Promised",
      cell: (row) => <span className="text-xs tabular-nums">{formatWhen(row.promisedDeliveryAt)}</span>,
    },
    {
      key: "paymentStatus",
      header: "Payment",
      mobileLabel: "Payment",
      cell: (row) => <PaymentStatusBadge status={row.paymentStatus} />,
    },
    {
      key: "cod",
      header: "COD",
      sortable: true,
      align: "right",
      mobileLabel: "COD",
      cell: (row) => (
        <span className="text-xs tabular-nums">
          {row.codAmountMinor ? formatMoney(row.codAmountMinor, currency) : "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      mobileLabel: "Created",
      defaultHidden: true,
      cell: (row) => <span className="text-xs tabular-nums">{formatWhen(row.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      mobileLabel: "",
      hideOnMobile: true,
      cell: (row) => (
        <Link
          href={`/shipments/${row.id}`}
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          Open
        </Link>
      ),
    },
  ];

  const runBulk = (action: "priority" | "hub", value: string) => {
    startTransition(async () => {
      const payload =
        action === "priority"
          ? await bulkShipmentPriorityAction({ shipmentIds: selected, priority: value })
          : await bulkShipmentHubAction({ shipmentIds: selected, hubId: value });

      if (!payload.ok) {
        toast.error(payload.error);
        return;
      }
      const { succeeded, failed, skipped, reasons } = payload.data;
      const breakdown = Object.entries(reasons)
        .map(([reason, count]) => `${reason} ×${count}`)
        .join(", ");
      toast.success(
        `${succeeded} updated · ${skipped} skipped${failed ? ` · ${failed} failed` : ""}${
          breakdown ? ` — ${breakdown}` : ""
        }`,
      );
      setSelected([]);
      router.refresh();
    });
  };

  return (
    <DataTable<Shipment>
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      sort={sort}
      dir={dir}
      rowKey={(row) => row.id}
      rowHref={(row) => `/shipments/${row.id}`}
      searchPlaceholder="Search tracking number, recipient, phone…"
      caption={`${total} shipment${total === 1 ? "" : "s"} match the current filters`}
      emptyTitle="No shipments match these filters"
      emptyDescription="Clear a filter or widen the date range. If you expected records here, check that the demo dataset has been seeded."
      emptyAction={
        canCreate ? (
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={createHref}>Create the first shipment</Link>
          </Button>
        ) : undefined
      }
      selectable={canEdit}
      selectedIds={selected}
      onSelectionChange={setSelected}
      bulkActions={
        <>
          <label className="sr-only" htmlFor="bulk-priority">
            Set priority
          </label>
          <select
            id="bulk-priority"
            className="h-8 rounded-md border border-input bg-card px-2 text-xs"
            defaultValue=""
            disabled={isPending}
            onChange={(event) => {
              if (event.target.value) runBulk("priority", event.target.value);
              event.target.value = "";
            }}
          >
            <option value="">Set priority…</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <label className="sr-only" htmlFor="bulk-hub">
            Assign to hub
          </label>
          <select
            id="bulk-hub"
            className="h-8 rounded-md border border-input bg-card px-2 text-xs"
            defaultValue=""
            disabled={isPending}
            onChange={(event) => {
              if (event.target.value) runBulk("hub", event.target.value);
              event.target.value = "";
            }}
          >
            <option value="">Assign to hub…</option>
            {hubs.map((hub) => (
              <option key={hub.value} value={hub.value}>
                {hub.label}
              </option>
            ))}
          </select>
        </>
      }
      toolbar={
        <>
          {canCreate ? (
            <Button type="button" variant="outline" size="sm" className="h-10" asChild>
              <Link href={createHref}>
                <PackagePlus className="size-4" aria-hidden />
                New shipment
              </Link>
            </Button>
          ) : null}
          {canExport ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10"
              onClick={() => {
                window.location.href = `/api/export/shipments?${window.location.search.slice(1)}`;
              }}
            >
              <Download className="size-4" aria-hidden />
              Export
            </Button>
          ) : null}
        </>
      }
    />
  );
}
