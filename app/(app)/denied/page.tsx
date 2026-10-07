import type { Metadata } from "next";
import Link from "next/link";
import { ShieldX } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { ROLE_LABELS } from "@/types/permissions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Access denied",
  robots: { index: false, follow: false },
};

export default async function DeniedPage(): Promise<React.JSX.Element> {
  const user = await getSessionUser();

  return (
    <div className="grid min-h-[70vh] place-items-center p-6">
      <div className="mx-auto max-w-md text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-danger/10 text-danger">
          <ShieldX className="size-6" aria-hidden />
        </span>
        <h1 className="heading mt-4 text-2xl font-semibold tracking-tight">Access denied</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {user ? (
            <>
              Your account is signed in as{" "}
              <span className="font-medium text-foreground">{ROLE_LABELS[user.role]}</span>, which
              does not have the permission required for that page. Nothing was changed.
            </>
          ) : (
            "You need to sign in with an account that has permission for that page."
          )}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Back to dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-surface-hover"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
