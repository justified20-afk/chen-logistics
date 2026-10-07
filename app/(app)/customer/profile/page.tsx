import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requirePermission } from "@/lib/session";
import { getDb } from "@/lib/mongodb";
import { oid, toDomain } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card, StatusBadge } from "@/components/ui/status-badge";
import type { Customer } from "@/types/domain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My profile",
  robots: { index: false, follow: false },
};

export default async function CustomerProfilePage(): Promise<React.JSX.Element> {
  const user = await requirePermission("customer.portal");
  const db = await getDb();
  const doc = user.customerId
    ? await db.collection("customers").findOne({ _id: oid(user.customerId) } as never)
    : null;
  const customer = doc ? toDomain<Customer>(doc) : null;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="My profile"
        description="The account record your shipments and invoices are billed against."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Account">
          {customer ? (
            <dl className="space-y-3 text-sm">
              <Fact label="Account name" value={customer.name} />
              <Fact label="Account code" value={customer.code} />
              <Fact label="Kind" value={customer.kind === "business" ? "Business" : "Personal"} />
              <Fact
                label="Status"
                value={
                  <StatusBadge
                    label={customer.accountStatus.replace("_", " ")}
                    tone={customer.accountStatus === "active" ? "success" : customer.accountStatus === "on_hold" ? "warning" : "neutral"}
                  />
                }
              />
              <Fact label="Credit terms" value={customer.creditTermsDays ? `${customer.creditTermsDays} days` : "Prepaid"} />
              <Fact label="Contact" value={customer.contactPerson} />
              <Fact label="Email" value={customer.email} />
              <Fact label="Phone" value={customer.phone} />
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No customer record is linked to your login.</p>
          )}
        </Card>
        <Card title="Sign-in">
          <dl className="space-y-3 text-sm">
            <Fact label="Name" value={user.name} />
            <Fact label="Email" value={user.email} />
            <Fact label="Role" value="Customer portal" />
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            To change your email, phone or credit terms, contact your account manager — portal accounts
            cannot edit their own billing record.
          </p>
        </Card>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
