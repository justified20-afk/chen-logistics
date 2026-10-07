import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          404
        </p>
        <h1 className="heading text-3xl font-semibold">That page is not part of the system</h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          The route you requested does not exist, or the record it points to has been removed.
          Check the address, or return to the operations dashboard.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Go to dashboard
        </Link>
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium"
        >
          {APP_NAME} home
        </Link>
      </div>
      <p className="text-xs text-muted-foreground">{APP_TAGLINE}</p>
    </main>
  );
}
