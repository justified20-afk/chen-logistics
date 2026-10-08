import "server-only";
import { getDb } from "@/lib/mongodb";
import { sanitize, stableId } from "@/lib/db";

export interface AuditInput {
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId: string;
  entityLabel?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
}

/**
 * Appends an immutable audit record. Audit logs are never rewritten and never
 * contain credential-shaped fields.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    const db = await getDb();
    await db.collection("auditLogs").insertOne({
      actorId: input.actorId,
      actorName: input.actorName,
      actorRole: input.actorRole,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      entityLabel: input.entityLabel,
      before: input.before === undefined ? undefined : sanitize(input.before),
      after: input.after === undefined ? undefined : sanitize(input.after),
      ip: input.ip,
      userAgent: input.userAgent,
      createdAt: new Date(),
    } as never);
  } catch (error) {
    // Auditing must never break the operational action it describes, but the
    // failure is logged loudly for the operator.
    console.error("[chen] failed to write audit log", {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function auditId(kind: string, unique: string) {
  return stableId("audit", `${kind}:${unique}`);
}
