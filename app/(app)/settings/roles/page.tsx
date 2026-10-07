import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { requirePermission } from "@/lib/session";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/status-badge";
import { PERMISSIONS, ROLE_DEFINITIONS } from "@/types/permissions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Roles",
  robots: { index: false, follow: false },
};

export default async function RolesPage(): Promise<React.JSX.Element> {
  await requirePermission("users.manage");

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Back to settings
      </Link>

      <PageHeader
        title="Roles and permissions"
        description="Eight roles, thirty-two permissions. Hiding a button is never the boundary — every page and every server action checks these grants again."
        badge={
          <span className="inline-flex items-center gap-1.5 rounded border border-brand/40 bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
            <ShieldCheck className="size-3.5" aria-hidden />
            Server-enforced
          </span>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {ROLE_DEFINITIONS.map((role) => (
          <Card
            key={role.key}
            title={
              <span className="flex items-center justify-between gap-2">
                <span>{role.name}</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  {role.permissions.length} / {PERMISSIONS.length}
                </span>
              </span>
            }
            description={role.description}
          >
            <div className="flex flex-wrap gap-1.5">
              {PERMISSIONS.map((permission) => {
                const granted = role.permissions.includes(permission);
                return (
                  <span
                    key={permission}
                    className={
                      granted
                        ? "rounded border border-success/30 bg-success/10 px-1.5 py-0.5 text-[11px] font-medium text-success"
                        : "rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] text-muted-foreground/60 line-through"
                    }
                  >
                    {permission}
                  </span>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
