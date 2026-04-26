import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import { createToken } from "./auth.js";
import { createApp } from "./app.js";
import { createMemoryStore } from "./store.js";

process.env.JWT_SECRET = "test-jwt-secret";

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function startTestApp(seedData = {}) {
  const store = createMemoryStore(seedData);

  const app = createApp({
    store,
    clientOrigin: "http://localhost:5173",
  });

  const server = await new Promise((resolve) => {
    const listener = app.listen(0, () => resolve(listener));
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, options);
    const data = await response.json().catch(() => ({}));
    return { response, data };
  }

  return { store, server, request };
}

test("register creates a user, sets a session cookie, and omits passwordHash", async (t) => {
  const { store, server, request } = await startTestApp();
  t.after(() => closeServer(server));

  const { response, data } = await request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test User",
      email: "tester@example.com",
      password: "secret123",
    }),
  });

  assert.equal(response.status, 201);
  const snapshot = await store.getSnapshot();
  assert.equal(snapshot.users.length, 1);
  assert.equal(snapshot.users[0].email, "tester@example.com");
  assert.ok(snapshot.users[0].passwordHash);
  assert.equal(data.user.email, "tester@example.com");
  assert.equal("passwordHash" in data.user, false);
  assert.equal("token" in data, false);
  assert.match(response.headers.get("set-cookie") || "", /pesotrace-session=/);
});

test("register rejects duplicate emails", async (t) => {
  const passwordHash = await bcrypt.hash("secret123", 1);
  const { server, request } = await startTestApp({
    users: [
      {
        id: "user-1",
        name: "Existing User",
        email: "duplicate@example.com",
        passwordHash,
        createdAt: "2026-04-10T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  const { response, data } = await request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Another User",
      email: "duplicate@example.com",
      password: "secret123",
    }),
  });

  assert.equal(response.status, 409);
  assert.equal(data.message, "That email is already registered.");
});

test("register rejects short passwords", async (t) => {
  const { server, request } = await startTestApp();
  t.after(() => closeServer(server));

  const { response, data } = await request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Short Password",
      email: "short@example.com",
      password: "123",
    }),
  });

  assert.equal(response.status, 400);
  assert.equal(data.message, "Password must be at least 6 characters.");
});

test("login returns the user and sets a session cookie for valid credentials", async (t) => {
  const passwordHash = await bcrypt.hash("secret123", 1);
  const { server, request } = await startTestApp({
    users: [
      {
        id: "user-1",
        name: "Existing User",
        email: "login@example.com",
        passwordHash,
        createdAt: "2026-04-10T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  const { response, data } = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "login@example.com",
      password: "secret123",
    }),
  });

  assert.equal(response.status, 200);
  assert.equal(data.user.email, "login@example.com");
  assert.equal("token" in data, false);
  assert.match(response.headers.get("set-cookie") || "", /HttpOnly/i);
});

test("login keeps SameSite=Lax for same-site loopback requests", async (t) => {
  const passwordHash = await bcrypt.hash("secret123", 1);
  const { server, request } = await startTestApp({
    users: [
      {
        id: "user-same-site",
        name: "Same Site User",
        email: "same-site@example.com",
        passwordHash,
        createdAt: "2026-04-10T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  const { response } = await request("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://127.0.0.1:5173",
    },
    body: JSON.stringify({
      email: "same-site@example.com",
      password: "secret123",
    }),
  });

  const cookieHeader = response.headers.get("set-cookie") || "";
  assert.equal(response.status, 200);
  assert.match(cookieHeader, /SameSite=Lax/i);
  assert.doesNotMatch(cookieHeader, /SameSite=None/i);
});

test("login uses cross-site cookie attributes for supported localhost aliases", async (t) => {
  const passwordHash = await bcrypt.hash("secret123", 1);
  const { server, request } = await startTestApp({
    users: [
      {
        id: "user-cross-site",
        name: "Cross Site User",
        email: "cross-site@example.com",
        passwordHash,
        createdAt: "2026-04-10T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  const { response } = await request("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({
      email: "cross-site@example.com",
      password: "secret123",
    }),
  });

  const cookieHeader = response.headers.get("set-cookie") || "";
  assert.equal(response.status, 200);
  assert.match(cookieHeader, /SameSite=None/i);
  assert.match(cookieHeader, /Secure/i);
});

test("login rejects invalid credentials", async (t) => {
  const passwordHash = await bcrypt.hash("secret123", 1);
  const { server, request } = await startTestApp({
    users: [
      {
        id: "user-1",
        name: "Existing User",
        email: "login@example.com",
        passwordHash,
        createdAt: "2026-04-10T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  const { response, data } = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "login@example.com",
      password: "wrong-password",
    }),
  });

  assert.equal(response.status, 401);
  assert.equal(data.message, "Invalid email or password.");
});

test("login rejects missing credentials", async (t) => {
  const { server, request } = await startTestApp();
  t.after(() => closeServer(server));

  const { response, data } = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "",
      password: "",
    }),
  });

  assert.equal(response.status, 400);
  assert.equal(data.message, "Email and password are required.");
});

test("me returns the authenticated user for a valid token", async (t) => {
  const user = {
    id: "user-1",
    name: "Existing User",
    email: "me@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
  };
  const token = createToken(user);
  const { server, request } = await startTestApp({
    users: [user],
  });
  t.after(() => closeServer(server));

  const { response, data } = await request("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  assert.equal(response.status, 200);
  assert.equal(data.user.email, "me@example.com");
  assert.equal("passwordHash" in data.user, false);
});

test("me rejects requests without a token", async (t) => {
  const { server, request } = await startTestApp();
  t.after(() => closeServer(server));

  const { response, data } = await request("/api/auth/me");

  assert.equal(response.status, 401);
  assert.equal(data.message, "Authentication is required.");
});

test("me rejects invalid tokens", async (t) => {
  const { server, request } = await startTestApp();
  t.after(() => closeServer(server));

  const { response, data } = await request("/api/auth/me", {
    headers: {
      Authorization: "Bearer invalid-token",
    },
  });

  assert.equal(response.status, 401);
  assert.equal(data.message, "Your session is invalid or expired.");
});

test("malformed session cookies fail closed with a 401", async (t) => {
  const { server, request } = await startTestApp();
  t.after(() => closeServer(server));

  const { response, data } = await request("/api/auth/me", {
    headers: {
      Cookie: "pesotrace-session=%E0%A4%A",
    },
  });

  assert.equal(response.status, 401);
  assert.equal(data.message, "Your session is invalid or expired.");
});

test("me accepts the session cookie set during login", async (t) => {
  const passwordHash = await bcrypt.hash("secret123", 1);
  const { server, request } = await startTestApp({
    users: [
      {
        id: "user-cookie",
        name: "Cookie User",
        email: "cookie@example.com",
        passwordHash,
        createdAt: "2026-04-10T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  const loginResponse = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "cookie@example.com",
      password: "secret123",
    }),
  });

  const cookieHeader = loginResponse.response.headers.get("set-cookie") || "";
  const { response, data } = await request("/api/auth/me", {
    headers: {
      Cookie: cookieHeader.split(";")[0],
    },
  });

  assert.equal(response.status, 200);
  assert.equal(data.user.email, "cookie@example.com");
});

test("logout clears the session cookie", async (t) => {
  const passwordHash = await bcrypt.hash("secret123", 1);
  const { server, request } = await startTestApp({
    users: [
      {
        id: "user-logout",
        name: "Logout User",
        email: "logout@example.com",
        passwordHash,
        createdAt: "2026-04-10T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  const loginResponse = await request("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({
      email: "logout@example.com",
      password: "secret123",
    }),
  });

  const cookieHeader = loginResponse.response.headers.get("set-cookie") || "";
  const { response, data } = await request("/api/auth/logout", {
    method: "POST",
    headers: {
      Cookie: cookieHeader.split(";")[0],
      Origin: "http://localhost:5173",
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(data, { success: true });
  assert.match(response.headers.get("set-cookie") || "", /pesotrace-session=;/);
  assert.match(response.headers.get("set-cookie") || "", /SameSite=None/i);
  assert.match(response.headers.get("set-cookie") || "", /Secure/i);
});

test("cookie-authenticated mutations reject requests without a trusted origin", async (t) => {
  const passwordHash = await bcrypt.hash("secret123", 1);
  const { server, request } = await startTestApp({
    users: [
      {
        id: "user-csrf",
        name: "Csrf User",
        email: "csrf@example.com",
        passwordHash,
        createdAt: "2026-04-10T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  const loginResponse = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "csrf@example.com",
      password: "secret123",
    }),
  });

  const cookieHeader = loginResponse.response.headers.get("set-cookie") || "";
  const { response, data } = await request("/api/transactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader.split(";")[0],
    },
    body: JSON.stringify({
      title: "Blocked request",
      amount: 100,
      transactionDate: "2026-04-12",
      type: "expense",
      category: "Food",
      notes: "",
    }),
  });

  assert.equal(response.status, 403);
  assert.equal(
    data.message,
    "This request origin is not allowed for session-authenticated changes.",
  );
});

test("cookie-authenticated mutations accept the configured client origin", async (t) => {
  const passwordHash = await bcrypt.hash("secret123", 1);
  const { server, request } = await startTestApp({
    users: [
      {
        id: "user-csrf-pass",
        name: "Csrf Pass User",
        email: "csrf-pass@example.com",
        passwordHash,
        createdAt: "2026-04-10T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  const loginResponse = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "csrf-pass@example.com",
      password: "secret123",
    }),
  });

  const cookieHeader = loginResponse.response.headers.get("set-cookie") || "";
  const { response, data } = await request("/api/transactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader.split(";")[0],
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({
      title: "Allowed request",
      amount: 100,
      transactionDate: "2026-04-12",
      type: "expense",
      category: "Food",
      notes: "",
    }),
  });

  assert.equal(response.status, 201);
  assert.equal(data.transaction.title, "Allowed request");
});

test("bearer-authenticated mutations do not require an origin header", async (t) => {
  const user = {
    id: "user-bearer",
    name: "Bearer User",
    email: "bearer@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
  };
  const token = createToken(user);
  const { server, request } = await startTestApp({
    users: [user],
  });
  t.after(() => closeServer(server));

  const { response, data } = await request("/api/transactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: "Bearer request",
      amount: 100,
      transactionDate: "2026-04-12",
      type: "expense",
      category: "Food",
      notes: "",
    }),
  });

  assert.equal(response.status, 201);
  assert.equal(data.transaction.title, "Bearer request");
});

test("settings returns joined account stats for the authenticated user", async (t) => {
  const user = {
    id: "user-1",
    name: "Settings User",
    email: "settings@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
    preferences: {
      preferredTheme: "light",
      defaultBudget: 900,
      currency: "PHP",
    },
  };
  const token = createToken(user);
  const { server, request } = await startTestApp({
    users: [user],
    transactions: [
      {
        id: "txn-1",
        userId: "user-1",
        title: "Allowance",
        amount: 500,
        type: "income",
        category: "Allowance",
        notes: "",
        transactionDate: "2026-04-02",
        createdAt: "2026-04-02T00:00:00.000Z",
        updatedAt: "2026-04-02T00:00:00.000Z",
      },
    ],
    budgets: [
      {
        id: "budget-1",
        userId: "user-1",
        month: "2026-04",
        amount: 900,
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
    ],
    recurringTemplates: [
      {
        id: "rec-1",
        userId: "user-1",
        title: "Internet",
        amount: 499,
        type: "expense",
        category: "Bills",
        notes: "",
        startDate: "2026-03-15",
        repeat: "monthly",
        createdAt: "2026-03-15T00:00:00.000Z",
        updatedAt: "2026-03-15T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  const { response, data } = await request("/api/settings", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  assert.equal(response.status, 200);
  assert.equal(data.user.email, "settings@example.com");
  assert.deepEqual(data.stats, {
    transactionCount: 1,
    budgetCount: 1,
    recurringCount: 1,
  });
});

test("cors accepts the 127.0.0.1 alias for the configured client origin", async (t) => {
  const { server, request } = await startTestApp();
  t.after(() => closeServer(server));

  const { response } = await request("/api/auth/login", {
    method: "OPTIONS",
    headers: {
      Origin: "http://127.0.0.1:5173",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "Content-Type",
    },
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "http://127.0.0.1:5173");
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
});

test("cors accepts other localhost dev ports in development", async (t) => {
  const { server, request } = await startTestApp();
  t.after(() => closeServer(server));

  const { response } = await request("/api/auth/login", {
    method: "OPTIONS",
    headers: {
      Origin: "http://localhost:5174",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "Content-Type",
    },
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5174");
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
});

test("dashboard summary leaves budget unset when no monthly budget exists", async (t) => {
  const user = {
    id: "user-1",
    name: "Summary User",
    email: "summary@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
    preferences: {
      preferredTheme: "dark",
      defaultBudget: 1200,
      currency: "PHP",
    },
  };
  const token = createToken(user);
  const { server, request } = await startTestApp({
    users: [user],
    transactions: [
      {
        id: "txn-1",
        userId: "user-1",
        title: "Allowance",
        amount: 1500,
        type: "income",
        category: "Allowance",
        notes: "",
        transactionDate: "2026-04-02",
        createdAt: "2026-04-02T00:00:00.000Z",
        updatedAt: "2026-04-02T00:00:00.000Z",
      },
    ],
    recurringTemplates: [
      {
        id: "rec-1",
        userId: "user-1",
        title: "Internet",
        amount: 499,
        type: "expense",
        category: "Bills",
        notes: "",
        startDate: "2026-03-15",
        repeat: "monthly",
        createdAt: "2026-03-15T00:00:00.000Z",
        updatedAt: "2026-03-15T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  const { response, data } = await request("/api/dashboard?month=2026-04", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  assert.equal(response.status, 200);
  assert.equal(data.summary.totalIncome, 1500);
  assert.equal(data.summary.totalExpenses, 499);
  assert.equal(data.summary.budget, null);
  assert.equal(data.summary.budgetSource, "unset");
  assert.equal(data.summary.transactionCount, 2);
  assert.equal(data.summary.statusType, "unset");
  assert.equal(data.summary.statusAmount, null);
});

test("dashboard summary reports remaining budget when expenses stay below budget", async (t) => {
  const user = {
    id: "user-remaining",
    name: "Remaining User",
    email: "remaining@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
    preferences: {
      preferredTheme: "light",
      defaultBudget: null,
      currency: "PHP",
    },
  };
  const token = createToken(user);
  const { server, request } = await startTestApp({
    users: [user],
    transactions: [
      {
        id: "txn-income",
        userId: "user-remaining",
        title: "Allowance",
        amount: 1500,
        type: "income",
        category: "Allowance",
        notes: "",
        transactionDate: "2026-04-01",
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
      {
        id: "txn-remaining",
        userId: "user-remaining",
        title: "Groceries",
        amount: 2000,
        type: "expense",
        category: "Food",
        notes: "",
        transactionDate: "2026-04-05",
        createdAt: "2026-04-05T00:00:00.000Z",
        updatedAt: "2026-04-05T00:00:00.000Z",
      },
    ],
    budgets: [
      {
        id: "budget-remaining",
        userId: "user-remaining",
        month: "2026-04",
        amount: 5000,
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  const { response, data } = await request("/api/dashboard?month=2026-04", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  assert.equal(response.status, 200);
  assert.equal(data.summary.totalIncome, 1500);
  assert.equal(data.summary.totalExpenses, 2000);
  assert.equal(data.summary.budget, 5000);
  assert.equal(data.summary.budgetSource, "month");
  assert.equal(data.summary.availableFunds, 6500);
  assert.equal(data.summary.statusType, "remaining");
  assert.equal(data.summary.statusAmount, 4500);
  assert.equal(data.summary.budgetRemaining, 4500);
});

test("dashboard summary reports exact match when expenses equal budget", async (t) => {
  const user = {
    id: "user-exact",
    name: "Exact User",
    email: "exact@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
    preferences: {
      preferredTheme: "light",
      defaultBudget: null,
      currency: "PHP",
    },
  };
  const token = createToken(user);
  const { server, request } = await startTestApp({
    users: [user],
    transactions: [
      {
        id: "txn-exact",
        userId: "user-exact",
        title: "School supplies",
        amount: 5000,
        type: "expense",
        category: "School",
        notes: "",
        transactionDate: "2026-04-08",
        createdAt: "2026-04-08T00:00:00.000Z",
        updatedAt: "2026-04-08T00:00:00.000Z",
      },
    ],
    budgets: [
      {
        id: "budget-exact",
        userId: "user-exact",
        month: "2026-04",
        amount: 5000,
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  const { response, data } = await request("/api/dashboard?month=2026-04", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  assert.equal(response.status, 200);
  assert.equal(data.summary.totalExpenses, 5000);
  assert.equal(data.summary.statusType, "exact");
  assert.equal(data.summary.statusAmount, 0);
});

test("dashboard summary reports deficit when expenses exceed budget", async (t) => {
  const user = {
    id: "user-deficit",
    name: "Deficit User",
    email: "deficit@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
    preferences: {
      preferredTheme: "dark",
      defaultBudget: null,
      currency: "PHP",
    },
  };
  const token = createToken(user);
  const { server, request } = await startTestApp({
    users: [user],
    transactions: [
      {
        id: "txn-deficit",
        userId: "user-deficit",
        title: "Project materials",
        amount: 6200,
        type: "expense",
        category: "School",
        notes: "",
        transactionDate: "2026-04-12",
        createdAt: "2026-04-12T00:00:00.000Z",
        updatedAt: "2026-04-12T00:00:00.000Z",
      },
    ],
    budgets: [
      {
        id: "budget-deficit",
        userId: "user-deficit",
        month: "2026-04",
        amount: 5000,
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  const { response, data } = await request("/api/dashboard?month=2026-04", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  assert.equal(response.status, 200);
  assert.equal(data.summary.totalExpenses, 6200);
  assert.equal(data.summary.statusType, "deficit");
  assert.equal(data.summary.statusAmount, -1200);
});

test("budget top-ups add to the current month budget", async (t) => {
  const user = {
    id: "user-top-up",
    name: "Top Up User",
    email: "topup@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
    preferences: {
      preferredTheme: "light",
      defaultBudget: null,
      currency: "PHP",
    },
  };
  const token = createToken(user);
  const { server, request } = await startTestApp({
    users: [user],
    transactions: [
      {
        id: "txn-top-up",
        userId: "user-top-up",
        title: "Lunch",
        amount: 2000,
        type: "expense",
        category: "Food",
        notes: "",
        transactionDate: "2026-04-06",
        createdAt: "2026-04-06T00:00:00.000Z",
        updatedAt: "2026-04-06T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  const setResponse = await request("/api/budgets/2026-04", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount: 5000,
      mode: "set",
    }),
  });

  const topUpResponse = await request("/api/budgets/2026-04", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount: 1000,
      mode: "add",
    }),
  });

  const dashboardResponse = await request("/api/dashboard?month=2026-04", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  assert.equal(setResponse.response.status, 200);
  assert.equal(topUpResponse.response.status, 200);
  assert.equal(dashboardResponse.response.status, 200);
  assert.equal(dashboardResponse.data.summary.budget, 6000);
  assert.equal(dashboardResponse.data.summary.totalExpenses, 2000);
  assert.equal(dashboardResponse.data.summary.statusType, "remaining");
  assert.equal(dashboardResponse.data.summary.statusAmount, 4000);
});

test("budget edit replaces an existing monthly budget", async (t) => {
  const user = {
    id: "user-budget-edit",
    name: "Budget Edit User",
    email: "budget-edit@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
    preferences: {
      preferredTheme: "light",
      defaultBudget: null,
      currency: "PHP",
    },
  };
  const token = createToken(user);
  const { server, request } = await startTestApp({
    users: [user],
    budgets: [
      {
        id: "budget-edit",
        userId: "user-budget-edit",
        month: "2026-04",
        amount: 5000,
        createdAt: "2026-04-10T00:00:00.000Z",
        updatedAt: "2026-04-10T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  const response = await request("/api/budgets/2026-04", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount: 200,
      mode: "edit",
    }),
  });

  const dashboardResponse = await request("/api/dashboard?month=2026-04", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  assert.equal(response.response.status, 200);
  assert.equal(dashboardResponse.response.status, 200);
  assert.equal(dashboardResponse.data.summary.budget, 200);
  assert.equal(dashboardResponse.data.summary.budgetSource, "month");
  assert.equal(dashboardResponse.data.summary.statusType, "remaining");
  assert.equal(dashboardResponse.data.summary.statusAmount, 200);
});

test("budget set rejects overwriting an existing monthly budget", async (t) => {
  const user = {
    id: "user-budget-lock",
    name: "Budget Lock User",
    email: "budget-lock@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
    preferences: {
      preferredTheme: "light",
      defaultBudget: null,
      currency: "PHP",
    },
  };
  const token = createToken(user);
  const { server, request } = await startTestApp({
    users: [user],
    budgets: [
      {
        id: "budget-lock",
        userId: "user-budget-lock",
        month: "2026-04",
        amount: 5000,
        createdAt: "2026-04-10T00:00:00.000Z",
        updatedAt: "2026-04-10T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  const response = await request("/api/budgets/2026-04", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount: 6000,
      mode: "set",
    }),
  });

  assert.equal(response.response.status, 409);
  assert.equal(
    response.data.message,
    "This month's budget is already set. Use Edit budget to change it or Add to budget to increase it.",
  );
});

test("settings preference updates do not change saved monthly budgets", async (t) => {
  const user = {
    id: "user-default-fallback",
    name: "Fallback User",
    email: "fallback@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
    preferences: {
      preferredTheme: "light",
      defaultBudget: 1200,
      currency: "PHP",
    },
  };
  const token = createToken(user);
  const { server, request } = await startTestApp({
    users: [user],
    budgets: [
      {
        id: "budget-fallback",
        userId: "user-default-fallback",
        month: "2026-04",
        amount: 5000,
        createdAt: "2026-04-10T00:00:00.000Z",
        updatedAt: "2026-04-10T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  const aprilBeforeResponse = await request("/api/dashboard?month=2026-04", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const preferenceResponse = await request("/api/settings/preferences", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      defaultBudget: 700,
    }),
  });

  const aprilAfterResponse = await request("/api/dashboard?month=2026-04", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const mayResponse = await request("/api/dashboard?month=2026-05", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const mayEditResponse = await request("/api/budgets/2026-05", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount: 650,
      mode: "edit",
    }),
  });

  const mayEditedResponse = await request("/api/dashboard?month=2026-05", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  assert.equal(aprilBeforeResponse.response.status, 200);
  assert.equal(aprilBeforeResponse.data.summary.budget, 5000);
  assert.equal(aprilBeforeResponse.data.summary.budgetSource, "month");
  assert.equal(preferenceResponse.response.status, 200);
  assert.equal(aprilAfterResponse.response.status, 200);
  assert.equal(aprilAfterResponse.data.summary.budget, 5000);
  assert.equal(aprilAfterResponse.data.summary.budgetSource, "month");
  assert.equal(mayResponse.response.status, 200);
  assert.equal(mayResponse.data.summary.budget, null);
  assert.equal(mayResponse.data.summary.budgetSource, "unset");
  assert.equal(mayEditResponse.response.status, 200);
  assert.equal(mayEditedResponse.response.status, 200);
  assert.equal(mayEditedResponse.data.summary.budget, 650);
  assert.equal(mayEditedResponse.data.summary.budgetSource, "month");
});

test("transactions support category and type filters", async (t) => {
  const user = {
    id: "user-1",
    name: "Transaction User",
    email: "tx@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
    preferences: {
      preferredTheme: "light",
      defaultBudget: null,
      currency: "PHP",
    },
  };
  const token = createToken(user);
  const { server, request } = await startTestApp({
    users: [user],
  });
  t.after(() => closeServer(server));

  const createResponse = await request("/api/transactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: "Freelance",
      amount: 2500,
      type: "income",
      category: "Savings",
      notes: "Side project",
      transactionDate: "2026-04-12",
    }),
  });

  assert.equal(createResponse.response.status, 201);
  assert.equal(createResponse.data.transaction.type, "income");
  assert.equal(createResponse.data.transaction.category, "Savings");

  const filtered = await request(
    "/api/transactions?month=2026-04&type=income&category=Savings&query=project",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  assert.equal(filtered.response.status, 200);
  assert.equal(filtered.data.transactions.length, 1);
  assert.equal(filtered.data.transactions[0].title, "Freelance");
});

test("transactions support date range filtering and amount sorting", async (t) => {
  const user = {
    id: "user-range",
    name: "Range User",
    email: "range@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
    preferences: {
      preferredTheme: "light",
      defaultBudget: null,
      currency: "PHP",
    },
  };
  const token = createToken(user);
  const { server, request } = await startTestApp({
    users: [user],
    transactions: [
      {
        id: "txn-a",
        userId: "user-range",
        title: "Too early",
        amount: 300,
        type: "expense",
        category: "Food",
        notes: "",
        transactionDate: "2026-04-05",
        createdAt: "2026-04-05T00:00:00.000Z",
        updatedAt: "2026-04-05T00:00:00.000Z",
      },
      {
        id: "txn-b",
        userId: "user-range",
        title: "Middle",
        amount: 100,
        type: "expense",
        category: "Food",
        notes: "",
        transactionDate: "2026-04-10",
        createdAt: "2026-04-10T00:00:00.000Z",
        updatedAt: "2026-04-10T00:00:00.000Z",
      },
      {
        id: "txn-c",
        userId: "user-range",
        title: "Late",
        amount: 200,
        type: "expense",
        category: "Food",
        notes: "",
        transactionDate: "2026-04-15",
        createdAt: "2026-04-15T00:00:00.000Z",
        updatedAt: "2026-04-15T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  const { response, data } = await request(
    "/api/transactions?month=2026-04&startDate=2026-04-06&endDate=2026-04-15&sortBy=amount&sortOrder=asc",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(
    data.transactions.map((transaction) => transaction.title),
    ["Middle", "Late"],
  );
});

test("settings preferences and password updates work for the authenticated user", async (t) => {
  const user = {
    id: "user-1",
    name: "Settings User",
    email: "settings@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
    preferences: {
      preferredTheme: "light",
      defaultBudget: null,
      currency: "PHP",
    },
  };
  const token = createToken(user);
  const { store, server, request } = await startTestApp({
    users: [user],
  });
  t.after(() => closeServer(server));

  const preferencesResponse = await request("/api/settings/preferences", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      preferredTheme: "dark",
      defaultBudget: 1750,
    }),
  });

  assert.equal(preferencesResponse.response.status, 200);
  let snapshot = await store.getSnapshot();
  assert.equal(snapshot.users[0].preferences.preferredTheme, "dark");
  assert.equal(snapshot.users[0].preferences.defaultBudget, null);

  const passwordResponse = await request("/api/settings/password", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      currentPassword: "secret123",
      newPassword: "newsecret456",
    }),
  });

  assert.equal(passwordResponse.response.status, 200);
  snapshot = await store.getSnapshot();
  assert.equal(await bcrypt.compare("newsecret456", snapshot.users[0].passwordHash), true);
});

test("recurring templates are returned in reports and can be exported", async (t) => {
  const user = {
    id: "user-1",
    name: "Recurring User",
    email: "recurring@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
    preferences: {
      preferredTheme: "light",
      defaultBudget: null,
      currency: "PHP",
    },
  };
  const token = createToken(user);
  const { server, request } = await startTestApp({
    users: [user],
    recurringTemplates: [
      {
        id: "rec-1",
        userId: "user-1",
        title: "Dorm rent",
        amount: 3500,
        type: "expense",
        category: "Bills",
        notes: "",
        startDate: "2026-02-01",
        repeat: "monthly",
        createdAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-01T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  const reportsResponse = await request("/api/reports?month=2026-04&months=4", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const exportResponse = await request("/api/settings/export", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  assert.equal(reportsResponse.response.status, 200);
  assert.equal(reportsResponse.data.highlights.recurringTemplateCount, 1);
  assert.equal(reportsResponse.data.categoryBreakdown[0].category, "Bills");
  assert.equal(exportResponse.response.status, 200);
  assert.equal(exportResponse.data.recurringTemplates.length, 1);
});

test("recurring templates can be deleted without crashing the API", async (t) => {
  const user = {
    id: "user-1",
    name: "Recurring Delete User",
    email: "recurring-delete@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
    preferences: {
      preferredTheme: "light",
      defaultBudget: null,
      currency: "PHP",
    },
  };
  const token = createToken(user);
  const { server, request } = await startTestApp({
    users: [user],
    recurringTemplates: [
      {
        id: "rec-1",
        userId: "user-1",
        title: "Gym membership",
        amount: 1200,
        type: "expense",
        category: "Health",
        notes: "",
        startDate: "2026-03-01",
        repeat: "monthly",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-01T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  const deleteResponse = await request("/api/recurring-templates/rec-1", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const listResponse = await request("/api/recurring-templates", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  assert.equal(deleteResponse.response.status, 200);
  assert.equal(deleteResponse.data.success, true);
  assert.equal(listResponse.response.status, 200);
  assert.equal(listResponse.data.templates.length, 0);
});
