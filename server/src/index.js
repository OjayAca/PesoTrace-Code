import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMemoryStore, createStoreFromEnv, normalizeStoreData } from "./store.js";
import { createApp } from "./app.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
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

export async function createRuntimeStore(env = process.env) {
  if (env.NODE_ENV !== "production" && env.MYSQL_STORE !== "true") {
    const seedData = await loadBundledSnapshot();
    const memoryStore = createMemoryStore(seedData);
    await memoryStore.init();
    return memoryStore;
  }

  let mysqlStore;

  try {
    mysqlStore = createStoreFromEnv(env);
    await mysqlStore.init();
    return mysqlStore;
  } catch (error) {
    if (env.NODE_ENV === "production") {
      throw error;
    }

    console.warn(
      `MySQL store unavailable, starting with bundled JSON data instead: ${error.message}`,
    );

    if (mysqlStore) {
      await mysqlStore.close().catch(() => {});
    }

    const seedData = await loadBundledSnapshot();
    const memoryStore = createMemoryStore(seedData);
    await memoryStore.init();
    return memoryStore;
  }
}

export async function startServer() {
  const store = await createRuntimeStore(process.env);
  const app = createApp({
    store,
    clientOrigin: CLIENT_ORIGIN,
  });

  return listen(app, PORT);
}

if (process.env.NODE_ENV !== "test") {
  startServer().catch((error) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use. Set PORT to another value or run "npm run dev" from the project root to auto-select a free API port.`,
      );
      process.exit(1);
    }

    console.error("Failed to initialize data store.", error);
    process.exit(1);
  });
}
