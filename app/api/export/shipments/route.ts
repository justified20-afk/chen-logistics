import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { listShipments, type ShipmentListFilter } from "@/lib/shipments";
import { shipmentFilterSchema } from "@/lib/schemas/shipment";

export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  const text = value === undefined || value === null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.permissions.includes("shipments.view") && !user.permissions.includes("customer.portal")) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const url = new URL(request.url);
  const plain: Record<string, string | undefined> = {};
  url.searchParams.forEach((value, key) => {
    plain[key] = value;
  });
  const parsed = shipmentFilterSchema.safeParse(plain);
  const filter: ShipmentListFilter = parsed.success ? parsed.data : {};

  // Exports are bounded: a full book is exported page by page, not unbounded.
  const pageSize = 200;
  const maxPages = 25;
  const rows: string[] = [
    [
      "trackingNumber",
      "status",
      "customer",
      "origin",
      "destination",
      "serviceLevel",
      "driver",
      "promisedDeliveryAt",
      "paymentStatus",
      "shippingFeeMinor",
      "codAmountMinor",
      "createdAt",
    ].join(","),
  ];

  for (let page = 1; page <= maxPages; page += 1) {
    const result = await listShipments({ ...filter, page, pageSize }, user);
    if (result.rows.length === 0) break;
    for (const shipment of result.rows) {
      rows.push(
        [
          shipment.trackingNumber,
          shipment.status,
          shipment.customerName,
          `${shipment.sender.city}, ${shipment.sender.state}`,
          `${shipment.recipient.city}, ${shipment.recipient.state}`,
          shipment.serviceLevel,
          shipment.driverName ?? "",
          shipment.promisedDeliveryAt ?? "",
          shipment.paymentStatus,
          shipment.shippingFeeMinor,
          shipment.codAmountMinor ?? "",
          shipment.createdAt,
        ]
          .map(csvCell)
          .join(","),
      );
    }
    if (result.rows.length < pageSize) break;
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(`${rows.join("\r\n")}\r\n`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vale-shipments-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
