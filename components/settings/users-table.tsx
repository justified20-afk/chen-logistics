"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown, Loader2 } from "lucide-react";
import { DataTable, type Column } from "@/components/tables/data-table";
import { StatusBadge, humanise } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_DEFINITIONS, type RoleKey } from "@/types/permissions";
import { updateUserAction } from "@/lib/actions/system";
import type { UserRecord } from "@/types/domain";

const STATUS_TONES = {
  active: "success",
  suspended: "danger",
  invited: "info",
} as const;

export function UsersTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  currentUserId,
}: {
  rows: UserRecord[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (user: UserRecord, patch: Record<string, unknown>, success: string) => {
    setError(null);
    startTransition(async () => {
      const payload = await updateUserAction({ userId: user.id, ...patch });
      if (!payload.ok) {
        setError(payload.error);
        toast.error(payload.error);
        return;
      }
      toast.success(success);
      router.refresh();
    });
  };

  const columns: Column<UserRecord>[] = [
    {
      key: "name",
      header: "User",
      sortable: true,
      mobileLabel: "",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {row.name}
            {row.id === currentUserId ? (
              <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">(you)</span>
            ) : null}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      mobileLabel: "Role",
      cell: (row) => (
        <span className="text-xs font-medium capitalize">{humanise(row.role)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      mobileLabel: "Status",
      cell: (row) => (
        <StatusBadge label={humanise(row.status)} tone={STATUS_TONES[row.status] ?? "neutral"} />
      ),
    },
    {
      key: "lastLoginAt",
      header: "Last sign-in",
      sortable: true,
      mobileLabel: "Last sign-in",
      cell: (row) => (
        <span className="text-xs tabular-nums">
          {row.lastLoginAt
            ? new Date(row.lastLoginAt).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Never"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      mobileLabel: "Created",
      defaultHidden: true,
      cell: (row) => (
        <span className="text-xs tabular-nums">
          {new Date(row.createdAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "2-digit",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      mobileLabel: "",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8" disabled={pending}>
              {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
              Manage <ChevronDown className="size-3.5" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>Change role</DropdownMenuLabel>
            {ROLE_DEFINITIONS.map((role) => (
              <DropdownMenuItem
                key={role.key}
                disabled={row.role === role.key}
                onSelect={() => run(row, { role: role.key as RoleKey }, `${row.name} → ${role.name}`)}
              >
                {role.name}
                {row.role === role.key ? " · current" : ""}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Account status</DropdownMenuLabel>
            <DropdownMenuItem
              disabled={row.status === "active"}
              onSelect={() => run(row, { status: "active" }, `${row.name} reactivated`)}
            >
              Reactivate
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              disabled={row.status === "suspended" || row.id === currentUserId}
              onSelect={() => run(row, { status: "suspended" }, `${row.name} suspended`)}
            >
              Suspend
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
      <DataTable<UserRecord>
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        sort={sort}
        dir={dir}
        rowKey={(row) => row.id}
        searchPlaceholder="Search name or email…"
        caption={`${total} user${total === 1 ? "" : "s"} match the current filters`}
        emptyTitle="No users match these filters"
        emptyDescription="Clear the filters to see every account with access to the system."
      />
    </>
  );
}
