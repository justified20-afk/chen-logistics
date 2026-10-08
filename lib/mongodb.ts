import { MongoClient, type Db } from "mongodb";
import { getMongoUri } from "@/lib/env";

type GlobalWithMongo = typeof globalThis & {
  __chenMongoClient?: Promise<MongoClient>;
  __chenMongoDb?: Promise<Db>;
};

const g = globalThis as GlobalWithMongo;

/**
 * Cached MongoClient singleton. Never call `MongoClient.connect()` from a
 * component or a page — always go through `getDb()`.
 */
export function getDb(): Promise<Db> {
  if (!g.__chenMongoDb) {
    g.__chenMongoDb = (async () => {
      const client = await (g.__chenMongoClient ??= MongoClient.connect(getMongoUri(), {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 8000,
      }));
      return client.db();
    })();

    g.__chenMongoDb.catch(() => {
      // Allow a later call to retry after a transient failure.
      g.__chenMongoDb = undefined;
    });
  }
  return g.__chenMongoDb;
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
