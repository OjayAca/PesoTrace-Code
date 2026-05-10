import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureJwtSecret } from "./auth.js";
import { ensureEmailConfig } from "./email.js";
import { createMemoryStore, createStoreFromEnv, normalizeStoreData } from "./store.js";
import { createApp } from "./app.js";

dotenv.config();

const DEFAULT_PORT = Number(process.env.PORT || 5000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const bundledSnapshotPath = path.resolve(__dirname, "../data/db.json");

async function loadBundledSnapshot() {
  const content = await fs.readFile(bundledSnapshotPath, "utf8");
  return normalizeStoreData(JSON.parse(content));
}

function listen(app, port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port);

    const handleError = (error) => {
      reject(error);
    };

    server.once("error", handleError);
    server.once("listening", () => {
      server.off("error", handleError);
      console.log(`PesoTrace API listening on http://localhost:${port}`);
      resolve(server);
    });
  });
}

export async function listenWithAvailablePort(app, startPort) {
  const requestedPort = Number(startPort);
  let port = requestedPort;

  while (true) {
    try {
      const server = await listen(app, port);

      if (port !== requestedPort) {
        console.log(`Port ${requestedPort} is unavailable. Started the API on ${port} instead.`);
      }

      return server;
    } catch (error) {
      if (error.code !== "EADDRINUSE" && error.code !== "EACCES") {
        throw error;
      }

      port += 1;
    }
  }
}

export async function createRuntimeStore(env = process.env) {
  const storeMode = String(env.MYSQL_STORE || "").trim().toLowerCase();

  if (storeMode === "memory") {
    if (env.NODE_ENV === "production" && env.ALLOW_MEMORY_STORE !== "true") {
      throw new Error("MYSQL_STORE=memory is not allowed in production unless ALLOW_MEMORY_STORE=true.");
    }

    const seedData = await loadBundledSnapshot();
    const memoryStore = createMemoryStore(seedData);
    await memoryStore.init();
    return memoryStore;
  }

  const mysqlStore = createStoreFromEnv(env);
  await mysqlStore.init();
  return mysqlStore;
}

export function validateRuntimeConfig(env = process.env) {
  ensureJwtSecret(env);
  ensureEmailConfig(env);
}

export async function startServer() {
  validateRuntimeConfig(process.env);
  const store = await createRuntimeStore(process.env);
  const app = createApp({
    store,
    clientOrigin: CLIENT_ORIGIN,
  });

  return listenWithAvailablePort(app, DEFAULT_PORT);
}

if (process.env.NODE_ENV !== "test") {
  startServer().catch((error) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `The selected API port is already in use. Set PORT to another value or run "npm run dev" from the project root.`,
      );
      process.exit(1);
    }

    console.error("Failed to initialize data store.", error);
    process.exit(1);
  });
}
