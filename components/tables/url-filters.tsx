"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { Filter, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

export interface FilterOption {
  value: string;
  label: string;
}

/** Select that writes straight into the URL so filters survive reload and sharing. */
export function UrlSelect({
  param,
  label,
  options,
  allLabel = "All",
  className,
}: {
  param: string;
  label: string;
  options: FilterOption[];
  allLabel?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const value = searchParams.get(param) ?? "all";

  const commit = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!next || next === "all") params.delete(param);
    else params.set(param, next);
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className={cn("min-w-[9rem]", className)}>
      <label className="sr-only" htmlFor={`filter-${param}`}>
        {label}
      </label>
      <Select value={value} onValueChange={commit} disabled={isPending}>
        <SelectTrigger id={`filter-${param}`} className="h-10 w-full bg-card text-sm">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function UrlDateFilter({
  param,
  label,
}: {
  param: string;
  label: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get(param) ?? "";

  return (
    <div className="min-w-[9rem]">
      <label className="sr-only" htmlFor={`filter-${param}`}>
        {label}
      </label>
      <input
        id={`filter-${param}`}
        type="date"
        value={value}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          if (event.target.value) params.set(param, event.target.value);
          else params.delete(param);
          params.delete("page");
          router.push(`${pathname}?${params.toString()}`, { scroll: false });
        }}
        className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-xs"
      />
    </div>
  );
}

export function FilterBar({ children, activeCount = 0 }: { children: ReactNode; activeCount?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Filter className="size-3.5" aria-hidden />
        Filters
        {activeCount > 0 ? (
          <span className="rounded bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
            {activeCount}
          </span>
        ) : null}
      </span>
      {children}
      {activeCount > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 text-muted-foreground"
          onClick={() => router.push(pathname, { scroll: false })}
        >
          <X className="size-3.5" aria-hidden />
          Clear
        </Button>
      ) : null}
    </div>
  );
}
