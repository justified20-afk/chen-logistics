import Link from "next/link";
import { Package } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { ValeLandscape } from "@/components/brand/vale-landscape";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-primary px-5 py-4 text-primary-foreground sm:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-md bg-brand text-brand-foreground">
              <Package className="size-4.5" aria-hidden />
            </span>
            <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
          </Link>
          <Link href="/tracking" className="text-sm text-primary-foreground/70 hover:text-primary-foreground">
            Track a shipment
          </Link>
        </div>
        <ValeLandscape className="mt-4 h-14 w-full rounded-md sm:h-20" />
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
