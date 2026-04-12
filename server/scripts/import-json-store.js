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

async function main() {
  const inputPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : defaultJsonPath;
  const source = await readJsonStore(inputPath);
  const store = createStoreFromEnv(process.env);

  await store.init();

  try {
    const existing = await store.getSnapshot();
    const existingCounts = getSnapshotCounts(existing);

    if (Object.values(existingCounts).some((count) => count > 0)) {
      throw new Error(
        `Target MySQL database is not empty: ${JSON.stringify(existingCounts)}. Import into an empty schema to avoid duplicates.`,
      );
    }

    for (const user of source.users) {
      await store.createUser(user);
    }

    for (const transaction of source.transactions) {
      await store.createTransaction(transaction);
    }

    for (const budget of source.budgets) {
      await store.upsertBudget(budget);
    }

    for (const template of source.recurringTemplates) {
      await store.createRecurringTemplate(template);
    }

    console.log(
      `Imported JSON store from ${inputPath}: ${JSON.stringify(getSnapshotCounts(source))}`,
    );
  } finally {
    await store.close();
  }
}

main().catch((error) => {
  console.error("Failed to import JSON store into MySQL.", error);
  process.exit(1);
});
