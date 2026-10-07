import { ObjectId } from "mongodb";
import { createHash } from "node:crypto";

/**
 * MongoDB documents → domain objects.
 *
 * BSON `Date` values become ISO-8601 strings and `_id` becomes `id`, so the
 * domain layer can serialise to the client for free.
 */
function revive(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof ObjectId) return value.toString();
  if (Array.isArray(value)) return value.map(revive);
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(source)) {
      if (key === "_id") continue;
      output[key] = revive(entry);
    }
    if (source._id !== undefined && source._id !== null) {
      output.id = String(source._id);
    }
    return output;
  }
  return value;
}

export function toDomain<T>(doc: unknown): T {
  return revive(doc) as T;
}

export function toDomainList<T>(docs: unknown[]): T[] {
  return docs.map((doc) => revive(doc)) as T[];
}

export function oid(value: string | ObjectId | undefined | null): ObjectId | undefined {
  if (!value) return undefined;
  if (value instanceof ObjectId) return value;
  return ObjectId.isValid(value) ? new ObjectId(value) : undefined;
}

/** Deterministic ObjectId used by the seed script so re-seeding is idempotent. */
export function stableId(namespace: string, key: string): ObjectId {
  const digest = createHash("sha1").update(`${namespace}:${key}`).digest();
  return new ObjectId(digest.subarray(0, 12));
}

const SENSITIVE_KEY = /password|secret|token|hash|authorization|apikey|api_key/i;

/** Strips credential-shaped fields before anything is written to an audit record. */
export function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((entry) => sanitize(entry, depth + 1));
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(key)) {
        output[key] = "[redacted]";
        continue;
      }
      output[key] = sanitize(entry, depth + 1);
    }
    return output;
  }
  return value;
}
