#!/usr/bin/env node
/**
 * Ensures a local development MongoDB is reachable before `pnpm dev` / `pnpm seed`.
 *
 * - If MONGO_URI is set the developer owns the database: we do nothing.
 * - Otherwise we make sure something is listening on 127.0.0.1:PORT, starting a
 *   detached, disk-backed local mongod on first run (see scripts/local-mongo.mjs).
 */
import net from "node:net";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const dataDir = path.join(root, ".data");
const pidFile = path.join(dataDir, "mongo.pid");
const logFile = path.join(dataDir, "mongo.log");
const port = Number(process.env.LOCAL_MONGO_PORT || 27017);

function portOpen(target, timeout = 700) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeout);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(target, "127.0.0.1");
  });
}

async function waitForPort(target, attempts = 120, delay = 500) {
  for (let i = 0; i < attempts; i += 1) {
    if (await portOpen(target)) return true;
    await new Promise((r) => setTimeout(r, delay));
  }
  return false;
}

async function main() {
  if (process.env.MONGO_URI) {
    // Operator-provided database; never start a competing local instance.
    return;
  }

  if (await portOpen(port)) {
    return;
  }

  // Clean up a stale pid file from a previous run.
  try {
    if (fs.existsSync(pidFile)) fs.rmSync(pidFile, { force: true });
  } catch {
    /* ignore */
  }

  fs.mkdirSync(dataDir, { recursive: true });
  const child = spawn(process.execPath, [path.join(here, "local-mongo.mjs")], {
    cwd: root,
    detached: true,
    stdio: "ignore",
    env: { ...process.env, LOCAL_MONGO_PORT: String(port) },
  });
  child.unref();

  const started = await waitForPort(port);
  if (!started) {
    console.error(
      `\n[chen] Could not start a local MongoDB on port ${port}.\n` +
        `[chen] Check ${path.relative(root, logFile)} or set MONGO_URI to your own database.\n`,
    );
    process.exit(1);
  }
  console.log(`[chen] Local MongoDB ready on mongodb://127.0.0.1:${port}/chen (demo/dev data)`);
}

main().catch((error) => {
  console.error("[chen] dev-db failed:", error?.message ?? error);
  process.exit(1);
});
