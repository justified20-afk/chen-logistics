"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Loader2,
  Search,
  SearchX,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  align?: "left" | "right" | "center";
  /** Label used in the mobile card layout. Omit to hide on mobile. */
  mobileLabel?: string;
  hideOnMobile?: boolean;
  /** Hidden by default in the column visibility menu. */
  optional?: boolean;
  defaultHidden?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  rowKey: (row: T) => string;
  searchPlaceholder?: string;
  searchParam?: string;
  hideSearch?: boolean;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: ReactNode;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  bulkActions?: ReactNode;
  /** Optional primary link target per row (desktop). */
  rowHref?: (row: T) => string;
  toolbar?: ReactNode;
  caption?: string;
}

export function DataTable<T>({
  columns,
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  rowKey,
  searchPlaceholder = "Search…",
  searchParam = "q",
  hideSearch = false,
  emptyTitle,
  emptyDescription,
  emptyAction,
  selectable = false,
  selectedIds,
  onSelectionChange,
  bulkActions,
  rowHref,
  toolbar,
  caption,
}: DataTableProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const activeSort = sort ?? "";
  const activeDir = dir ?? "desc";

  const urlSearch = searchParams.get(searchParam) ?? "";
  const [searchValue, setSearchValue] = useState(urlSearch);
  // Value currently reflected in the URL, used to adopt external navigations
  // (back/forward, sibling filter controls) during render instead of in an effect.
  const [syncedSearch, setSyncedSearch] = useState(urlSearch);
  // The last value this table pushed itself, so a navigation landing in the
  // background never clobbers keystrokes typed after the push was issued.
  const [lastPushed, setLastPushed] = useState<string | null>(null);

  if (syncedSearch !== urlSearch) {
    setSyncedSearch(urlSearch);
    if (lastPushed !== urlSearch) setSearchValue(urlSearch);
  }

  const [hidden, setHidden] = useState<Set<string>>(
    () => new Set(columns.filter((column) => column.defaultHidden).map((column) => column.key)),
  );

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const handle = setTimeout(() => {
      const current = searchParams.get(searchParam) ?? "";
      if (searchValue !== current) {
        setLastPushed(searchValue);
        updateParams({ [searchParam]: searchValue, page: null });
      }
    }, 320);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const visibleColumns = useMemo(
    () => columns.filter((column) => !hidden.has(column.key)),
    [columns, hidden],
  );

  const mobileColumns = useMemo(
    () => columns.filter((column) => column.mobileLabel && !column.hideOnMobile && !hidden.has(column.key)),
    [columns, hidden],
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const allSelected = selectable && rows.length > 0 && rows.every((row) => selectedIds?.includes(rowKey(row)));
  const someSelected = selectable && (selectedIds?.length ?? 0) > 0 && !allSelected;

  const toggleAll = () => {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? [] : rows.map(rowKey));
  };

  const toggleRow = (id: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds ?? []);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange([...next]);
  };

  const goSort = (key: string) => {
    const nextDir = activeSort === key && activeDir === "desc" ? "asc" : "desc";
    updateParams({ sort: key, dir: nextDir, page: null });
  };

  const goToPage = (next: number) => {
    if (next < 1 || next > totalPages) return;
    updateParams({ page: String(next) });
  };

  const hasRows = rows.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {!hideSearch ? (
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <label htmlFor={`table-search-${searchParam}`} className="sr-only">
              {searchPlaceholder}
            </label>
            <Input
              id={`table-search-${searchParam}`}
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 pl-9"
              autoComplete="off"
            />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {toolbar}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-10">
                <Columns3 className="size-4" aria-hidden />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.key}
                  checked={!hidden.has(column.key)}
                  onCheckedChange={(checked) => {
                    setHidden((current) => {
                      const next = new Set(current);
                      if (checked) next.delete(column.key);
                      else next.add(column.key);
                      return next;
                    });
                  }}
                >
                  {typeof column.header === "string" ? column.header : column.key}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {selectable && (selectedIds?.length ?? 0) > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-brand/40 bg-brand/10 px-3 py-2 text-sm">
          <span className="font-medium">{selectedIds?.length} selected</span>
          <div className="flex flex-wrap gap-2">{bulkActions}</div>
          <button
            type="button"
            onClick={() => onSelectionChange?.([])}
            className="ml-auto text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Clear selection
          </button>
        </div>
      ) : null}

      <div className="relative rounded-lg border border-border bg-card">
        {isPending ? (
          <div className="absolute inset-0 z-10 grid place-items-center rounded-lg bg-background/60">
            <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden /> Applying…
            </span>
          </div>
        ) : null}

        {/* Desktop: dense table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full caption-top text-sm">
            {caption ? (
              <caption className="px-4 py-3 text-left text-xs text-muted-foreground">{caption}</caption>
            ) : null}
            <thead className="border-b border-border bg-muted/50">
              <tr>
                {selectable ? (
                  <th scope="col" className="w-10 px-3 py-2.5">
                    <Checkbox
                      checked={allSelected}
                      aria-label={allSelected ? "Deselect all rows" : "Select all rows"}
                      onCheckedChange={toggleAll}
                      data-state={someSelected ? "indeterminate" : undefined}
                    />
                  </th>
                ) : null}
                {visibleColumns.map((column) => {
                  const isSorted = activeSort === column.key;
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={
                        isSorted ? (activeDir === "asc" ? "ascending" : "descending") : "none"
                      }
                      className={cn(
                        "px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                        column.align === "right" && "text-right",
                        column.align === "center" && "text-center",
                        column.className,
                      )}
                    >
                      {column.sortable ? (
                        <button
                          type="button"
                          onClick={() => goSort(column.key)}
                          className="inline-flex items-center gap-1 rounded-sm uppercase tracking-wide hover:text-foreground"
                        >
                          {column.header}
                          {isSorted ? (
                            activeDir === "asc" ? (
                              <ArrowUp className="size-3" aria-hidden />
                            ) : (
                              <ArrowDown className="size-3" aria-hidden />
                            )
                          ) : (
                            <ArrowUpDown className="size-3 opacity-40" aria-hidden />
                          )}
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!hasRows ? (
                <tr>
                  <td colSpan={visibleColumns.length + (selectable ? 1 : 0)} className="px-4 py-16 text-center">
                    <EmptyState
                      title={emptyTitle}
                      description={emptyDescription}
                      action={emptyAction}
                    />
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const id = rowKey(row);
                  const selected = selectedIds?.includes(id) ?? false;
                  return (
                    <tr
                      key={id}
                      className={cn(
                        "group transition-colors hover:bg-surface-hover",
                        selected && "bg-brand/5",
                      )}
                    >
                      {selectable ? (
                        <td className="px-3 py-2.5 align-top">
                          <Checkbox
                            checked={selected}
                            aria-label={`Select row ${id}`}
                            onCheckedChange={() => toggleRow(id)}
                          />
                        </td>
                      ) : null}
                      {visibleColumns.map((column) => (
                        <td
                          key={column.key}
                          className={cn(
                            "px-3 py-2.5 align-top",
                            column.align === "right" && "text-right",
                            column.align === "center" && "text-center",
                            column.className,
                          )}
                        >
                          {column.cell(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile: intentional compact list, not a horizontally scrolling table */}
        <div className="divide-y divide-border md:hidden">
          {!hasRows ? (
            <div className="px-4 py-12">
              <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
            </div>
          ) : (
            rows.map((row) => {
              const id = rowKey(row);
              const selected = selectedIds?.includes(id) ?? false;
              const content = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {mobileColumns[0] ? (
                        <div className="truncate text-sm font-medium">{mobileColumns[0].cell(row)}</div>
                      ) : null}
                      {mobileColumns.slice(1, 3).map((column) => (
                        <div key={column.key} className="mt-1 flex items-baseline gap-2 text-xs">
                          <span className="shrink-0 text-muted-foreground">{column.mobileLabel}</span>
                          <span className="min-w-0 truncate">{column.cell(row)}</span>
                        </div>
                      ))}
                    </div>
                    {selectable ? (
                      <Checkbox
                        checked={selected}
                        aria-label={`Select row ${id}`}
                        onCheckedChange={() => toggleRow(id)}
                        className="mt-1"
                      />
                    ) : null}
                  </div>
                  {mobileColumns.slice(3).length > 0 ? (
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-border pt-2 text-xs">
                      {mobileColumns.slice(3).map((column) => (
                        <div key={column.key} className="min-w-0">
                          <span className="block text-muted-foreground">{column.mobileLabel}</span>
                          <span className="block truncate">{column.cell(row)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              );

              return rowHref ? (
                <Link
                  key={id}
                  href={rowHref(row)}
                  className={cn("block px-4 py-3 hover:bg-surface-hover", selected && "bg-brand/5")}
                >
                  {content}
                </Link>
              ) : (
                <div key={id} className={cn("px-4 py-3", selected && "bg-brand/5")}>
                  {content}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {hasRows ? (
            <>
              Showing <span className="font-medium text-foreground">{(page - 1) * pageSize + 1}</span>–
              <span className="font-medium text-foreground">
                {Math.min(page * pageSize, total)}
              </span>{" "}
              of <span className="font-medium text-foreground">{total}</span>
            </>
          ) : (
            `0 of 0 records`
          )}
          {caption ? <span className="ml-1">· {caption}</span> : null}
        </p>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1 || isPending}
          >
            <ChevronLeft className="size-4" aria-hidden />
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages || isPending}
          >
            Next
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-2 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <SearchX className="size-5" aria-hidden />}
      </span>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, retryHref }: { message: string; retryHref?: string }) {
  return (
    <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-6 text-center">
      <p className="text-sm font-semibold text-danger">{message}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Nothing was changed.{" "}
        {retryHref ? (
          <Link href={retryHref} className="font-medium text-primary underline-offset-4 hover:underline">
            Try again
          </Link>
        ) : (
          "Try again in a moment."
        )}
      </p>
    </div>
  );
}
