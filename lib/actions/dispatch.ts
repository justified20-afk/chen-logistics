"use server";

import { revalidatePath } from "next/cache";
import { requirePermissionActor } from "@/lib/actions/context";
import { type ActionResult } from "@/lib/actions/result";
import {
  assignTrip,
  changeTripStatus,
  createTrip,
  listLoadableShipments,
  setTripShipments,
  type LoadableShipment,
} from "@/lib/dispatch";

function refreshed(paths: string[] = ["/dispatch", "/dashboard"]) {
  for (const path of paths) revalidatePath(path, "layout");
}

export async function createTripAction(
  raw: unknown,
): Promise<ActionResult<{ id: string; tripNumber: string }>> {
  const gate = await requirePermissionActor("dispatch.create");
  if (!gate.ok) return gate.error;

  const result = await createTrip(raw, gate.context);
  if (result.ok) refreshed([`/dispatch/${result.data.id}`]);
  return result;
}

export async function assignTripAction(
  raw: unknown,
): Promise<ActionResult<{ id: string; version: number }>> {
  const gate = await requirePermissionActor("dispatch.assign");
  if (!gate.ok) return gate.error;

  const result = await assignTrip(raw, gate.context);
  if (result.ok) refreshed([`/dispatch/${result.data.id}`]);
  return result;
}

export async function setTripShipmentsAction(
  raw: unknown,
): Promise<ActionResult<{ id: string; loaded: number; version: number }>> {
  const gate = await requirePermissionActor("dispatch.assign");
  if (!gate.ok) return gate.error;

  const result = await setTripShipments(raw, gate.context);
  if (result.ok) refreshed([`/dispatch/${result.data.id}`, "/shipments"]);
  return result;
}

/** Type-ahead over shipments that can be loaded onto a trip. */
export async function searchLoadableShipmentsAction(
  tripId: string,
  query?: string,
): Promise<LoadableShipment[]> {
  const gate = await requirePermissionActor("dispatch.view");
  if (!gate.ok) return [];
  if (!tripId) return [];
  return listLoadableShipments(tripId, query, 25);
}

export async function changeTripStatusAction(
  raw: unknown,
): Promise<ActionResult<{ id: string; status: string; version: number }>> {
  const gate = await requirePermissionActor("dispatch.dispatch");
  if (!gate.ok) return gate.error;

  const result = await changeTripStatus(raw, gate.context);
  if (result.ok) refreshed([`/dispatch/${result.data.id}`, "/dashboard", "/shipments"]);
  return result;
}
