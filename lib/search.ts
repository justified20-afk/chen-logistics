import "server-only";
import { getDb } from "@/lib/mongodb";
import type { SearchResult } from "@/types/domain";
import type { SessionUser } from "@/lib/session";

const MAX_PER_KIND = 4;

/**
 * Cross-entity search: tracking number, customer, phone, invoice, trip, driver and
 * vehicle registration. Results are scoped by the caller's permissions and, for
 * portal roles, by ownership.
 */
export async function globalSearch(rawQuery: string, user: SessionUser): Promise<SearchResult[]> {
  const query = rawQuery.trim();
  if (query.length < 2) return [];

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "i");
  const db = await getDb();
  const results: SearchResult[] = [];
  const isCustomer = user.role === "customer";
  const isDriver = user.role === "driver";

  if (user.permissions.includes("shipments.view")) {
    const shipmentFilter: Record<string, unknown> = { $or: [{ trackingNumber: regex }] };
    if (isCustomer) shipmentFilter.customerId = user.customerId;
    if (isDriver) shipmentFilter.driverId = user.driverId;
    const shipments = await db
      .collection("shipments")
      .find(shipmentFilter as never)
      .limit(MAX_PER_KIND)
      .toArray();
    for (const doc of shipments) {
      const shipment = doc as unknown as {
        id?: string;
        _id: unknown;
        trackingNumber: string;
        status: string;
        recipient: { name: string; city: string };
      };
      results.push({
        kind: "shipment",
        id: String(shipment.id ?? shipment._id),
        label: shipment.trackingNumber,
        sublabel: `${shipment.status.replace(/_/g, " ")} · ${shipment.recipient?.city ?? ""}`,
        href: isCustomer || isDriver ? shipmentHref(user.role, String(shipment.id ?? shipment._id)) : `/shipments/${shipment.id ?? shipment._id}`,
      });
    }

    const recipientMatches = await db
      .collection("shipments")
      .find(
        {
          $or: [{ "recipient.name": regex }, { "recipient.phone": regex }, { "sender.name": regex }],
          ...(isCustomer ? { customerId: user.customerId } : {}),
        } as never,
      )
      .limit(MAX_PER_KIND)
      .toArray();
    for (const doc of recipientMatches) {
      const shipment = doc as unknown as { id?: string; _id: unknown; trackingNumber: string; recipient: { name: string } };
      const id = String(shipment.id ?? shipment._id);
      if (results.some((r) => r.kind === "shipment" && r.id === id)) continue;
      results.push({
        kind: "shipment",
        id,
        label: shipment.trackingNumber,
        sublabel: `Recipient: ${shipment.recipient?.name}`,
        href: shipmentHref(user.role, id),
      });
    }
  }

  if (!isCustomer && user.permissions.includes("customers.view")) {
    const customers = await db
      .collection("customers")
      .find({ $or: [{ name: regex }, { email: regex }, { phone: regex }, { code: regex }] } as never)
      .limit(MAX_PER_KIND)
      .toArray();
    for (const doc of customers) {
      const customer = doc as unknown as { id?: string; _id: unknown; name: string; code: string };
      results.push({
        kind: "customer",
        id: String(customer.id ?? customer._id),
        label: customer.name,
        sublabel: customer.code,
        href: `/customers/${customer.id ?? customer._id}`,
      });
    }
  }

  if (user.permissions.includes("finance.view")) {
    const invoices = await db
      .collection("invoices")
      .find({ invoiceNumber: regex })
      .limit(MAX_PER_KIND)
      .toArray();
    for (const doc of invoices) {
      const invoice = doc as unknown as { id?: string; _id: unknown; invoiceNumber: string; status: string };
      results.push({
        kind: "invoice",
        id: String(invoice.id ?? invoice._id),
        label: invoice.invoiceNumber,
        sublabel: invoice.status,
        href: `/finance/invoices?highlight=${encodeURIComponent(invoice.invoiceNumber)}`,
      });
    }
  }

  if (user.permissions.includes("dispatch.view")) {
    const trips = await db.collection("trips").find({ tripNumber: regex }).limit(MAX_PER_KIND).toArray();
    for (const doc of trips) {
      const trip = doc as unknown as { id?: string; _id: unknown; tripNumber: string; status: string };
      results.push({
        kind: "trip",
        id: String(trip.id ?? trip._id),
        label: trip.tripNumber,
        sublabel: trip.status.replace(/_/g, " "),
        href: `/dispatch/${trip.id ?? trip._id}`,
      });
    }
  }

  if (user.permissions.includes("drivers.view")) {
    const drivers = await db
      .collection("drivers")
      .find({ $or: [{ name: regex }, { phone: regex }, { employeeId: regex }, { licenseNumber: regex }] } as never)
      .limit(MAX_PER_KIND)
      .toArray();
    for (const doc of drivers) {
      const driver = doc as unknown as { id?: string; _id: unknown; name: string; employeeId: string };
      results.push({
        kind: "driver",
        id: String(driver.id ?? driver._id),
        label: driver.name,
        sublabel: driver.employeeId,
        href: `/fleet/drivers/${driver.id ?? driver._id}`,
      });
    }
  }

  if (user.permissions.includes("fleet.view")) {
    const vehicles = await db
      .collection("vehicles")
      .find({ registrationNumber: regex })
      .limit(MAX_PER_KIND)
      .toArray();
    for (const doc of vehicles) {
      const vehicle = doc as unknown as { id?: string; _id: unknown; registrationNumber: string; type: string };
      results.push({
        kind: "vehicle",
        id: String(vehicle.id ?? vehicle._id),
        label: vehicle.registrationNumber,
        sublabel: vehicle.type,
        href: `/fleet/vehicles/${vehicle.id ?? vehicle._id}`,
      });
    }
  }

  if (user.permissions.includes("exceptions.view")) {
    const exceptions = await db
      .collection("exceptions")
      .find({ $or: [{ reference: regex }, { title: regex }] } as never)
      .limit(MAX_PER_KIND)
      .toArray();
    for (const doc of exceptions) {
      const item = doc as unknown as { id?: string; _id: unknown; reference: string; title: string };
      results.push({
        kind: "exception",
        id: String(item.id ?? item._id),
        label: item.reference,
        sublabel: item.title,
        href: `/exceptions/${item.id ?? item._id}`,
      });
    }
  }

  return results.slice(0, 20);
}

function shipmentHref(role: string, shipmentId: string): string {
  // Portal roles open the same shipment detail page — it performs its own
  // ownership check, so one canonical route serves every role.
  void role;
  return `/shipments/${shipmentId}`;
}
