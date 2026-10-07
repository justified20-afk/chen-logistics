# Vale Logistics — Build Log

Product: **Vale Logistics** — *Move with clarity. Deliver with control.*

This is the single meta/audit file for the build. Application source never contains
process markers.

---

## Phase A — Foundation ✅ 2026-10-05

Built:
- Next.js 16.3.8 App Router scaffold (React 19.2.8, TypeScript strict, Tailwind CSS 4.3.3)
- shadcn/ui 4.x on the **radix** base with the **nova** preset (Lucide icons + Geist)
- Native MongoDB driver 7.7 connection singleton (`lib/mongodb.ts`) with a cached client
- Lazy, non-throwing environment layer (`lib/env.ts`) + `.env.example`
- Local development database: `scripts/dev-db.mjs` starts a detached, disk-backed
  `mongodb-memory-server` on `127.0.0.1:27017` when `MONGO_URI` is empty, so
  `pnpm seed` and `pnpm dev` share one dataset across runs
- NextAuth / Auth.js v5 (5.0.0-beta.32) credentials foundation + optional Google/GitHub
- Server-side session resolution and permission guards (`lib/session.ts`)
- Immutable audit helper with credential redaction (`lib/audit.ts`)
- Integer minor-unit money module (`lib/money.ts`)
- Full domain type catalogue (`types/domain.ts`), permission catalogue (`types/permissions.ts`)
- Canonical state machines (`lib/transitions.ts`)
- Zod schemas per input shape (`lib/schemas/*`)
- Design tokens applied from the specification palette in `app/globals.css`
- `error.tsx`, `loading.tsx`, `not-found.tsx`

Decisions:
- **Money is stored in integer minor units (kobo).** Every total is recomputed on the
  server; client-supplied totals are never trusted.
- **Spec `--accent` (#D97706) is exposed as `--color-brand`.** shadcn reserves the
  `--accent` token for hover surfaces, so mapping the amber brand accent there would
  make every hover state amber. Both tokens exist with the exact specified values.
- **MongoDB for local development** is provided by `mongodb-memory-server` only because
  no MongoDB instance exists in this environment. Production uses `MONGO_URI`; the local
  instance is never started when `MONGO_URI` is set.
- **Stripe** is integrated at the webhook boundary using Node's `crypto` HMAC verification
  rather than pulling in an SDK for an integration that has no credentials configured.
  Missing keys produce an explicit configuration state, never a fake payment confirmation.
- **No middleware-based auth.** Every protected route group resolves the session and
  permission server-side in its layout/page, and every server action re-checks. UI
  hiding is never the security boundary.

Deviations:
- `components/ui/form.tsx` does not exist in the current shadcn registry; forms use
  react-hook-form + `standardSchemaResolver` (Zod 4 standard schema) with shared
  `FormField` primitives instead.

VERIFY:
- `pnpm check-types` — pass
- `pnpm lint` — pending
- Browser verification — pending

Next:
- Phase B

---

## Portal portals + link repair ✅ 2026-10-05

The nav already advertised routes that did not exist. This pass built them and
fixed the guard and link bugs that hid the gap.

Built:
- **Customer portal** — `/customer` (KPIs + recent shipments/invoices),
  `/customer/shipments` (shared filterable table, read-only), `/customer/invoices`,
  `/customer/profile`
- **Driver portal** — `/driver` (today view: active trips, due pickups, parcels on
  the driver), `/driver/jobs`, `/driver/profile`
- **Fleet detail pages** — `/fleet/drivers/[id]`, `/fleet/vehicles/[id]`, so the
  links from search and from the shipment assignment card resolve

Fixed:
- `/shipments/[id]` now admits `customer`/`driver` roles (ownership is still
  enforced per-record inside the page); previously the nav’s own portal links
  would have bounced a portal user to `/denied`
- `/finance/invoices/[id]` admits a customer viewing their own invoice; its
  back link is now role-aware
- Broken `/dispatch/trips/[id]` links now point at the real `/dispatch/[id]`
  route; portal search results open the canonical `/shipments/[id]`
- `pnpm exec next typegen` regenerates `.next/dev/types/routes.d.ts`, which is
  what `tsc` checks page props against
- Removed `import "server-only"` from `lib/pricing.ts`: it is a pure module and
  the new-shipment form (client component) imports `RATE_CARD`/`computeShippingFee`
  to show the honest fee estimate. Server-side recomputation of fees is unchanged
  — `lib/shipments.ts` still imports it server-only and never trusts client totals.
  `pnpm build` now compiles clean.

VERIFY:
- `pnpm check-types` — pass
- `pnpm lint` — 0 errors (35 pre-existing warnings, none new)
- `node scripts/smoke.mjs` — 41/41 (extended: fleet detail pages, customer
  portal, driver portal, cross-role redirects)
- Role-scoped probe: customer routes 200, driver routes 200, portal user on
  `/driver` redirected, fleet detail pages 200

Next:
- Phase B continued: end-to-end status lifecycle from trip completion, POD
  capture enforcement for drivers, and customer-facing tracking email links
  behind a configured provider (no fake notifications).
