#!/usr/bin/env node
/**
 * Long-lived local development MongoDB.
 *
 * Uses mongodb-memory-server with a persistent dbPath so `pnpm seed` and
 * `pnpm dev` share the same data across runs. This file is never imported by
 * application code — scripts/dev-db.mjs spawns it detached.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const dataDir = path.join(root, ".data");
const dbPath = path.join(dataDir, "mongo");
const pidFile = path.join(dataDir, "mongo.pid");
const logFile = path.join(dataDir, "mongo.log");
const port = Number(process.env.LOCAL_MONGO_PORT || 27017);

fs.mkdirSync(dbPath, { recursive: true });

const log = fs.createWriteStream(logFile, { flags: "a" });
log.write(`\n[start ${new Date().toISOString()}] local mongod on port ${port}\n`);

const { MongoMemoryServer } = await import("mongodb-memory-server");

const server = await MongoMemoryServer.create({
  instance: { port, dbPath, storageEngine: "wiredTiger" },
});

fs.writeFileSync(pidFile, String(process.pid));
log.write(`[ready] ${server.getUri()}\n`);

const shutdown = async () => {
  try {
    await server.stop();
  } finally {
    try {
      fs.rmSync(pidFile, { force: true });
    } catch {
      /* ignore */
    }
    process.exit(0);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Stay alive until the machine or the developer stops us.
setInterval(() => {}, 1 << 30);
