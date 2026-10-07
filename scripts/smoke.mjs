/**
 * HTTP smoke test for Vale Logistics.
 *
 * Exercises the routes the way a browser does: public pages, a real
 * credentials login through NextAuth, and the permission-guarded pages.
 *
 *   node scripts/smoke.mjs
 *
 * Expects `pnpm dev` (or a built app) on BASE_URL, default localhost:3000.
 */
import { MongoClient } from "mongodb";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const MONGO_URI = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/vale";

let jar = new Map();
const cookieHeader = () =>
  [...jar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");

function storeCookies(res) {
  const list =
    typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  for (const raw of list) {
    const pair = raw.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

async function req(path, init = {}) {
  const res = await fetch(BASE + path, {
    ...init,
    redirect: "manual",
    headers: { ...(init.headers ?? {}), cookie: cookieHeader() },
  });
  storeCookies(res);
  return res;
}

async function login(email, password) {
  jar = new Map();
  const csrfRes = await req("/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();
  const body = new URLSearchParams({
    csrfToken,
    email,
    password,
    callbackUrl: BASE + "/dashboard",
  });
  const res = await req("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  return res.status;
}

function readCredentials(text) {
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^(\S+@\S+)\s+(\S+)\s+\(([^)]+)\)/);
    if (match) map.set(match[3], { email: match[1], password: match[2] });
  }
  return map;
}

const results = [];
async function check(name, path, { status = 200, contains, redirect, exclude } = {}) {
  const res = await req(path);
  const body = res.status === 200 ? await res.text() : "";
  const location = res.headers.get("location") ?? "";
  // Next 16 streams: a redirect or notFound() thrown after the shell flushes
  // arrives as 200 plus a meta refresh / soft-404 body, which is what a
  // browser actually follows, so accept either form.
  const metaRefresh = body.match(/http-equiv="refresh" content="\d+;url=([^"']+)"/);
  let ok = res.status === status;
  if (!ok && redirect && res.status >= 300 && res.status < 400 && location.includes(redirect)) ok = true;
  if (!ok && redirect && res.status === 200 && metaRefresh && metaRefresh[1].includes(redirect)) ok = true;
  if (ok && contains) ok = body.includes(contains);
  if (ok && exclude) ok = !body.includes(exclude);
  results.push({
    name,
    ok,
    detail: ok
      ? `status ${res.status}${contains ? `, contains "${contains}"` : ""}${redirect ? ` -> ${redirect}` : ""}`
      : `status ${res.status}${location ? ` -> ${location}` : ""}${metaRefresh ? ` (meta refresh -> ${metaRefresh[1]})` : ""}${contains && res.status === 200 ? `, missing "${contains}"` : ""}`,
  });
}

async function main() {
  const credText = await import("node:fs/promises")
    .then((fs) => fs.readFile(new URL("../.data/seed-credentials.txt", import.meta.url), "utf8"))
    .catch(() => "");
  const creds = readCredentials(credText);

  let sampleTracking = null;
  let sampleExceptionId = null;
  let sampleTripId = null;
  let sampleHubId = null;
  let sampleCustomerId = null;
  let sampleDriverId = null;
  let sampleVehicleId = null;
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const doc = await client
      .db()
      .collection("shipments")
      .findOne({}, { projection: { trackingNumber: 1 } });
    sampleTracking = doc?.trackingNumber ?? null;
    const exception = await client
      .db()
      .collection("exceptions")
      .findOne({}, { projection: { _id: 1 } });
    sampleExceptionId = exception?._id?.toString() ?? null;
    const trip = await client
      .db()
      .collection("trips")
      .findOne({}, { projection: { _id: 1 } });
    sampleTripId = trip?._id?.toString() ?? null;
    const hub = await client.db().collection("hubs").findOne({}, { projection: { _id: 1 } });
    sampleHubId = hub?._id?.toString() ?? null;
    const customer = await client.db().collection("customers").findOne({}, { projection: { _id: 1 } });
    sampleCustomerId = customer?._id?.toString() ?? null;
    const driver = await client.db().collection("drivers").findOne({}, { projection: { _id: 1 } });
    sampleDriverId = driver?._id?.toString() ?? null;
    const vehicle = await client.db().collection("vehicles").findOne({}, { projection: { _id: 1 } });
    sampleVehicleId = vehicle?._id?.toString() ?? null;
  } catch (error) {
    console.warn(`[smoke] could not read sample records: ${error.message}`);
  } finally {
    await client.close().catch(() => {});
  }

  /* public ------------------------------------------------------------- */
  await check("home", "/", { contains: "Move with clarity" });
  await check("tracking landing", "/tracking", { contains: "tracking number" });
  if (sampleTracking) {
    await check(`tracking detail ${sampleTracking}`, `/tracking/${sampleTracking}`, {
      contains: "Shipment history",
    });
  }
  await check("tracking unknown number", "/tracking/AV-00000", {
    contains: "No shipment found",
  });
  await check("signin", "/signin", { contains: "password" });
  await check("anonymous bounce to signin", "/shipments", { redirect: "/signin" });

  /* admin session ------------------------------------------------------- */
  const admin = creds.get("administrator");
  if (admin) {
    const loginStatus = await login(admin.email, admin.password);
    results.push({ name: "credentials login (admin)", ok: loginStatus < 400, detail: `status ${loginStatus}` });

    await check("dashboard", "/dashboard", { contains: "Needs attention" });
    await check("denied", "/denied", { contains: "Access denied" });
    await check("shipments list", "/shipments", { contains: "Shipments" });
    await check("exceptions queue", "/exceptions", { contains: "Raise exception" });
    if (sampleExceptionId) {
      await check("exception detail", `/exceptions/${sampleExceptionId}`, {
        contains: "Audit trail",
      });
    }
    await check("unknown exception shows not-found UI", "/exceptions/000000000000000000000000", {
      contains: "That page is not part of the system",
    });
    await check("pickups queue", "/pickups", { contains: "Scheduled" });
    await check("deliveries board", "/deliveries", { contains: "Out for delivery" });
    await check("dispatch board", "/dispatch", { contains: "Plan trip" });
    if (sampleTripId) {
      await check("trip detail", `/dispatch/${sampleTripId}`, { contains: "Manifest" });
    }
    await check("hubs network", "/hubs", { contains: "Recent floor activity" });
    if (sampleHubId) {
      await check("hub detail", `/hubs/${sampleHubId}`, { contains: "Working list" });
    }
    await check("drivers directory", "/fleet/drivers", { contains: "Base hub" });
    await check("vehicles directory", "/fleet/vehicles", { contains: "Insurance" });
    if (sampleDriverId) {
      await check("driver detail", `/fleet/drivers/${sampleDriverId}`, { contains: "Recent shipments" });
    }
    if (sampleVehicleId) {
      await check("vehicle detail", `/fleet/vehicles/${sampleVehicleId}`, { contains: "Recent shipments" });
    }
    await check("customers list", "/customers", { contains: "Account" });
    if (sampleCustomerId) {
      await check("customer detail", `/customers/${sampleCustomerId}`, { contains: "Recent shipments" });
    }
    await check("finance overview", "/finance", { contains: "Outstanding" });
    await check("invoices list", "/finance/invoices", { contains: "New invoice" });
    await check("payments list", "/finance/payments", { contains: "Record payment" });
    await check("cod list", "/finance/cod", { contains: "Reconcile" });
    await check("reconciliation queue", "/finance/reconciliation", { contains: "awaiting settlement" });
  } else {
    results.push({ name: "credentials login (admin)", ok: false, detail: "no credentials file" });
  }

  /* customer session ------------------------------------------------------- */
  const customer = creds.get("customer");
  if (customer) {
    const loginStatus = await login(customer.email, customer.password);
    results.push({ name: "credentials login (customer)", ok: loginStatus < 400, detail: `status ${loginStatus}` });
    await check("customer portal home", "/customer", { contains: "Outstanding balance" });
    await check("customer shipments", "/customer/shipments", { contains: "My shipments" });
    await check("customer invoices", "/customer/invoices", { contains: "My invoices" });
    await check("customer profile", "/customer/profile", { contains: "Account code" });
    await check("customer bounced off ops dashboard", "/dashboard", { redirect: "/customer" });
    await check("customer blocked from drivers portal", "/driver", { redirect: "/denied" });
  }

  /* driver session --------------------------------------------------------- */
  const driver = creds.get("driver");
  if (driver) {
    const loginStatus = await login(driver.email, driver.password);
    results.push({ name: "credentials login (driver)", ok: loginStatus < 400, detail: `status ${loginStatus}` });
    await check("driver today", "/driver", { contains: "Active trips" });
    await check("driver jobs", "/driver/jobs", { contains: "My jobs" });
    await check("driver profile", "/driver/profile", { contains: "Driver record" });
  }

  const failed = results.filter((r) => !r.ok);
  for (const result of results) {
    console.log(`${result.ok ? "PASS" : "FAIL"}  ${result.name.padEnd(42)} ${result.detail}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
