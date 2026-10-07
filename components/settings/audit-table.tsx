"use client";

import { DataTable, type Column } from "@/components/tables/data-table";
import { humanise } from "@/components/ui/status-badge";
import type { AuditLog } from "@/types/domain";

function Json({ label, value }: { label: string; value: unknown }) {
  if (value === undefined || value === null) return null;
  return (
    <div className="mt-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <pre className="mt-0.5 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded bg-background p-2 text-[11px] leading-snug text-muted-foreground">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export function AuditTable({
  rows,
  total,
  page,
  pageSize,
}: {
  rows: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const columns: Column<AuditLog>[] = [
    {
      key: "createdAt",
      header: "When",
      sortable: false,
      mobileLabel: "",
      cell: (row) => (
        <span className="text-xs tabular-nums">
          {new Date(row.createdAt).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      mobileLabel: "Action",
      cell: (row) => (
        <span className="font-mono text-xs font-semibold">{humanise(row.action)}</span>
      ),
    },
    {
      key: "entity",
      header: "Record",
      mobileLabel: "Record",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{row.entityLabel ?? row.entityId}</p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {row.entityType}
          </p>
        </div>
      ),
    },
    {
      key: "actor",
      header: "Actor",
      mobileLabel: "Actor",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{row.actorName ?? "system"}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {row.actorRole ? humanise(row.actorRole) : ""}
            {row.ip ? ` · ${row.ip}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "changes",
      header: "Before / after",
      mobileLabel: "Change",
      cell: (row) => (
        <details className="max-w-[24rem]">
          <summary className="cursor-pointer select-none text-xs font-medium text-primary underline-offset-4 hover:underline">
            View payload
          </summary>
          <div className="mt-1">
            <Json label="Before" value={row.before} />
            <Json label="After" value={row.after} />
          </div>
        </details>
      ),
    },
  ];

  return (
    <DataTable<AuditLog>
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      rowKey={(row) => row.id}
      searchPlaceholder="Search action, record label, actor…"
      hideSearch={false}
      caption={`${total} audit entr${total === 1 ? "y" : "ies"} match the current filters`}
      emptyTitle="No audit entries match these filters"
      emptyDescription="Audit records are append-only. Widen the date range or clear the filters."
    />
  );
}
