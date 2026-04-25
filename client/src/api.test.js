import assert from "node:assert/strict";
import test from "node:test";

function installWindowStub() {
  const listeners = new Map();

  global.window = {
    setTimeout,
    clearTimeout,
    dispatchEvent(event) {
      const handlers = listeners.get(event.type) || [];
      for (const handler of handlers) {
        handler(event);
      }
      return true;
    },
    addEventListener(type, handler) {
      const handlers = listeners.get(type) || [];
      handlers.push(handler);
      listeners.set(type, handlers);
    },
    removeEventListener(type, handler) {
      const handlers = listeners.get(type) || [];
      listeners.set(
        type,
        handlers.filter((entry) => entry !== handler),
      );
    },
  };
}

function restoreWindowStub(originalWindow) {
  global.window = originalWindow;
}

test("logout resolves and dispatches auth expired when the session already expired", async () => {
  const originalWindow = global.window;
  const originalFetch = global.fetch;
  const originalCustomEvent = global.CustomEvent;
  const events = [];

  installWindowStub();
  global.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };
  global.window.addEventListener("pesotrace:auth-expired", () => {
    events.push("expired");
  });
  global.fetch = async () => ({
    status: 401,
    ok: false,
    statusText: "Unauthorized",
    json: async () => ({ message: "Your session is invalid or expired." }),
  });

  try {
    const { api } = await import("./api.js");
    const result = await api.logout();

    assert.deepEqual(result, { success: true });
    assert.deepEqual(events, ["expired"]);
  } finally {
    restoreWindowStub(originalWindow);
    global.fetch = originalFetch;
    global.CustomEvent = originalCustomEvent;
  }
});
