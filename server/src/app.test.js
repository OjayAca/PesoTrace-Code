import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import { createToken } from "./auth.js";
import { createApp } from "./app.js";

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
  const store = {
    data: {
      users: seedData.users ? [...seedData.users] : [],
      transactions: seedData.transactions ? [...seedData.transactions] : [],
      budgets: seedData.budgets ? [...seedData.budgets] : [],
      recurringTemplates: seedData.recurringTemplates ? [...seedData.recurringTemplates] : [],
    },
  };

  const app = createApp({
    store,
    persistStore: async () => {},
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

test("register creates a user, returns a token, and omits passwordHash", async (t) => {
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
  assert.equal(store.data.users.length, 1);
  assert.equal(store.data.users[0].email, "tester@example.com");
  assert.ok(store.data.users[0].passwordHash);
  assert.equal(data.user.email, "tester@example.com");
  assert.equal("passwordHash" in data.user, false);
  assert.ok(data.token);
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

test("login returns user and token for valid credentials", async (t) => {
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
  assert.ok(data.token);
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

test("dashboard summary includes income, default budget, and recurring entries", async (t) => {
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
  assert.equal(data.summary.budget, 1200);
  assert.equal(data.summary.budgetSource, "default");
  assert.equal(data.summary.transactionCount, 2);
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
  assert.equal(store.data.users[0].preferences.preferredTheme, "dark");
  assert.equal(store.data.users[0].preferences.defaultBudget, 1750);

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
  assert.equal(await bcrypt.compare("newsecret456", store.data.users[0].passwordHash), true);
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
