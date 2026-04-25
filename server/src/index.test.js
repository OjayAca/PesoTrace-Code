import assert from "node:assert/strict";
import test from "node:test";

test("runtime config requires JWT_SECRET", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";

  try {
    const { validateRuntimeConfig } = await import("./index.js");

    assert.throws(
      () => validateRuntimeConfig({ NODE_ENV: "development" }),
      /JWT_SECRET is required/,
    );
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }
});

test("development runtime store defaults to MySQL and requires configuration", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";

  try {
    const { createRuntimeStore } = await import("./index.js");

    await assert.rejects(
      createRuntimeStore({ NODE_ENV: "development" }),
      /MySQL configuration is missing/,
    );
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }
});

test("explicit memory mode uses the bundled JSON snapshot", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";

  try {
    const { createRuntimeStore } = await import("./index.js");
    const store = await createRuntimeStore({ NODE_ENV: "development", MYSQL_STORE: "memory" });
    const snapshot = await store.getSnapshot();

    assert.ok(snapshot.users.length > 0);
    assert.ok(snapshot.transactions.length > 0);

    await store.close();
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }
});
