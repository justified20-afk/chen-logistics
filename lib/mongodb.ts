import { MongoClient, type Db } from "mongodb";
import { getMongoUri } from "@/lib/env";

type GlobalWithMongo = typeof globalThis & {
  __valeMongoClient?: Promise<MongoClient>;
  __valeMongoDb?: Promise<Db>;
};

const g = globalThis as GlobalWithMongo;

/**
 * Cached MongoClient singleton. Never call `MongoClient.connect()` from a
 * component or a page — always go through `getDb()`.
 */
export function getDb(): Promise<Db> {
  if (!g.__valeMongoDb) {
    g.__valeMongoDb = (async () => {
      const client = await (g.__valeMongoClient ??= MongoClient.connect(getMongoUri(), {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 8000,
      }));
      return client.db();
    })();

    g.__valeMongoDb.catch(() => {
      // Allow a later call to retry after a transient failure.
      g.__valeMongoDb = undefined;
    });
  }
  return g.__valeMongoDb;
}

export async function pingDatabase(): Promise<{ ok: boolean; error?: string }> {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
