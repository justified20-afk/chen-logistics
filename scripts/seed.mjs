#!/usr/bin/env node
/**
 * Chen Logistics demo/seed data.
 *
 * Idempotent: every record uses a deterministic ObjectId derived from its natural
 * key, so `pnpm seed` twice updates the same dataset instead of duplicating it.
 *
 * All records written here are DEMO DATA. Passwords for seeded accounts are
 * generated once on first insert, printed to stdout and appended to
 * .data/seed-credentials.txt (git-ignored). Existing password hashes are never
 * rotated on a re-seed.
 */
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/chen";
const DB_NAME = URI.split("/").pop()?.split("?")[0] || "chen";

/* ------------------------------------------------------------------ helpers */

function idFor(namespace, key) {
  const digest = createHash("sha1").update(`${namespace}:${key}`).digest();
  return new ObjectId(digest.subarray(0, 12));
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261005);
const pick = (list) => list[Math.floor(rand() * list.length)];
const between = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const round = (value, places = 1) => Number(value.toFixed(places));

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const now = Date.now();
const daysAgo = (days, hourOffset = 0) => new Date(now - days * DAY + hourOffset * HOUR);
const daysAhead = (days) => new Date(now + days * DAY);

function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

function randomPassword() {
  return `Chen-${randomBytes(4).toString("hex")}-${between(100, 999)}`;
}

const createdPasswords = [];

/* ------------------------------------------------------------------ catalogue */

const HUBS = [
  { code: "LOS", name: "Lagos Island Hub", region: "Lagos", address: "14 Marina Road, Lagos Island, Lagos", hours: "07:00 – 21:00 daily" },
  { code: "IKE", name: "Ikeja Distribution Hub", region: "Lagos", address: "9 Opebi Road, Ikeja, Lagos", hours: "07:00 – 20:00 daily" },
  { code: "ABJ", name: "Abuja Central Hub", region: "FCT", address: "22 Herbert Macaulay Way, Abuja", hours: "07:30 – 20:00 daily" },
  { code: "IBD", name: "Ibadan Transit Hub", region: "Oyo", address: "5 Ring Road, Ibadan, Oyo", hours: "07:00 – 19:00 daily" },
  { code: "PHC", name: "Port Harcourt Hub", region: "Rivers", address: "31 Aba Road, Port Harcourt, Rivers", hours: "07:00 – 20:00 daily" },
  { code: "KAN", name: "Kano North Hub", region: "Kano", address: "18 Zaria Road, Kano", hours: "07:00 – 19:00 daily" },
  { code: "ENU", name: "Enugu East Hub", region: "Enugu", address: "7 Okpara Avenue, Enugu", hours: "07:30 – 19:00 daily" },
  { code: "QWR", name: "Warri South Hub", region: "Delta", address: "12 Effurun Road, Warri, Delta", hours: "07:00 – 19:00 daily" },
];

const CITIES = [
  { city: "Lagos", state: "Lagos", hub: "LOS" },
  { city: "Ikeja", state: "Lagos", hub: "IKE" },
  { city: "Abuja", state: "FCT", hub: "ABJ" },
  { city: "Ibadan", state: "Oyo", hub: "IBD" },
  { city: "Port Harcourt", state: "Rivers", hub: "PHC" },
  { city: "Kano", state: "Kano", hub: "KAN" },
  { city: "Enugu", state: "Enugu", hub: "ENU" },
  { city: "Warri", state: "Delta", hub: "QWR" },
  { city: "Benin City", state: "Edo", hub: "QWR" },
  { city: "Kaduna", state: "Kaduna", hub: "KAN" },
  { city: "Jos", state: "Plateau", hub: "ABJ" },
  { city: "Ilorin", state: "Kwara", hub: "IBD" },
];

const FIRST_NAMES = ["Chinedu", "Amina", "Tunde", "Ngozi", "Emeka", "Fatima", "Oluwaseun", "Blessing", "Yusuf", "Kelechi", "Halima", "Sadiq", "Amaka", "Bola", "Ibrahim", "Grace", "Uche", "Zainab", "Segun", "Chika", "Musa", "Funke", "Daniel", "Nneka", "Abdul", "Titi", "Ifeanyi", "Aisha", "Rotimi", "Deborah"];
const LAST_NAMES = ["Okafor", "Adeyemi", "Bello", "Nwosu", "Eze", "Musa", "Olawale", "Obi", "Ibrahim", "Achebe", "Balogun", "Ugwu", "Danjuma", "Ekwueme", "Sani", "Adeleke", "Onwu", "Lawal", "Nnamdi", "Bakare"];
const STREETS = ["Adeniyi Jones Avenue", "Awolowo Road", "Zik Avenue", "Ahmadu Bello Way", "Ogui Road", "Market Road", "Independence Layout", "Nnamdi Azikiwe Street", "Agege Motor Road", "Eric Moore Road", "Sapele Road", "Broadcast Road"];

const DRIVER_STATUS_MIX = [
  ...Array(18).fill("available"),
  ...Array(6).fill("assigned"),
  ...Array(4).fill("on_trip"),
  ...Array(4).fill("off_duty"),
  ...Array(2).fill("suspended"),
  ...Array(1).fill("inactive"),
];

const VEHICLE_STATUS_MIX = [
  ...Array(13).fill("available"),
  ...Array(4).fill("assigned"),
  ...Array(3).fill("on_trip"),
  ...Array(3).fill("maintenance"),
  ...Array(1).fill("inactive"),
];

const SHIPMENT_STATUS_MIX = [
  ...Array(46).fill("delivered"),
  ...Array(22).fill("in_transit"),
  ...Array(16).fill("out_for_delivery"),
  ...Array(13).fill("at_destination_hub"),
  ...Array(11).fill("at_origin_hub"),
  ...Array(14).fill("awaiting_pickup"),
  ...Array(9).fill("booked"),
  ...Array(7).fill("delivery_attempted"),
  ...Array(6).fill("failed"),
  ...Array(4).fill("returned"),
  ...Array(3).fill("return_initiated"),
  ...Array(3).fill("picked_up"),
  ...Array(4).fill("cancelled"),
  ...Array(2).fill("draft"),
];

const STATUS_LABEL = {
  draft: "Shipment drafted",
  booked: "Booked",
  awaiting_pickup: "Pickup scheduled",
  picked_up: "Picked up",
  at_origin_hub: "Arrived at origin hub",
  in_transit: "Departed origin hub",
  at_destination_hub: "Arrived at destination hub",
  out_for_delivery: "Out for delivery",
  delivery_attempted: "Delivery attempt recorded",
  delivered: "Delivered",
  failed: "Delivery failed",
  return_initiated: "Return initiated",
  returned: "Returned to sender",
  cancelled: "Cancelled",
};

const STATUS_PATH = {
  draft: ["draft"],
  booked: ["draft", "booked"],
  awaiting_pickup: ["draft", "booked", "awaiting_pickup"],
  picked_up: ["draft", "booked", "awaiting_pickup", "picked_up"],
  at_origin_hub: ["draft", "booked", "awaiting_pickup", "picked_up", "at_origin_hub"],
  in_transit: ["draft", "booked", "awaiting_pickup", "picked_up", "at_origin_hub", "in_transit"],
  at_destination_hub: ["draft", "booked", "awaiting_pickup", "picked_up", "at_origin_hub", "in_transit", "at_destination_hub"],
  out_for_delivery: ["draft", "booked", "awaiting_pickup", "picked_up", "at_origin_hub", "in_transit", "at_destination_hub", "out_for_delivery"],
  delivery_attempted: ["draft", "booked", "awaiting_pickup", "picked_up", "at_origin_hub", "in_transit", "at_destination_hub", "out_for_delivery", "delivery_attempted"],
  delivered: ["draft", "booked", "awaiting_pickup", "picked_up", "at_origin_hub", "in_transit", "at_destination_hub", "out_for_delivery", "delivered"],
  failed: ["draft", "booked", "awaiting_pickup", "picked_up", "at_origin_hub", "in_transit", "at_destination_hub", "out_for_delivery", "delivery_attempted", "failed"],
  return_initiated: ["draft", "booked", "awaiting_pickup", "picked_up", "at_origin_hub", "in_transit", "at_destination_hub", "out_for_delivery", "delivery_attempted", "failed", "return_initiated"],
  returned: ["draft", "booked", "awaiting_pickup", "picked_up", "at_origin_hub", "in_transit", "at_destination_hub", "out_for_delivery", "delivery_attempted", "failed", "return_initiated", "returned"],
  cancelled: ["draft", "booked", "cancelled"],
};

const FAILURE_REASONS = [
  "customer_unavailable",
  "wrong_address",
  "customer_refused",
  "phone_unreachable",
  "access_issue",
  "damaged_package",
  "cash_unavailable",
  "vehicle_issue",
  "weather",
  "other",
];

const RATE_CARD = {
  // minor units (kobo)
  standard: { base: 250000, perKg: 15000 },
  express: { base: 400000, perKg: 25000 },
  same_day: { base: 650000, perKg: 40000 },
};

function computeShippingFee(serviceLevel, weightKg, codMinor) {
  const rate = RATE_CARD[serviceLevel] ?? RATE_CARD.standard;
  const codHandling = codMinor > 0 ? 15000 : 0;
  return rate.base + Math.ceil(weightKg) * rate.perKg + codHandling;
}

/* ------------------------------------------------------------------ seed */

async function main() {
  const client = await MongoClient.connect(URI, { serverSelectionTimeoutMS: 8000 });
  const db = client.db(DB_NAME);

  const upsert = (collection, key, doc) =>
    db.collection(collection).updateOne({ _id: idFor(collection, key) }, { $set: doc }, { upsert: true });

  console.log(`\n[Chen] Seeding demo dataset into ${DB_NAME} (${URI})\n`);

  /* 1 — roles / permissions ------------------------------------------------ */
  const roleDocs = [
    ["administrator", "Administrator", "Full system access including users, roles and settings.", ["*"]],
    ["operations_manager", "Operations Manager", "Operational visibility across shipments, hubs, dispatch, exceptions and reports.", ["dashboard.view", "shipments.view", "shipments.create", "shipments.edit", "shipments.cancel", "shipments.status", "dispatch.view", "dispatch.create", "dispatch.assign", "dispatch.dispatch", "fleet.view", "drivers.view", "hubs.view", "hubs.manage", "exceptions.view", "exceptions.manage", "finance.view", "reports.view", "customers.view", "customers.manage", "pickups.manage", "deliveries.manage", "pod.create", "notifications.view", "audit.view"]],
    ["dispatcher", "Dispatcher", "Trip planning, assignment, route workload and dispatch status.", ["dashboard.view", "shipments.view", "shipments.edit", "shipments.status", "dispatch.view", "dispatch.create", "dispatch.assign", "dispatch.dispatch", "fleet.view", "drivers.view", "hubs.view", "exceptions.view", "exceptions.manage", "pickups.manage", "notifications.view"]],
    ["warehouse", "Warehouse Staff", "Inbound receiving, sorting, staging, scanning and handover.", ["dashboard.view", "shipments.view", "shipments.status", "hubs.view", "hubs.manage", "exceptions.view", "exceptions.manage", "dispatch.view", "notifications.view"]],
    ["driver", "Driver / Rider", "Assigned jobs, pickup, delivery status updates and proof of delivery.", ["dashboard.view", "shipments.view", "pickups.manage", "deliveries.manage", "pod.create", "exceptions.view", "driver.portal", "notifications.view"]],
    ["support", "Customer Support", "Customer lookup, shipment tracking, notes and exception handling.", ["dashboard.view", "shipments.view", "shipments.edit", "customers.view", "customers.manage", "exceptions.view", "exceptions.manage", "dispatch.view", "notifications.view"]],
    ["finance", "Finance", "Invoices, payments, COD reconciliation and financial reporting.", ["dashboard.view", "shipments.view", "customers.view", "finance.view", "finance.manage", "reports.view", "audit.view", "notifications.view"]],
    ["customer", "Customer", "Customer portal access to their own shipments, tracking and invoices.", ["customer.portal"]],
  ];

  for (const [key, name, description, permissions] of roleDocs) {
    upsert("roles", key, {
      key,
      name,
      description,
      permissions,
      isSystem: true,
      updatedAt: new Date(),
    });
  }

  /* 2 — users -------------------------------------------------------------- */
  const credentialsPath = path.join(root, ".data", "seed-credentials.txt");
  fs.mkdirSync(path.dirname(credentialsPath), { recursive: true });

  const seedUsers = [
    { key: "admin", email: "admin@chen.example", name: "Ada Obi", role: "administrator" },
    { key: "ops", email: "ops@chen.example", name: "Musa Danjuma", role: "operations_manager" },
    { key: "dispatch", email: "dispatch@chen.example", name: "Tunde Adeyemi", role: "dispatcher" },
    { key: "warehouse", email: "warehouse@chen.example", name: "Ngozi Eze", role: "warehouse" },
    { key: "driver1", email: "driver1@chen.example", name: "Chinedu Okafor", role: "driver" },
    { key: "driver2", email: "driver2@chen.example", name: "Amina Bello", role: "driver" },
    { key: "support", email: "support@chen.example", name: "Blessing Nwosu", role: "support" },
    { key: "finance", email: "finance@chen.example", name: "Ibrahim Sani", role: "finance" },
    { key: "customer1", email: "customer1@chen.example", name: "Nkem Traders", role: "customer" },
  ];

  /* 3 — hubs ---------------------------------------------------------------- */
  const hubList = HUBS.map((hub, index) => ({
    ...hub,
    id: idFor("hubs", hub.code).toString(),
    _id: idFor("hubs", hub.code),
    managerName: `${FIRST_NAMES[index % FIRST_NAMES.length]} ${LAST_NAMES[index % LAST_NAMES.length]}`,
    managerPhone: `+23480${String(between(1000000, 9999999))}`,
    status: index === 6 ? "at_capacity" : "active",
    dailyCapacity: between(180, 420),
    createdAt: daysAgo(420 - index * 12),
    updatedAt: daysAgo(between(1, 30)),
  }));
  for (const hub of hubList) {
    const { _id, id, ...doc } = hub;
    upsert("hubs", hub.code, doc);
  }

  /* 4 — drivers ------------------------------------------------------------- */
  const driverList = [];
  for (let i = 0; i < 35; i += 1) {
    const name = `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 3) % LAST_NAMES.length]}`;
    const hub = hubList[i % hubList.length];
    const status = DRIVER_STATUS_MIX[i] ?? "available";
    const expiringSoon = i === 2 || i === 9; // compliance problems must be visible
    driverList.push({
      _id: idFor("drivers", `D-${i + 1}`),
      id: idFor("drivers", `D-${i + 1}`).toString(),
      employeeId: `DRV-${String(i + 1).padStart(4, "0")}`,
      name,
      phone: `+23480${String(between(10000000, 99999999)).slice(0, 8)}`,
      email: `${name.split(" ")[0].toLowerCase()}.${name.split(" ")[1].toLowerCase()}@chen.example`,
      licenseNumber: `LIC-${between(100000, 999999)}`,
      licenseExpiry: expiringSoon ? daysAhead(between(3, 25)) : daysAhead(between(120, 900)),
      status,
      hubId: hub.id,
      hubName: hub.name,
      emergencyContactName: `${FIRST_NAMES[(i + 7) % FIRST_NAMES.length]} ${LAST_NAMES[(i + 5) % LAST_NAMES.length]}`,
      emergencyContactPhone: `+23481${String(between(10000000, 99999999)).slice(0, 8)}`,
      completedJobs: between(40, 640),
      failedDeliveries: between(0, 24),
      notes: status === "suspended" ? "Suspended pending disciplinary review." : undefined,
      version: 1,
      createdAt: daysAgo(between(120, 900)),
      updatedAt: daysAgo(between(1, 60)),
    });
  }

  /* 5 — vehicles ------------------------------------------------------------ */
  const vehicleTypes = ["van", "truck", "motorcycle", "trailer", "car"];
  const vehicleList = [];
  for (let i = 0; i < 24; i += 1) {
    const hub = hubList[(i + 3) % hubList.length];
    const status = VEHICLE_STATUS_MIX[i] ?? "available";
    const type = vehicleTypes[i % vehicleTypes.length];
    const complianceRisk = i === 1 || i === 5 || i === 11;
    vehicleList.push({
      _id: idFor("vehicles", `V-${i + 1}`),
      id: idFor("vehicles", `V-${i + 1}`).toString(),
      registrationNumber: `LSR-${String(4800 + i * 7).padStart(3, "0")}${["ABC", "EFG", "JKL", "MNP"][i % 4]}`,
      type,
      capacityWeightKg: type === "motorcycle" ? 40 : type === "truck" ? 3500 : type === "trailer" ? 12000 : type === "car" ? 400 : 1200,
      capacityPackages: type === "motorcycle" ? 12 : type === "truck" ? 260 : type === "trailer" ? 700 : type === "car" ? 40 : 90,
      capacityVolumeCm3: type === "motorcycle" ? 120000 : type === "truck" ? 18000000 : 6000000,
      status,
      hubId: hub.id,
      hubName: hub.name,
      insuranceExpiry: complianceRisk ? daysAhead(between(2, 40)) : daysAhead(between(90, 700)),
      inspectionExpiry: i === 5 ? daysAhead(between(1, 20)) : daysAhead(between(60, 640)),
      maintenanceDueAt: status === "maintenance" ? daysAgo(between(1, 9)) : daysAhead(between(10, 240)),
      odometerKm: between(12000, 240000),
      year: between(2015, 2024),
      notes: status === "maintenance" ? "Held in workshop — awaiting parts." : undefined,
      version: 1,
      createdAt: daysAgo(between(100, 900)),
      updatedAt: daysAgo(between(1, 45)),
    });
  }

  /* 6 — customers ----------------------------------------------------------- */
  const customerList = [];
  const businessNames = ["Nkem Traders", "Bluecrest Foods", "Orbit Pharma", "Kano Textiles", "Meridian Oil & Gas", "Sunrise Agric", "Terna Electronics", "Crestline Hotels", "Anchor Shipping", "Delta Plastics", "Horizon Media", "Ridgeway Schools", "Palms Retail", "Zenith Fabrics", "Cobalt Motors", "Aqualine Water", "Granite Build", "Northgate Clinic", "Silverline Insurance", "Terra Agro"];
  for (let i = 0; i < 80; i += 1) {
    const isBusiness = i % 3 !== 2;
    const contact = `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 5) % LAST_NAMES.length]}`;
    const name = isBusiness ? `${businessNames[i % businessNames.length]}${i >= businessNames.length ? ` ${Math.floor(i / businessNames.length) + 1}` : ""}` : contact;
    const place = CITIES[i % CITIES.length];
    const street = STREETS[i % STREETS.length];
    customerList.push({
      _id: idFor("customers", `C-${i + 1}`),
      id: idFor("customers", `C-${i + 1}`).toString(),
      code: `CUST-${String(i + 1).padStart(5, "0")}`,
      name,
      kind: isBusiness ? "business" : "personal",
      contactPerson: contact,
      email: `${isBusiness ? "accounts" : contact.split(" ")[0].toLowerCase()}${i + 1}@example.com`,
      phone: `+234${between(700, 900)}${String(between(10000000, 99999999)).slice(0, 8)}`,
      addresses: [
        {
          name: contact,
          phone: `+234${between(700, 900)}${String(between(10000000, 99999999)).slice(0, 8)}`,
          street,
          city: place.city,
          state: place.state,
          country: "Nigeria",
        },
      ],
      contacts: [
        { id: idFor("contacts", `C-${i + 1}-1`).toString(), name: contact, role: "Primary contact", email: `contact${i + 1}@example.com`, phone: `+234${between(700, 900)}${String(between(10000000, 99999999)).slice(0, 8)}` },
      ],
      accountStatus: i % 17 === 0 ? "on_hold" : "active",
      creditTermsDays: isBusiness ? [0, 14, 30][i % 3] : 0,
      notes: i % 17 === 0 ? "Account on hold — outstanding balance review." : undefined,
      createdAt: daysAgo(between(30, 700)),
      updatedAt: daysAgo(between(1, 90)),
    });
  }

  /* 7 — shipments ----------------------------------------------------------- */
  const shipmentList = [];
  const trackingList = [];
  const deliveryAttemptList = [];
  const podList = [];
  const pickupList = [];
  const hubOperationList = [];
  const exceptionList = [];
  const notificationList = [];
  const auditList = [];

  const SERVICE_LEVELS = ["standard", "express", "same_day"];
  const shuffledStatuses = [...SHIPMENT_STATUS_MIX].map((status) => status);
  // deterministic shuffle
  for (let i = shuffledStatuses.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [shuffledStatuses[i], shuffledStatuses[j]] = [shuffledStatuses[j], shuffledStatuses[i]];
  }

  let eventSeq = 0;
  const DELIVERED_BY = ["driver1", "driver2"];

  shuffledStatuses.forEach((status, index) => {
    const trackingNumber = `CH-${10001 + index}`;
    const customer = customerList[index % customerList.length];
    const originPlace = CITIES[index % CITIES.length];
    let destPlace = CITIES[(index * 5 + 3) % CITIES.length];
    if (destPlace.city === originPlace.city) destPlace = CITIES[(index * 5 + 4) % CITIES.length];

    const originHub = hubList.find((hub) => hub.code === originPlace.hub) ?? hubList[0];
    const destHub = hubList.find((hub) => hub.code === destPlace.hub) ?? hubList[1];

    const serviceLevel = SERVICE_LEVELS[index % 3 === 0 ? 1 : index % 5 === 0 ? 2 : 0];
    const packageCount = between(1, 6);
    const packages = Array.from({ length: packageCount }, (_, p) => ({
      id: idFor("pkg", `${trackingNumber}-${p}`).toString(),
      description: ["Consumer goods", "Spare parts", "Documents", "Textiles", "Pharma supplies", "Electronics"][p % 6],
      quantity: between(1, 4),
      weightKg: round(between(2, 90) + rand(), 1),
      lengthCm: between(15, 90),
      widthCm: between(10, 60),
      heightCm: between(8, 50),
      declaredValueMinor: p === 0 ? between(20, 400) * 10000 : undefined,
    }));

    const totalPackages = packages.reduce((sum, pkg) => sum + pkg.quantity, 0);
    const totalWeightKg = round(packages.reduce((sum, pkg) => sum + pkg.weightKg * pkg.quantity, 0), 1);
    const totalVolumeCm3 = packages.reduce(
      (sum, pkg) => sum + pkg.lengthCm * pkg.widthCm * pkg.heightCm * pkg.quantity,
      0,
    );

    const hasCod = index % 4 === 1;
    const codAmountMinor = hasCod ? between(5, 260) * 10000 : 0;
    const declaredValueMinor = index % 3 === 0 ? between(30, 600) * 10000 : undefined;
    const shippingFeeMinor = computeShippingFee(serviceLevel, totalWeightKg, codAmountMinor);

    const ageDays = status === "delivered" ? between(1, 21) : between(0, 9);
    const createdAt = daysAgo(ageDays, between(6, 19));
    const promised = new Date(createdAt.getTime() + (serviceLevel === "same_day" ? 8 : serviceLevel === "express" ? 30 : 72) * HOUR);

    const priority = index % 13 === 0 ? "urgent" : index % 5 === 0 ? "high" : "normal";

    let paymentStatus = "unpaid";
    if (codAmountMinor > 0) paymentStatus = ["cod_pending", "cod_collected", "reconciled"][index % 3];
    else if (index % 7 === 0) paymentStatus = "paid";

    const delayed = ["in_transit", "at_destination_hub", "out_for_delivery", "delivery_attempted", "failed"].includes(status)
      ? promised.getTime() < now - 6 * HOUR
      : false;

    const failureReason = status === "failed" || status === "delivery_attempted" ? FAILURE_REASONS[index % FAILURE_REASONS.length] : undefined;

    const assignedDriver = ["picked_up", "at_origin_hub", "in_transit", "at_destination_hub", "out_for_delivery", "delivery_attempted", "delivered", "failed", "return_initiated", "returned"].includes(status)
      ? driverList[index % driverList.length]
      : undefined;
    const assignedVehicle = assignedDriver ? vehicleList[index % vehicleList.length] : undefined;

    const record = {
      _id: idFor("shipments", trackingNumber),
      id: idFor("shipments", trackingNumber).toString(),
      trackingNumber,
      customerId: customer.id,
      customerName: customer.name,
      sender: {
        name: customer.contactPerson,
        phone: customer.phone,
        email: customer.email,
        street: customer.addresses[0].street,
        city: originPlace.city,
        state: originPlace.state,
        country: "Nigeria",
      },
      recipient: {
        name: `${FIRST_NAMES[(index + 11) % FIRST_NAMES.length]} ${LAST_NAMES[(index + 7) % LAST_NAMES.length]}`,
        phone: `+234${between(700, 900)}${String(between(10000000, 99999999)).slice(0, 8)}`,
        street: STREETS[(index + 4) % STREETS.length],
        city: destPlace.city,
        state: destPlace.state,
        country: "Nigeria",
        landmark: index % 6 === 0 ? "Opposite the main market gate" : undefined,
      },
      packages,
      serviceLevel,
      status,
      originHubId: originHub.id,
      originHubName: originHub.name,
      destinationHubId: destHub.id,
      destinationHubName: destHub.name,
      driverId: assignedDriver?.id,
      driverName: assignedDriver?.name,
      vehicleId: assignedVehicle?.id,
      vehicleRegistration: assignedVehicle?.registrationNumber,
      promisedDeliveryAt: promised,
      pickedUpAt: ["picked_up", "at_origin_hub", "in_transit", "at_destination_hub", "out_for_delivery", "delivery_attempted", "delivered", "failed", "return_initiated", "returned"].includes(status)
        ? new Date(createdAt.getTime() + 6 * HOUR)
        : undefined,
      deliveredAt: status === "delivered" ? new Date(Math.min(promised.getTime() + between(-4, 20) * HOUR, now)) : undefined,
      totalPackages,
      totalWeightKg,
      totalVolumeCm3,
      shippingFeeMinor,
      declaredValueMinor,
      codAmountMinor: hasCod ? codAmountMinor : undefined,
      paymentStatus,
      priority,
      notes: index % 9 === 0 ? "Customer requested delivery before 17:00." : undefined,
      delayedReason: delayed ? "Past promised delivery window" : undefined,
      failureReason: status === "failed" ? failureReason : undefined,
      failureNote: status === "failed" ? "No one available at the delivery address; second attempt required." : undefined,
      attemptCount: ["delivery_attempted", "failed", "return_initiated", "returned"].includes(status) ? between(1, 2) : status === "delivered" && index % 3 === 0 ? 1 : 0,
      version: 1,
      createdAt,
      updatedAt: daysAgo(Math.max(0, ageDays - 1)),
    };

    shipmentList.push(record);

    /* tracking events */
    const path2 = STATUS_PATH[status] ?? ["booked"];
    const span = Math.max(2 * HOUR, (now - createdAt.getTime()) * 0.9);
    path2.forEach((step, stepIndex) => {
      const at = new Date(createdAt.getTime() + (span * stepIndex) / Math.max(1, path2.length - 1));
      let location = `${destPlace.city}`;
      let hubId = destHub.id;
      if (["draft", "booked", "awaiting_pickup", "picked_up"].includes(step)) {
        location = originPlace.city;
        hubId = originHub.id;
      } else if (["at_origin_hub", "in_transit"].includes(step)) {
        location = originHub.name;
        hubId = originHub.id;
      } else if (["at_destination_hub", "out_for_delivery", "delivery_attempted", "delivered", "failed", "return_initiated", "returned"].includes(step)) {
        location = destHub.name;
        hubId = destHub.id;
      }

      const previous = stepIndex > 0 ? path2[stepIndex - 1] : undefined;
      trackingList.push({
        _id: idFor("trackingEvents", `${trackingNumber}-${stepIndex}`),
        shipmentId: record.id,
        trackingNumber,
        type: step === "delivery_attempted" ? "delivery_attempt" : step === "delivered" ? "proof_of_delivery" : "status_changed",
        previousStatus: previous,
        newStatus: step,
        label:
          step === "at_origin_hub"
            ? `Arrived at ${originHub.name}`
            : step === "in_transit"
              ? `Departed ${originHub.name}`
              : step === "at_destination_hub"
                ? `Arrived at ${destHub.name}`
                : STATUS_LABEL[step],
        location,
        hubId,
        actorId: assignedDriver && ["picked_up", "out_for_delivery", "delivery_attempted", "delivered", "failed"].includes(step) ? "seed:driver" : "seed:system",
        actorName: ["picked_up", "out_for_delivery", "delivered"].includes(step) && assignedDriver ? assignedDriver.name : "System",
        note: step === "failed" ? record.failureNote : step === "delivery_attempted" ? "Attempt recorded with a structured reason." : undefined,
        createdAt: at,
      });
      eventSeq += 1;
    });

    /* delivery attempts + POD */
    if (["delivery_attempted", "failed", "return_initiated", "returned"].includes(status)) {
      const attemptDate = new Date(now - between(6, 60) * HOUR);
      deliveryAttemptList.push({
        _id: idFor("deliveryAttempts", `${trackingNumber}-1`),
        shipmentId: record.id,
        attemptNumber: 1,
        driverId: assignedDriver?.id ?? driverList[0].id,
        driverName: assignedDriver?.name ?? driverList[0].name,
        outcome: status === "delivery_attempted" ? "failed" : "failed",
        reason: failureReason,
        note: failureReason === "other" ? "Access blocked by building security." : undefined,
        attemptedAt: attemptDate,
      });
    }

    if (status === "delivered") {
      podList.push({
        _id: idFor("proofOfDelivery", trackingNumber),
        shipmentId: record.id,
        recipientName: record.recipient.name,
        relationship: index % 4 === 0 ? "Reception" : "Recipient",
        signatureRef: `sig://demo/${trackingNumber.toLowerCase()}`,
        photoRef: `photo://demo/${trackingNumber.toLowerCase()}.jpg`,
        note: index % 5 === 0 ? "Left with building security." : undefined,
        driverId: assignedDriver?.id ?? driverList[0].id,
        driverName: assignedDriver?.name ?? driverList[0].name,
        location: `${destHub.name}, ${destPlace.city}`,
        deliveredAt: record.deliveredAt ?? now,
        createdAt: record.deliveredAt ?? new Date(now),
      });
      trackingList.push({
        _id: idFor("trackingEvents", `${trackingNumber}-pod`),
        shipmentId: record.id,
        trackingNumber,
        type: "proof_of_delivery",
        previousStatus: "out_for_delivery",
        newStatus: "delivered",
        label: "Proof of delivery captured",
        location: `${destHub.name}, ${destPlace.city}`,
        actorId: "seed:driver",
        actorName: assignedDriver?.name ?? "Driver",
        note: `Signed by ${record.recipient.name}`,
        createdAt: record.deliveredAt ?? new Date(now),
      });
    }

    /* pickups for shipments that have not yet been collected */
    if (["booked", "awaiting_pickup", "draft"].includes(status)) {
      pickupList.push({
        _id: idFor("pickups", trackingNumber),
        reference: `PU-${1000 + index}`,
        shipmentId: record.id,
        trackingNumber,
        customerId: customer.id,
        address: record.sender,
        status: status === "awaiting_pickup" ? "scheduled" : "scheduled",
        scheduledFor: new Date(now + between(2, 40) * HOUR),
        hubId: originHub.id,
        notes: status === "booked" ? "Awaiting dispatch assignment." : undefined,
        version: 1,
        createdAt,
        updatedAt: createdAt,
      });
    }

    /* hub operations for shipments that reached a hub */
    if (["at_origin_hub", "in_transit", "at_destination_hub", "out_for_delivery", "delivered", "delivery_attempted", "failed"].includes(status)) {
      hubOperationList.push({
        _id: idFor("hubOperations", `${trackingNumber}-recv`),
        hubId: originHub.id,
        shipmentId: record.id,
        trackingNumber,
        operation: "received",
        previousStatus: "picked_up",
        newStatus: "at_origin_hub",
        actorName: "Warehouse console",
        createdAt: new Date(createdAt.getTime() + 8 * HOUR),
      });
      hubOperationList.push({
        _id: idFor("hubOperations", `${trackingNumber}-sort`),
        hubId: originHub.id,
        shipmentId: record.id,
        trackingNumber,
        operation: "sorted",
        note: `Sorted to lane for ${destHub.code}`,
        actorName: "Warehouse console",
        createdAt: new Date(createdAt.getTime() + 9 * HOUR),
      });
    }
  });

  /* 8 — trips --------------------------------------------------------------- */
  const tripList = [];
  const TRIP_STATUSES = ["completed", "completed", "completed", "in_transit", "in_transit", "dispatched", "ready", "assigned", "planned", "planned"];
  for (let i = 0; i < 30; i += 1) {
    const originHub = hubList[i % hubList.length];
    let destHub = hubList[(i + 3) % hubList.length];
    if (destHub.code === originHub.code) destHub = hubList[(i + 4) % hubList.length];
    const status = TRIP_STATUSES[i % TRIP_STATUSES.length];
    const driver = driverList[(i * 2) % driverList.length];
    const vehicle = i === 4 ? vehicleList[0] : vehicleList[(i * 3) % vehicleList.length];

    const memberShipments = shipmentList.filter((shipment) =>
      ["in_transit", "at_destination_hub", "out_for_delivery", "delivered", "at_origin_hub"].includes(shipment.status) &&
      shipment.originHubId === originHub.id &&
      shipment.destinationHubId === destHub.id,
    ).slice(0, i === 7 ? 40 : 8);

    const tripShipments = memberShipments.map((shipment) => ({
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
      packages: shipment.totalPackages,
      weightKg: shipment.totalWeightKg,
      volumeCm3: shipment.totalVolumeCm3,
      addedAt: daysAgo(between(0, 4)),
      addedBy: "seed:dispatcher",
    }));

    const totalPackages = tripShipments.reduce((sum, s) => sum + s.packages, 0);
    const totalWeightKg = round(tripShipments.reduce((sum, s) => sum + s.weightKg, 0), 1);

    tripList.push({
      _id: idFor("trips", `TRIP-${1000 + i}`),
      id: idFor("trips", `TRIP-${1000 + i}`).toString(),
      tripNumber: `TRIP-${1000 + i}`,
      date: daysAgo(between(0, 6)),
      originHubId: originHub.id,
      originHubName: originHub.name,
      destinationHubId: destHub.id,
      destinationHubName: destHub.name,
      driverId: ["draft", "planned"].includes(status) ? undefined : driver.id,
      driverName: ["draft", "planned"].includes(status) ? undefined : driver.name,
      vehicleId: ["draft", "planned"].includes(status) ? undefined : vehicle.id,
      vehicleRegistration: ["draft", "planned"].includes(status) ? undefined : vehicle.registrationNumber,
      shipments: tripShipments,
      status,
      plannedDepartureAt: new Date(now + between(-30, 30) * HOUR),
      actualDepartureAt: ["dispatched", "in_transit", "arrived", "completed"].includes(status) ? daysAgo(between(0, 3)) : undefined,
      arrivedAt: ["arrived", "completed"].includes(status) ? daysAgo(between(0, 2)) : undefined,
      completedAt: status === "completed" ? daysAgo(between(0, 2)) : undefined,
      totalPackages,
      totalWeightKg,
      capacityPackages: vehicle.capacityPackages,
      capacityWeightKg: vehicle.capacityWeightKg,
      overCapacity: totalWeightKg > vehicle.capacityWeightKg,
      notes: i === 7 ? "Loaded close to declared capacity — verify weighbridge ticket." : undefined,
      version: 1,
      createdAt: daysAgo(between(1, 8)),
      updatedAt: daysAgo(between(0, 3)),
    });
  }

  /* link shipments that sit on a trip ------------------------------------- */
  const shipmentTripIndex = new Map();
  for (const trip of tripList) {
    for (const member of trip.shipments) {
      if (!shipmentTripIndex.has(member.shipmentId)) shipmentTripIndex.set(member.shipmentId, trip);
    }
  }
  for (const shipment of shipmentList) {
    const trip = shipmentTripIndex.get(shipment.id);
    if (trip && trip.driverId) {
      shipment.tripId = trip.id;
      shipment.tripNumber = trip.tripNumber;
      shipment.driverId = shipment.driverId ?? trip.driverId;
      shipment.driverName = shipment.driverName ?? trip.driverName;
      shipment.vehicleId = shipment.vehicleId ?? trip.vehicleId;
      shipment.vehicleRegistration = shipment.vehicleRegistration ?? trip.vehicleRegistration;
    }
  }

  /* 9 — exceptions ---------------------------------------------------------- */
  const EXCEPTION_BLUEPRINTS = [
    { type: "delayed", severity: "critical", title: "Shipment past promised delivery window" },
    { type: "failed_delivery", severity: "high", title: "Delivery attempt failed" },
    { type: "address_issue", severity: "medium", title: "Recipient address could not be verified" },
    { type: "damaged", severity: "high", title: "Package damaged during transfer" },
    { type: "payment_issue", severity: "critical", title: "COD collected does not match expected amount" },
    { type: "vehicle_issue", severity: "high", title: "Assigned vehicle unavailable" },
    { type: "driver_issue", severity: "medium", title: "Driver unavailable while assigned" },
    { type: "missing_scan", severity: "medium", title: "Missing hub scan in the route" },
    { type: "capacity_issue", severity: "high", title: "Trip exceeds vehicle capacity" },
    { type: "lost", severity: "critical", title: "Shipment not located at destination hub" },
    { type: "system_issue", severity: "low", title: "Scanner workstation offline" },
  ];
  const EXCEPTION_STATUSES_MIX = [
    ...Array(12).fill("open"),
    ...Array(6).fill("acknowledged"),
    ...Array(6).fill("investigating"),
    ...Array(4).fill("waiting"),
    ...Array(7).fill("resolved"),
    ...Array(5).fill("closed"),
  ];

  for (let i = 0; i < 40; i += 1) {
    const blueprint = EXCEPTION_BLUEPRINTS[i % EXCEPTION_BLUEPRINTS.length];
    const status = EXCEPTION_STATUSES_MIX[i];
    const shipment = shipmentList.filter((s) => ["failed", "delivery_attempted", "in_transit", "out_for_delivery"].includes(s.status))[i % 12];
    const createdAt = daysAgo(between(0, 9), between(0, 20));
    const resolved = ["resolved", "closed"].includes(status);
    const owner = ["ops", "dispatch", "support"][i % 3];

    exceptionList.push({
      _id: idFor("exceptions", `EX-${3000 + i}`),
      id: idFor("exceptions", `EX-${3000 + i}`).toString(),
      reference: `EX-${3000 + i}`,
      type: blueprint.type,
      severity: blueprint.severity,
      status,
      shipmentId: shipment?.id,
      shipmentTrackingNumber: shipment?.trackingNumber,
      tripId: i % 5 === 0 ? tripList[i % tripList.length].id : undefined,
      tripNumber: i % 5 === 0 ? tripList[i % tripList.length].tripNumber : undefined,
      driverId: i % 4 === 0 ? driverList[i % driverList.length].id : undefined,
      driverName: i % 4 === 0 ? driverList[i % driverList.length].name : undefined,
      vehicleId: i % 6 === 0 ? vehicleList[i % vehicleList.length].id : undefined,
      vehicleRegistration: i % 6 === 0 ? vehicleList[i % vehicleList.length].registrationNumber : undefined,
      hubId: i % 3 === 0 ? hubList[i % hubList.length].id : undefined,
      ownerId: owner,
      ownerName: { ops: "Musa Danjuma", dispatch: "Tunde Adeyemi", support: "Blessing Nwosu" }[owner],
      title: blueprint.title,
      description: `${blueprint.title}. Raised automatically from operational data for ${shipment?.trackingNumber ?? "the affected record"}. Needs an owner decision before it clears.`,
      resolution: resolved ? "Reviewed with the customer and the operational record corrected. Evidence stored against the shipment." : undefined,
      dueAt: daysAhead(between(-2, 5)),
      createdAt,
      updatedAt: resolved ? daysAgo(between(0, 2)) : createdAt,
      resolvedAt: resolved ? daysAgo(between(0, 2)) : undefined,
      resolvedBy: resolved ? "Musa Danjuma" : undefined,
      version: 1,
    });
  }

  /* 10 — invoices, payments, COD -------------------------------------------- */
  const invoiceList = [];
  const paymentList = [];
  const codList = [];

  const codShipments = shipmentList.filter((s) => typeof s.codAmountMinor === "number").slice(0, 30);

  codShipments.forEach((shipment, i) => {
    const state = ["pending", "collected", "partially_collected", "reconciled", "not_collected"][i % 5];
    const driverCollected =
      state === "reconciled" || state === "collected"
        ? shipment.codAmountMinor
        : state === "partially_collected"
          ? Math.round(shipment.codAmountMinor * 0.6)
          : 0;
    codList.push({
      _id: idFor("codRecords", shipment.trackingNumber),
      id: idFor("codRecords", shipment.trackingNumber).toString(),
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
      customerId: shipment.customerId,
      customerName: shipment.customerName,
      expectedMinor: shipment.codAmountMinor,
      collectedMinor: driverCollected,
      driverCollectedMinor: driverCollected,
      status: state,
      currency: "NGN",
      reconciledAt: state === "reconciled" ? daysAgo(between(0, 3)) : undefined,
      reconciledBy: state === "reconciled" ? "Ibrahim Sani" : undefined,
      // A deliberate discrepancy so the finance dashboard has something to act on.
      discrepancyReason: state === "partially_collected" ? "Short-collected at the point of delivery; driver to account for the balance." : undefined,
      notes: undefined,
      version: 1,
      createdAt: shipment.createdAt,
      updatedAt: daysAgo(between(0, 4)),
    });
  });

  for (let i = 0; i < 30; i += 1) {
    const customer = customerList[(i * 3) % customerList.length];
    const lines = [
      {
        id: idFor("invline", `INV-${5000 + i}-1`).toString(),
        description: "Line-haul and delivery charges",
        quantity: between(1, 6),
        unitAmountMinor: between(15, 90) * 10000,
        totalMinor: 0,
      },
      {
        id: idFor("invline", `INV-${5000 + i}-2`).toString(),
        description: "Fuel surcharge",
        quantity: 1,
        unitAmountMinor: between(3, 15) * 10000,
        totalMinor: 0,
      },
    ];
    for (const line of lines) line.totalMinor = line.quantity * line.unitAmountMinor;
    const subtotalMinor = lines.reduce((sum, line) => sum + line.totalMinor, 0);
    const discountMinor = i % 9 === 0 ? Math.round(subtotalMinor * 0.1) : 0;
    const taxMinor = Math.round(((subtotalMinor - discountMinor) * 7.5) / 100);
    const totalMinor = subtotalMinor - discountMinor + taxMinor;
    const amountPaidMinor = [0, 0, Math.round(totalMinor / 2), totalMinor][i % 4];
    const status = amountPaidMinor === 0 ? "issued" : amountPaidMinor >= totalMinor ? "paid" : "partially_paid";

    invoiceList.push({
      _id: idFor("invoices", `INV-${5000 + i}`),
      id: idFor("invoices", `INV-${5000 + i}`).toString(),
      invoiceNumber: `INV-${5000 + i}`,
      customerId: customer.id,
      customerName: customer.name,
      shipmentIds: shipmentList.slice(i, i + 3).map((s) => s.id),
      lines,
      subtotalMinor,
      taxRatePercent: 7.5,
      taxMinor,
      discountMinor,
      totalMinor,
      amountPaidMinor,
      balanceMinor: totalMinor - amountPaidMinor,
      currency: "NGN",
      status,
      dueAt: daysAhead(between(-12, 34)),
      issuedAt: daysAgo(between(1, 40)),
      paidAt: amountPaidMinor >= totalMinor ? daysAgo(between(0, 20)) : undefined,
      notes: undefined,
      version: 1,
      createdAt: daysAgo(between(1, 45)),
      updatedAt: daysAgo(between(0, 10)),
    });

    if (amountPaidMinor > 0) {
      paymentList.push({
        _id: idFor("payments", `PAY-${7000 + i}`),
        id: idFor("payments", `PAY-${7000 + i}`).toString(),
        reference: `PAY-${7000 + i}`,
        invoiceId: idFor("invoices", `INV-${5000 + i}`).toString(),
        invoiceNumber: `INV-${5000 + i}`,
        customerId: customer.id,
        customerName: customer.name,
        amountMinor: amountPaidMinor,
        currency: "NGN",
        method: ["bank_transfer", "cash", "card", "ussd"][i % 4],
        collectedByRole: i % 4 === 1 ? "driver" : "finance",
        receivedAt: daysAgo(between(0, 30)),
        recordedBy: "Ibrahim Sani",
        status: "recorded",
        createdAt: daysAgo(between(0, 30)),
      });
    }
  }

  /* 11 — notifications ------------------------------------------------------- */
  const notifyBlueprints = [
    { type: "shipment_delayed", severity: "critical", title: "Delayed shipments need re-planning", body: "Shipments have passed their promised delivery window.", href: "/shipments?delayedOnly=true", label: "Review delayed shipments" },
    { type: "delivery_failed", severity: "high", title: "Failed deliveries awaiting a reattempt", body: "Structured failure reasons were recorded by drivers.", href: "/deliveries?status=failed", label: "Open deliveries" },
    { type: "payment_discrepancy", severity: "critical", title: "COD shortfall detected", body: "Collected cash does not match the expected COD amount.", href: "/finance/reconciliation", label: "Reconcile now" },
    { type: "compliance_expiring", severity: "high", title: "Vehicle documents expiring", body: "Insurance or inspection expires within the warning window.", href: "/fleet/vehicles", label: "Open fleet" },
    { type: "exception_escalated", severity: "high", title: "Exceptions escalated to operations", body: "Critical exceptions are unowned or overdue.", href: "/exceptions?severity=critical", label: "Own an exception" },
    { type: "trip_dispatched", severity: "low", title: "Trip dispatched", body: "A trip left the hub with driver and vehicle assigned.", href: "/dispatch/trips", label: "View trips" },
  ];
  notifyBlueprints.forEach((n, i) => {
    notificationList.push({
      _id: idFor("notifications", `N-${i + 1}`),
      ...n,
      audienceRole: i % 2 === 0 ? "operations_manager" : "dispatcher",
      readAt: i < 3 ? null : daysAgo(0),
      createdAt: daysAgo(0, -between(1, 20)),
    });
  });

  /* 12 — audit --------------------------------------------------------------- */
  const auditBlueprints = [
    ["shipment.created", "shipment", "Created through order intake"],
    ["shipment.status_changed", "shipment", "Status advanced through the lifecycle"],
    ["trip.dispatched", "trip", "Trip dispatched with driver and vehicle"],
    ["exception.resolved", "exception", "Exception resolved with a recorded reason"],
    ["pod.recorded", "shipment", "Proof of delivery captured"],
    ["payment.recorded", "payment", "Payment recorded against an invoice"],
    ["cod.reconciled", "cod", "COD reconciled by finance"],
    ["user.created", "user", "Operations account provisioned"],
    ["settings.updated", "settings", "Operational setting changed"],
    ["assignment.reassigned", "trip", "Driver reassigned with a reason"],
  ];
  for (let i = 0; i < 55; i += 1) {
    const [action, entityType, summary] = auditBlueprints[i % auditBlueprints.length];
    const actor = seedUsers[i % seedUsers.length];
    auditList.push({
      _id: idFor("auditLogs", `A-${i + 1}`),
      actorId: actor.email,
      actorName: actor.name,
      actorRole: actor.role,
      action,
      entityType,
      entityId: `${entityType}-${1000 + i}`,
      entityLabel: summary,
      before: { status: "previous_value" },
      after: { status: "current_value" },
      createdAt: daysAgo(between(0, 20), between(0, 23)),
    });
  }

  /* 13 — settings ------------------------------------------------------------ */
  upsert("settings", "system", {
    companyName: "Chen Logistics",
    tagline: "Move with clarity. Deliver with control.",
    currency: "NGN",
    timezone: "Africa/Lagos",
    defaultOriginHubId: hubList[0].id,
    defaultServiceLevel: "standard",
    delayThresholdHours: 6,
    complianceWarningDays: 30,
    invoicePrefix: "INV",
    codEnabled: true,
    capacityWarningRatio: 0.9,
    demoDataNotice:
      "This deployment is seeded with development/demo records. Nothing here is live production telemetry.",
    updatedAt: new Date(),
  });

  /* write everything --------------------------------------------------------- */
  const writes = [
    ["hubs", hubList.map(({ _id, id, ...rest }) => ({ ...rest, _id }))],
    ["drivers", driverList.map(({ id, ...rest }) => rest)],
    ["vehicles", vehicleList.map(({ id, ...rest }) => rest)],
    ["customers", customerList.map(({ id, ...rest }) => rest)],
    ["shipments", shipmentList.map(({ id, ...rest }) => rest)],
    ["trackingEvents", trackingList],
    ["deliveryAttempts", deliveryAttemptList],
    ["proofOfDelivery", podList],
    ["pickups", pickupList],
    ["hubOperations", hubOperationList],
    ["trips", tripList.map(({ id, ...rest }) => rest)],
    ["exceptions", exceptionList.map(({ id, ...rest }) => rest)],
    ["invoices", invoiceList.map(({ id, ...rest }) => rest)],
    ["payments", paymentList.map(({ id, ...rest }) => rest)],
    ["codRecords", codList.map(({ id, ...rest }) => rest)],
    ["notifications", notificationList],
    ["auditLogs", auditList],
  ];

  for (const [collection, docs] of writes) {
    if (docs.length === 0) continue;
    for (const doc of docs) {
      await db.collection(collection).updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
    }
    console.log(`  · ${collection.padEnd(16)} ${String(docs.length).padStart(4)} records`);
  }

  /* users ------------------------------------------------------------------- */
  console.log(`  · ${"users".padEnd(16)} ${String(seedUsers.length).padStart(4)} records`);
  let credentials = `\n# Chen Logistics demo credentials — generated ${new Date().toISOString()}\n# Local only. This file is git-ignored. Never commit credentials.\n`;

  for (const seed of seedUsers) {
    const _id = idFor("users", seed.email);
    const existing = await db.collection("users").findOne({ _id });
    let password = null;

    if (!existing) {
      password = randomPassword();
      const passwordHash = await hashPassword(password);
      await db.collection("users").updateOne(
        { _id },
        {
          $set: {
            email: seed.email,
            name: seed.name,
            role: seed.role,
            status: "active",
            passwordHash,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      );
      createdPasswords.push({ email: seed.email, password, role: seed.role });
      credentials += `${seed.email.padEnd(26)} ${password}  (${seed.role})\n`;
    } else {
      await db.collection("users").updateOne({ _id }, { $set: { role: seed.role, name: seed.name, email: seed.email, updatedAt: new Date() } });
    }
  }

  /* link driver + customer users ------------------------------------------- */
  await db.collection("users").updateOne(
    { _id: idFor("users", "driver1@chen.example") },
    { $set: { driverId: driverList[0].id, hubId: driverList[0].hubId } },
  );
  await db.collection("users").updateOne(
    { _id: idFor("users", "driver2@chen.example") },
    { $set: { driverId: driverList[1].id, hubId: driverList[1].hubId } },
  );
  await db.collection("users").updateOne(
    { _id: idFor("users", "customer1@chen.example") },
    { $set: { customerId: customerList[0].id } },
  );
  await db.collection("users").updateOne(
    { _id: idFor("users", "warehouse@chen.example") },
    { $set: { hubId: hubList[0].id } },
  );

  // Make the linked demo driver actually own a couple of live jobs.
  const liveJobs = shipmentList
    .filter((s) => ["out_for_delivery", "delivery_attempted", "in_transit"].includes(s.status))
    .slice(0, 6);
  for (const job of liveJobs) {
    await db.collection("shipments").updateOne(
      { _id: job._id },
      { $set: { driverId: driverList[0].id, driverName: driverList[0].name, vehicleId: vehicleList[0].id, vehicleRegistration: vehicleList[0].registrationNumber, updatedAt: new Date() } },
    );
  }

  /* indexes ----------------------------------------------------------------- */
  const indexes = [
    ["users", { email: 1 }, { unique: true, name: "users_email_unique" }],
    ["customers", { email: 1 }, { name: "customers_email" }],
    ["customers", { name: "text", code: "text" }, { name: "customers_text" }],
    ["shipments", { trackingNumber: 1 }, { unique: true, name: "shipments_tracking_unique" }],
    ["shipments", { customerId: 1 }, { name: "shipments_customer" }],
    ["shipments", { status: 1 }, { name: "shipments_status" }],
    ["shipments", { driverId: 1 }, { name: "shipments_driver" }],
    ["shipments", { tripId: 1 }, { name: "shipments_trip" }],
    ["shipments", { destinationHubId: 1 }, { name: "shipments_destination_hub" }],
    ["shipments", { createdAt: -1 }, { name: "shipments_created" }],
    ["trackingEvents", { shipmentId: 1, createdAt: 1 }, { name: "tracking_shipment_time" }],
    ["trips", { status: 1 }, { name: "trips_status" }],
    ["drivers", { status: 1 }, { name: "drivers_status" }],
    ["vehicles", { status: 1 }, { name: "vehicles_status" }],
    ["exceptions", { status: 1 }, { name: "exceptions_status" }],
    ["exceptions", { severity: 1 }, { name: "exceptions_severity" }],
    ["invoices", { invoiceNumber: 1 }, { unique: true, name: "invoices_number_unique" }],
    ["invoices", { customerId: 1 }, { name: "invoices_customer" }],
    ["payments", { invoiceId: 1 }, { name: "payments_invoice" }],
    ["codRecords", { shipmentId: 1 }, { unique: true, name: "cod_shipment_unique" }],
    ["codRecords", { status: 1 }, { name: "cod_status" }],
    ["notifications", { readAt: 1, createdAt: -1 }, { name: "notifications_unread" }],
    ["auditLogs", { createdAt: -1 }, { name: "audit_created" }],
    ["auditLogs", { entityType: 1, entityId: 1 }, { name: "audit_entity" }],
    ["pickups", { status: 1 }, { name: "pickups_status" }],
    ["hubOperations", { hubId: 1, createdAt: -1 }, { name: "hubops_hub_time" }],
  ];
  for (const [collection, keys, options] of indexes) {
    await db.collection(collection).createIndex(keys, options);
  }

  console.log(`\n[Chen] Indexes ensured across ${indexes.length} definitions.`);
  console.log(`[Chen] Tracking events written: ${trackingList.length}`);

  if (createdPasswords.length > 0) {
    console.log("\n─────────── demo account credentials (shown once) ───────────\n");
    for (const entry of createdPasswords) {
      console.log(`  ${entry.email.padEnd(26)} ${entry.password}   (${entry.role})`);
    }
    console.log(`\n  Saved to ${path.relative(root, credentialsPath)} (git-ignored).\n`);
    fs.appendFileSync(credentialsPath, credentials, "utf8");
  } else {
    console.log("\n[Chen] All seeded accounts already exist — passwords were not rotated.");
    console.log(`[Chen] Credentials file: ${path.relative(root, credentialsPath)}`);
  }

  await client.close();
  console.log("[Chen] Seed complete.\n");
}

main().catch((error) => {
  console.error("[Chen] Seed failed:", error);
  process.exit(1);
});
