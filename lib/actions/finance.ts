"use server";

import { revalidatePath } from "next/cache";
import { requirePermissionActor } from "@/lib/actions/context";
import { type ActionResult } from "@/lib/actions/result";
import {
  changeInvoiceStatus,
  collectCod,
  createInvoice,
  recordPayment,
  reconcileCod,
} from "@/lib/finance";

function refreshed(paths: string[] = ["/finance", "/dashboard"]) {
  for (const path of paths) revalidatePath(path, "layout");
}

export async function createInvoiceAction(
  raw: unknown,
): Promise<ActionResult<{ id: string; invoiceNumber: string; totalMinor: number }>> {
  const gate = await requirePermissionActor("finance.manage");
  if (!gate.ok) return gate.error;

  const result = await createInvoice(raw, gate.context);
  if (result.ok) refreshed(["/finance/invoices", `/finance/invoices/${result.data.id}`]);
  return result;
}

export async function recordPaymentAction(
  raw: unknown,
): Promise<ActionResult<{ id: string; reference: string; invoiceStatus?: string }>> {
  const gate = await requirePermissionActor("finance.manage");
  if (!gate.ok) return gate.error;

  const result = await recordPayment(raw, gate.context);
  if (result.ok) refreshed(["/finance/invoices", "/finance/payments", "/finance"]);
  return result;
}

export async function changeInvoiceStatusAction(
  raw: unknown,
): Promise<ActionResult<{ id: string; status: string; version: number }>> {
  const gate = await requirePermissionActor("finance.manage");
  if (!gate.ok) return gate.error;

  const result = await changeInvoiceStatus(raw, gate.context);
  if (result.ok) refreshed(["/finance/invoices", `/finance/invoices/${result.data.id}`]);
  return result;
}

export async function collectCodAction(
  raw: unknown,
): Promise<ActionResult<{ id: string; status: string; version: number }>> {
  const gate = await requirePermissionActor("finance.manage");
  if (!gate.ok) return gate.error;

  const result = await collectCod(raw, gate.context);
  if (result.ok) refreshed(["/finance/cod", "/finance"]);
  return result;
}

export async function reconcileCodAction(
  raw: unknown,
): Promise<ActionResult<{ id: string; status: string; version: number }>> {
  const gate = await requirePermissionActor("finance.manage");
  if (!gate.ok) return gate.error;

  const result = await reconcileCod(raw, gate.context);
  if (result.ok) refreshed(["/finance/cod", "/finance/reconciliation", "/finance", "/dashboard"]);
  return result;
}
