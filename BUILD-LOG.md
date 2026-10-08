# Chen Logistics — Build Log

Product: **Chen Logistics** — *Delivering fast, reliable shipping and logistics solutions.*

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

---

## Chen Logistics rebrand + public website navigation ✅ 2026-10-08

Rebranded the whole product from Vale Logistics to **Chen Logistics**
and built the public marketing site around the company navigation spec.

Built:
- **Brand core** — `lib/brand.ts` now exports the legal company name,
  phones, website and socials; two-line wordmark component
  (`components/brand/chen-logo.tsx`: bold **CHEN** over lightweight
  *logistics*); brand landscape art renamed to `chen-landscape.tsx`
- **Public site shell** — `app/(site)` route group with sticky
  dropdown navigation (`components/site/site-header.tsx`): About Us,
  Products (two-column mega menu), Locations (quick links + popular
  routes), Resources, Careers, and a right-side action area with
  Sign Up (secondary) and Get a Quote (primary). Mobile sheet with
  accordion menus
- **Footer** — company intro, contact block (phones, website), social
  icons (inline SVG brand marks — lucide v1 dropped brand icons),
  Products / International Shipping / Company / Resources columns,
  and the legal bottom bar (© 2026 Chen Logistics Technologies
  Limited; Privacy · Terms · Cookie Policy)
- **Marketing pages** — landing, About (×4), Products listing +
  10 service pages (international page anchors #export/#import for
  footer links), Locations listing + 5 corridor pages, Resources
  listing + 10 resource pages (working price calculator on the
  server rate card, FAQ accordion, prohibited-items, blog, legal
  pages), Careers, Get a Quote (validated form), App download,
  Mobile Experience Centre
- **Tracking pages moved** into `(site)` so they share the site
  header/footer; URLs `/tracking` and `/tracking/[number]` unchanged
- **Naming cleanup** — Vale→Chen across metadata, seed data, scripts,
  console logs, tracking-number prefix **AV-→CH-**, Mongo database
  name `vale`→`chen`, generated passwords, export filenames

Decisions:
- **+232 phone number kept as specified but flagged** — +232 is
  Sierra Leone while the company is Nigerian (+234). Marked with a
  NOTE comment in `lib/brand.ts`; must be verified before publishing.
- **Social icons are inline SVGs** — lucide-react v1 removed brand
  icons, so LinkedIn/X/Instagram/Facebook/YouTube marks live in
  `components/brand/social-icons.tsx`.
- **Quote form is honest** — validated client-side, confirmation
  generated locally, explicitly labelled "demonstration build".

VERIFY:
- `pnpm check-types` — pending
- `pnpm lint` — pending

Next:
- Browser verification of the new navigation and footer.
