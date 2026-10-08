import Link from "next/link";
import { APP_TAGLINE } from "@/lib/brand";
import { ChenLogo } from "@/components/brand/chen-logo";
import { ChenLandscape } from "@/components/brand/chen-landscape";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-primary px-5 py-4 text-primary-foreground sm:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="rounded-md" aria-label="Chen Logistics — home">
            <ChenLogo size="sm" variant="onPrimary" />
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/tracking"
              className="text-sm text-primary-foreground/70 hover:text-primary-foreground"
            >
              Track a shipment
            </Link>
          </nav>
        </div>
        <ChenLandscape className="mt-4 h-14 w-full rounded-md sm:h-20" />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {children}
          <p className="mt-8 text-center text-xs text-muted-foreground">{APP_TAGLINE}</p>
        </div>
      </main>
    </div>
  );
}
