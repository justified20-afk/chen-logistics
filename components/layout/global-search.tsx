"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, CornerDownLeft } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { searchAction } from "@/lib/actions/portal";
import type { SearchResult } from "@/types/domain";

const KIND_LABELS: Record<SearchResult["kind"], string> = {
  shipment: "Shipments",
  customer: "Customers",
  invoice: "Invoices",
  trip: "Trips",
  driver: "Drivers",
  vehicle: "Vehicles",
  exception: "Exceptions",
};

export function GlobalSearch({ variant = "header" }: { variant?: "header" | "compact" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const runSearch = useCallback(async (value: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const found = await searchAction(value);
        setResults(found);
        setError(null);
      } catch {
        setError("Search is unavailable right now. Try again in a moment.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);
  }, []);

  const grouped = KIND_LABELS;
  const select = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(result.href);
  };

  return (
    <>
      <SearchTrigger onOpen={() => setOpen(true)} variant={variant} />
      <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Global search"
      description="Search tracking numbers, customers, invoices, trips, drivers and vehicles"
    >
      <Command shouldFilter={false}>
        <CommandInput
          value={query}
          onValueChange={(value) => {
            setQuery(value);
            void runSearch(value);
          }}
          placeholder="Tracking number, customer, invoice, trip, driver, vehicle…"
        />
        <CommandList>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Searching…
            </div>
          ) : error ? (
            <CommandEmpty>{error}</CommandEmpty>
          ) : results.length === 0 ? (
            <CommandEmpty>
              {query.trim().length < 2
                ? "Type at least two characters to search across the system."
                : `No records match “${query}”.`}
            </CommandEmpty>
          ) : (
            Object.entries(grouped).map(([kind, label]) => {
              const items = results.filter((result) => result.kind === kind);
              if (items.length === 0) return null;
              return (
                <CommandGroup key={kind} heading={label}>
                  {items.map((result) => (
                    <CommandItem
                      key={`${result.kind}-${result.id}`}
                      value={`${result.kind}-${result.id}`}
                      onSelect={() => select(result)}
                    >
                      <span className="truncate">{result.label}</span>
                      {result.sublabel ? (
                        <span className="ml-2 truncate text-xs text-muted-foreground">
                          {result.sublabel}
                        </span>
                      ) : null}
                      <CornerDownLeft
                        className="ml-auto size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })
          )}
        </CommandList>
      </Command>
      </CommandDialog>
    </>
  );
}

export function SearchTrigger({
  onOpen,
  variant = "header",
}: {
  onOpen: () => void;
  variant?: "header" | "compact";
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open global search"
      className={
        variant === "header"
          ? "hidden h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:bg-surface-hover md:flex"
          : "flex h-10 w-full items-center gap-2 rounded-md border border-border bg-card px-3 text-sm text-muted-foreground"
      }
      style={variant === "header" ? { width: "14rem" } : undefined}
    >
      <Search className="size-4" aria-hidden />
      <span className="truncate">Search anything…</span>
      <kbd className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
        ⌘K
      </kbd>
    </button>
  );
}
