import assert from "node:assert/strict";
import test from "node:test";
import { readStorageValue, writeStorageValue, removeStorageValue } from "./storage.js";

function createStorageStub(seed = {}) {
  const values = new Map(Object.entries(seed));

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test("storage helpers read, write, and remove values safely", () => {
  const storage = createStorageStub({ theme: "dark" });

  assert.equal(readStorageValue("theme", "light", storage), "dark");
  writeStorageValue("lastExport", "2026-04-25T00:00:00.000Z", storage);
  assert.equal(
    readStorageValue("lastExport", "", storage),
    "2026-04-25T00:00:00.000Z",
  );
  removeStorageValue("theme", storage);
  assert.equal(readStorageValue("theme", "light", storage), "light");
});

test("storage helpers fall back when localStorage access throws", () => {
  const originalWindow = global.window;

  global.window = {
    get localStorage() {
      throw new Error("storage disabled");
    },
  };

  try {
    assert.equal(readStorageValue("theme", "light"), "light");
    writeStorageValue("theme", "dark");
    removeStorageValue("theme");
  } finally {
    global.window = originalWindow;
  }
});
