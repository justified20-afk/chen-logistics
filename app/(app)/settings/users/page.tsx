import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { listUsers, userFilterSchema, userStatusCounts } from "@/lib/system";
import { PageHeader } from "@/components/layout/page-header";
import { UsersTable } from "@/components/settings/users-table";
import { FilterBar, UrlSelect } from "@/components/tables/url-filters";
import { ROLE_DEFINITIONS } from "@/types/permissions";
import { USER_STATUSES } from "@/types/domain";
import { humanise } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Users",
  robots: { index: false, follow: false },
};

export default async function UsersPage({
  searchParams,
}: PageProps<"/settings/users">): Promise<React.JSX.Element> {
  const user = await requirePermission("users.manage");
  const raw = await searchParams;
  const plain: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    plain[key] = Array.isArray(value) ? value[0] : value;
  }
  const parsed = userFilterSchema.safeParse(plain);
  const filter = parsed.success ? parsed.data : {};

  const [result, counts] = await Promise.all([
    listUsers(filter),
    userStatusCounts(),
  ]);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Users"
        description="Who can sign in and what their role grants. Role changes are audited and notified to the affected user."
      />

      <div className="flex flex-wrap gap-2">
        {USER_STATUSES.map((status) => (
          <span
            key={status}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs"
          >
            <span className="font-medium">{humanise(status)}</span>
            <span className="tabular-nums text-muted-foreground">{counts[status] ?? 0}</span>
          </span>
        ))}
      </div>

      <div className="space-y-3">
        <FilterBar activeCount={[filter.q, filter.role, filter.status].filter(Boolean).length}>
          <UrlSelect
            param="role"
            label="Role"
            options={ROLE_DEFINITIONS.map((role) => ({ value: role.key, label: role.name }))}
            allLabel="Any role"
          />
          <UrlSelect
            param="status"
            label="Status"
            options={USER_STATUSES.map((value) => ({ value, label: humanise(value) }))}
            allLabel="Any status"
          />
        </FilterBar>

        <UsersTable
          rows={result.rows}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
          sort={filter.sort}
          dir={filter.dir}
          currentUserId={user.id}
        />
      </div>
    </div>
  );
}
