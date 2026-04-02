import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDirectory = path.resolve(__dirname, "../data");
const databasePath = path.join(dataDirectory, "db.json");

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

const adapter = new JSONFile(databasePath);

export const db = new Low(adapter, {
  users: [],
  transactions: [],
  budgets: [],
});

export async function initStore() {
  await db.read();
  db.data ||= {
    users: [],
    transactions: [],
    budgets: [],
  };
  await db.write();
}

export async function persist() {
  await db.write();
}

