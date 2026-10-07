"use server";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongodb";
import { oid, toDomain } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { getBaseUrl } from "@/lib/env";
import { fieldErrors } from "@/lib/schemas/common";
import {
  forgotPasswordSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/schemas/auth";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import type { Customer, UserRecord } from "@/types/domain";

const RESET_TTL_MS = 1000 * 60 * 30;

/**
 * Self-service registration creates a **customer portal** account. Operations
 * accounts are always provisioned by an administrator.
 */
export async function registerAction(input: unknown): Promise<ActionResult<{ email: string }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });

  const db = await getDb();
  const email = parsed.data.email.toLowerCase();
  const existing = await db.collection("users").findOne({ email } as never);
  if (existing) {
    // Deliberately non-specific: do not confirm whether an address is registered.
    return fail(
      "We couldn't create an account with those details. If this address is already registered, sign in instead.",
    );
  }

  const now = new Date();
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const customerResult = await db.collection("customers").insertOne({
    code: await nextCustomerCode(db),
    name: parsed.data.companyName?.trim() || parsed.data.name,
    kind: parsed.data.companyName ? "business" : "personal",
    contactPerson: parsed.data.name,
    email,
    phone: parsed.data.phone,
    addresses: [],
    contacts: [{ id: randomBytes(6).toString("hex"), name: parsed.data.name, role: "Primary contact", email, phone: parsed.data.phone }],
    accountStatus: "active",
    notes: "Self-registered through the customer portal.",
    createdAt: now,
    updatedAt: now,
  } as never);

  const customer = await db.collection("customers").findOne({ _id: customerResult.insertedId } as never);
  const customerId = customerResult.insertedId.toString();

  await db.collection("users").insertOne({
    email,
    name: parsed.data.name,
    passwordHash,
    role: "customer",
    status: "active",
    customerId,
    phone: parsed.data.phone,
    createdAt: now,
    updatedAt: now,
  } as never);

  const created = toDomain<Customer>(customer);

  await recordAudit({
    action: "customer.registered",
    entityType: "customer",
    entityId: customerId,
    entityLabel: created.name,
    after: { email, role: "customer" },
  });

  await createNotification({
    type: "system",
    severity: "low",
    title: "New self-service customer account",
    body: `${created.name} registered through the portal and needs no operational action yet.`,
    actionHref: `/customers/${customerId}`,
    actionLabel: "Open customer",
    audienceRole: "operations_manager",
  });

  return ok({ email });
}

async function nextCustomerCode(db: Awaited<ReturnType<typeof getDb>>) {
  const count = await db.collection("customers").countDocuments();
  return `CUST-${String(count + 1).padStart(5, "0")}`;
}

export interface ForgotPasswordResult {
  message: string;
  devResetUrl?: string;
}

export async function forgotPasswordAction(
  input: unknown,
): Promise<ActionResult<ForgotPasswordResult>> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return fail("Enter a valid email address.", { fieldErrors: fieldErrors(parsed.error) });

  const generic: ForgotPasswordResult = {
    message:
      "If an account exists for that address, a reset request has been recorded. This deployment does not deliver email — contact your administrator if you cannot complete the reset.",
  };

  const db = await getDb();
  const email = parsed.data.email.toLowerCase();
  const doc = await db.collection("users").findOne({ email } as never);
  if (!doc) return ok(generic);

  const user = toDomain<UserRecord>(doc);
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  await db.collection("users").updateOne(
    { _id: oid(user.id) } as never,
    { $set: { passwordReset: { tokenHash, expiresAt: new Date(Date.now() + RESET_TTL_MS) }, updatedAt: new Date() } } as never,
  );

  await recordAudit({
    actorId: user.id,
    actorName: user.name,
    action: "auth.password_reset_requested",
    entityType: "user",
    entityId: user.id,
    entityLabel: user.email,
  });

  const resetUrl = `${getBaseUrl()}/reset-password/${token}`;

  // No email/SMS provider is configured, so nothing is claimed to have been
  // delivered. The link is only surfaced outside production so the flow is testable.
  if (process.env.NODE_ENV !== "production") {
    generic.devResetUrl = resetUrl;
  }

  return ok(generic);
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const db = await getDb();
  const doc = (await db.collection("users").findOne({
    "passwordReset.tokenHash": tokenHash,
  } as never)) as (Record<string, unknown> & { _id: unknown; email?: string }) | null;

  if (!doc) return fail("That reset link is invalid or has expired. Request a new one.");

  const payload = doc as Record<string, unknown> & { passwordReset?: { expiresAt: Date } };
  if (!payload.passwordReset?.expiresAt || new Date(payload.passwordReset.expiresAt).getTime() < Date.now()) {
    return fail("That reset link is invalid or has expired. Request a new one.");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await db.collection("users").updateOne(
    { _id: oid(String(doc._id)) } as never,
    { $set: { passwordHash, updatedAt: new Date() }, $unset: { passwordReset: "" } } as never,
  );

  await recordAudit({
    action: "auth.password_reset_completed",
    entityType: "user",
    entityId: String(doc._id),
    entityLabel: String(doc.email ?? ""),
  });

  return ok();
}
