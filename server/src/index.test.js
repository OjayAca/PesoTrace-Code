import assert from "node:assert/strict";
import test from "node:test";

test("development runtime store uses the bundled JSON snapshot by default", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";

  try {
    const { createRuntimeStore } = await import("./index.js");
    const store = await createRuntimeStore({ NODE_ENV: "development" });
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
