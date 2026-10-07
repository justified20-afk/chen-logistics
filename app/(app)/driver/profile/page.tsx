import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { getDb } from "@/lib/mongodb";
import { oid, toDomain } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card, DriverStatusBadge } from "@/components/ui/status-badge";
import type { Driver } from "@/types/domain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My profile",
  robots: { index: false, follow: false },
};

export default async function DriverProfilePage(): Promise<React.JSX.Element> {
  const user = await requirePermission("driver.portal");
  const db = await getDb();
  const doc = user.driverId
    ? await db.collection("drivers").findOne({ _id: oid(user.driverId) } as never)
    : null;
  const driver = doc ? toDomain<Driver>(doc) : null;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="My profile"
        description="Your driver record as held by operations. Contact dispatch if anything here is wrong."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Driver record">
          {driver ? (
            <dl className="space-y-3 text-sm">
              <Fact label="Name" value={driver.name} />
              <Fact label="Employee ID" value={driver.employeeId} />
              <Fact label="Phone" value={driver.phone} />
              <Fact label="Base hub" value={driver.hubName ?? "—"} />
              <Fact label="Licensed vehicle" value={driver.vehicleRegistration ?? "—"} />
              <Fact
                label="Status"
                value={<DriverStatusBadge status={driver.status} />}
              />
              <Fact label="License" value={driver.licenseNumber} />
              <Fact
                label="License expires"
                value={driver.licenseExpiry ? new Date(driver.licenseExpiry).toLocaleDateString("en-GB") : "—"}
              />
              <Fact label="Completed jobs" value={driver.completedJobs.toLocaleString("en-US")} />
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No driver record is linked to your login.</p>
          )}
        </Card>
        <Card title="Sign-in">
          <dl className="space-y-3 text-sm">
            <Fact label="Name" value={user.name} />
            <Fact label="Email" value={user.email} />
            <Fact label="Role" value="Driver" />
          </dl>
        </Card>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
