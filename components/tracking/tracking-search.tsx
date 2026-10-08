"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function TrackingSearch({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = value.trim();
    if (query.length < 3) {
      setError("Enter a full tracking number (for example CH-10482).");
      return;
    }
    setPending(true);
    router.push(`/tracking/${encodeURIComponent(query.toUpperCase())}`);
  };

  return (
    <form onSubmit={submit} className="space-y-1.5" noValidate>
      <div className="flex gap-2">
        <label htmlFor="tracking-lookup" className="sr-only">
          Tracking number
        </label>
        <Input
          id="tracking-lookup"
          value={value}
          autoFocus={autoFocus}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          placeholder="Enter tracking number, e.g. CH-10482"
          className="h-11 flex-1 bg-card"
          autoComplete="off"
        />
        <Button type="submit" className="h-11 px-4" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />}
          Track
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
