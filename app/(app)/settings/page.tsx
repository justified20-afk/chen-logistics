import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { getSettings } from "@/lib/system";
import { getDb } from "@/lib/mongodb";
import { toDomainList } from "@/lib/db";
import { envSummary } from "@/lib/env";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, StatusBadge } from "@/components/ui/status-badge";
import { SettingsForm } from "@/components/settings/settings-form";
import type { Hub, SystemSettings } from "@/types/domain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage(): Promise<React.JSX.Element> {
  const user = await requirePermission("settings.manage");
  const settings = (await getSettings()) ?? ({
    id: "system",
    companyName: "Chen Logistics",
    tagline: "Delivering fast, reliable shipping and logistics solutions.",
    currency: "NGN",
    timezone: "Africa/Lagos",
    defaultServiceLevel: "standard",
    delayThresholdHours: 6,
    complianceWarningDays: 30,
    invoicePrefix: "INV",
    codEnabled: true,
    capacityWarningRatio: 0.9,
    demoDataNotice: "Demo dataset.",
    updatedAt: new Date().toISOString(),
  } satisfies SystemSettings);

  const db = await getDb();
  const hubDocs = await db.collection("hubs").find({}).sort({ name: 1 }).toArray();
  const hubs = toDomainList<Hub>(hubDocs);
  const env = envSummary();

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Settings"
        description="System-wide defaults. Changes are audited with the actor, the before value and the after value."
        actions={
          user.permissions.includes("users.manage") ? (
            <Link
              href="/settings/users"
              className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-surface-hover"
            >
              Manage users
            </Link>
          ) : null
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card
          title="Company and operations"
          description="Applied across booking, invoicing and delay detection"
          className="lg:col-span-2"
        >
          <SettingsForm
            settings={settings}
            hubs={hubs.map((hub) => ({ value: hub.id, label: hub.name }))}
          />
        </Card>

        <div className="space-y-5">
          <Card title="Integrations" description="Reported honestly — never faked">
            <ul className="space-y-3">
              <Integration
                name="Stripe payments"
                configured={env.stripe.configured}
                reason={env.stripe.reason}
              />
              <Integration name="Mapping" configured={env.map.configured} reason={env.map.reason} />
              <Integration
                name="OAuth providers"
                configured={env.oauth.google || env.oauth.github}
                reason={env.oauth.reason}
              />
            </ul>
          </Card>

          <Card title="Runtime">
            <dl className="space-y-3 text-sm">
              <Fact label="Environment" value={env.nodeEnv} />
              <Fact
                label="Database"
                value={env.mongoUriConfigured ? "External MONGO_URI" : "Local dev database"}
              />
              <Fact label="Base URL" value={env.baseUrl} />
              <Fact
                label="Auth secret"
                value={env.authSecretConfigured ? "From environment" : "Development fallback"}
              />
            </dl>
            <p className="mt-4 rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
              {settings.demoDataNotice}
            </p>
          </Card>

          <Card title="Administration">
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/settings/users" className="font-medium text-primary underline-offset-4 hover:underline">
                  Users and roles
                </Link>
                <p className="text-xs text-muted-foreground">Invite, promote, suspend.</p>
              </li>
              <li>
                <Link href="/settings/roles" className="font-medium text-primary underline-offset-4 hover:underline">
                  Permission matrix
                </Link>
                <p className="text-xs text-muted-foreground">What each role can do.</p>
              </li>
              <li>
                <Link href="/settings/audit-log" className="font-medium text-primary underline-offset-4 hover:underline">
                  Audit log
                </Link>
                <p className="text-xs text-muted-foreground">Immutable record of every change.</p>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Integration({ name, configured, reason }: { name: string; configured: boolean; reason: string }) {
  return (
    <li>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{name}</span>
        <StatusBadge label={configured ? "Configured" : "Not configured"} tone={configured ? "success" : "warning"} />
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{reason}</p>
    </li>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
