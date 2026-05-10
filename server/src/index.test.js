import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
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

test("runtime config rejects short JWT_SECRET values", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";

  try {
    const { validateRuntimeConfig } = await import("./index.js");

    assert.throws(
      () => validateRuntimeConfig({ NODE_ENV: "development", JWT_SECRET: "short" }),
      /JWT_SECRET must be at least 32 characters/,
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

test("production runtime rejects memory store without explicit override", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";

  try {
    const { createRuntimeStore } = await import("./index.js");

    await assert.rejects(
      createRuntimeStore({ NODE_ENV: "production", MYSQL_STORE: "memory" }),
      /MYSQL_STORE=memory is not allowed in production/,
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

test("listenWithAvailablePort retries when the selected port fails to bind", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousConsoleLog = console.log;
  process.env.NODE_ENV = "test";
  console.log = () => {};

  try {
    const { listenWithAvailablePort } = await import("./index.js");
    const attempts = [];
    const app = {
      listen(port) {
        attempts.push(port);
        const server = new EventEmitter();

        process.nextTick(() => {
          if (attempts.length === 1) {
            const error = new Error("Port is busy");
            error.code = "EADDRINUSE";
            server.emit("error", error);
            return;
          }

          server.emit("listening");
        });

        return server;
      },
    };

    const server = await listenWithAvailablePort(app, 5100);

    assert.ok(server);
    assert.deepEqual(attempts, [5100, 5101]);
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }

    console.log = previousConsoleLog;
  }
});
