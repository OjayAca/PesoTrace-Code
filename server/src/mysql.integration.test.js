import assert from "node:assert/strict";
import test from "node:test";

/**
 * Optional: run against a real MySQL when all MYSQL_* vars and JWT_SECRET are set.
 *   RUN_MYSQL_INTEGRATION=1 npm test --workspace server
 */
test(
  "MySQL store initializes and ping succeeds",
  { skip: process.env.RUN_MYSQL_INTEGRATION !== "1" },
  async () => {
    const secret =
      process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32
        ? process.env.JWT_SECRET
        : "x".repeat(32);
    process.env.JWT_SECRET = secret;

    const { createStoreFromEnv } = await import("./store.js");
    const store = createStoreFromEnv(process.env);
    await store.init();
    await store.ping();
    await store.close();
    assert.ok(true);
  },
);
