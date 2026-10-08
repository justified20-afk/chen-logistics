"use client";

import { useEffect } from "react";
import { RotateCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[chen] unhandled route error", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-danger">Error</p>
        <h1 className="heading text-3xl font-semibold">We couldn&apos;t load this view</h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          The operation failed before the page could render. Nothing was changed. Try again — if
          it keeps failing, share the reference <span className="font-mono">{error.digest}</span>{" "}
          with your administrator.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        <RotateCw className="h-4 w-4" aria-hidden />
        Try again
      </button>
    </main>
  );
}
