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
  recurringTemplates: [],
});

function normalizeUser(user) {
  return {
    ...user,
    preferences: {
      preferredTheme: user?.preferences?.preferredTheme || "light",
      defaultBudget:
        user?.preferences?.defaultBudget === null ||
        user?.preferences?.defaultBudget === undefined ||
        user?.preferences?.defaultBudget === ""
          ? null
          : Number(user.preferences.defaultBudget),
      currency: user?.preferences?.currency || "PHP",
    },
  };
}

function normalizeTransaction(transaction) {
  return {
    ...transaction,
    type: transaction?.type === "income" ? "income" : "expense",
    category: String(transaction?.category || "Other").trim() || "Other",
  };
}

function normalizeRecurringTemplate(template) {
  return {
    ...template,
    type: template?.type === "income" ? "income" : "expense",
    category: String(template?.category || "Other").trim() || "Other",
    repeat: "monthly",
  };
}

function normalizeStoreData(data = {}) {
  return {
    users: Array.isArray(data.users) ? data.users.map(normalizeUser) : [],
    transactions: Array.isArray(data.transactions)
      ? data.transactions.map(normalizeTransaction)
      : [],
    budgets: Array.isArray(data.budgets) ? data.budgets : [],
    recurringTemplates: Array.isArray(data.recurringTemplates)
      ? data.recurringTemplates.map(normalizeRecurringTemplate)
      : [],
  };
}

export async function initStore() {
  await db.read();
  db.data = normalizeStoreData(db.data);
  await db.write();
}

export async function persist() {
  await db.write();
}
