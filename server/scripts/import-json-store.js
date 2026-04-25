import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createStoreFromEnv, normalizeStoreData } from "../src/store.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultJsonPath = path.resolve(__dirname, "../data/db.json");

async function readJsonStore(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  return normalizeStoreData(JSON.parse(content));
}

function getSnapshotCounts(snapshot) {
  return {
    users: snapshot.users.length,
    transactions: snapshot.transactions.length,
    budgets: snapshot.budgets.length,
    recurringTemplates: snapshot.recurringTemplates.length,
  };
}

export async function importJsonStore({
  inputPath = defaultJsonPath,
  env = process.env,
} = {}) {
  const source = await readJsonStore(inputPath);
  const store = createStoreFromEnv(env);

  await store.init();

  try {
    const existing = await store.getSnapshot();
    const existingCounts = getSnapshotCounts(existing);

    if (Object.values(existingCounts).some((count) => count > 0)) {
      throw new Error(
        `Target MySQL database is not empty: ${JSON.stringify(existingCounts)}. Import into an empty schema to avoid duplicates.`,
      );
    }

    const transactionalStore = typeof store.runInTransaction === "function" ? store : null;

    const importWork = async (connection = null) => {
      for (const user of source.users) {
        await store.createUser(user, connection);
      }

      for (const transaction of source.transactions) {
        await store.createTransaction(transaction, connection);
      }

      for (const budget of source.budgets) {
        await store.upsertBudget(budget, connection);
      }

      for (const template of source.recurringTemplates) {
        await store.createRecurringTemplate(template, connection);
      }
    };

    if (transactionalStore) {
      await transactionalStore.runInTransaction(importWork);
    } else {
      await importWork();
    }

    console.log(
      `Imported JSON store from ${inputPath}: ${JSON.stringify(getSnapshotCounts(source))}`,
    );
    return getSnapshotCounts(source);
  } finally {
    await store.close();
  }
}

async function main() {
  const inputPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : defaultJsonPath;

  await importJsonStore({ inputPath, env: process.env });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error("Failed to import JSON store into MySQL.", error);
    process.exit(1);
  });
}
