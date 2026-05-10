import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME, createToken } from "./auth.js";
import { createApp } from "./app.js";
import { createMemoryStore } from "./store.js";

const TEST_JWT_SECRET = "test-jwt-secret-with-at-least-32-chars";
const previousJwtSecret = process.env.JWT_SECRET;

test.before(() => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
});

test.after(() => {
  if (previousJwtSecret === undefined) {
    delete process.env.JWT_SECRET;
    return;
  }

  process.env.JWT_SECRET = previousJwtSecret;
});

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

function getCookieValue(setCookieHeader, name) {
  const match = new RegExp(`(?:^|,\\s*)${name}=([^;]*)`).exec(setCookieHeader);
  return match ? match[1] : "";
}

function getSessionCookieHeader(setCookieHeader) {
  return [
    `${AUTH_COOKIE_NAME}=${getCookieValue(setCookieHeader, AUTH_COOKIE_NAME)}`,
    `${CSRF_COOKIE_NAME}=${getCookieValue(setCookieHeader, CSRF_COOKIE_NAME)}`,
  ].join("; ");
}

function getCsrfToken(setCookieHeader) {
  return getCookieValue(setCookieHeader, CSRF_COOKIE_NAME);
}

async function startTestApp(seedData = {}, appOptions = {}) {
  const store = createMemoryStore(seedData);
  const sentEmails = [];
  const emailService = appOptions.emailService || {
    async sendPasswordReset(user, token) {
      sentEmails.push({ type: "password-reset", user, token });
    },
  };

  const app = createApp({
    store,
    clientOrigin: "http://localhost:5173",
    ...appOptions,
    emailService,
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

  return { store, server, request, sentEmails };
}

test("production redirects plain HTTP requests to HTTPS", async (t) => {
  const { server, request } = await startTestApp(
    {},
    {
      env: {
        NODE_ENV: "production",
      },
    },
  );
  t.after(() => closeServer(server));

  const { response } = await request("/api/health", {
    redirect: "manual",
    headers: {
      "X-Forwarded-Host": "api.pesotrace.example",
      "X-Forwarded-Proto": "http",
    },
  });

  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://api.pesotrace.example/api/health");
});

test("production accepts requests already marked HTTPS by the proxy", async (t) => {
  const { server, request } = await startTestApp(
    {},
    {
      env: {
        NODE_ENV: "production",
      },
    },
  );
  t.after(() => closeServer(server));

  const { response, data } = await request("/api/health", {
    headers: {
      "X-Forwarded-Proto": "https",
    },
  });

  assert.equal(response.status, 200);
  assert.equal(data.status, "ok");
});

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

test("register rejects untrusted origins", async (t) => {
  const { server, request } = await startTestApp();
  t.after(() => closeServer(server));

  const { response, data } = await request("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://evil.example",
    },
    body: JSON.stringify({
      name: "Blocked User",
      email: "blocked@example.com",
      password: "secret123",
    }),
  });

  assert.equal(response.status, 403);
  assert.equal(
    data.message,
    "This request origin is not allowed for session-authenticated changes.",
  );
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

test("login rejects untrusted origins", async (t) => {
  const passwordHash = await bcrypt.hash("secret123", 1);
  const { server, request } = await startTestApp({
    users: [
      {
        id: "user-untrusted-login",
        name: "Untrusted Login User",
        email: "untrusted-login@example.com",
        passwordHash,
        createdAt: "2026-04-10T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  const { response, data } = await request("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://evil.example",
    },
    body: JSON.stringify({
      email: "untrusted-login@example.com",
      password: "secret123",
    }),
  });

  assert.equal(response.status, 403);
  assert.equal(
    data.message,
    "This request origin is not allowed for session-authenticated changes.",
  );
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

test("login locks out after consecutive failures for the same user", async (t) => {
  const passwordHash = await bcrypt.hash("secret123", 1);
  const { store, server, request } = await startTestApp({
    users: [
      {
        id: "user-lock-login",
        name: "Lock Login User",
        email: "lock-login@example.com",
        passwordHash,
        createdAt: "2026-04-10T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  for (let index = 0; index < 4; index += 1) {
    const failedLogin = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "lock-login@example.com",
        password: `wrong-${index}`,
      }),
    });

    assert.equal(failedLogin.response.status, 401);
  }

  const lockedLogin = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "lock-login@example.com",
      password: "wrong-final",
    }),
  });

  assert.equal(lockedLogin.response.status, 429);
  assert.equal(lockedLogin.data.message, "Too many failed sign-in attempts. Please try again later.");

  const stillLocked = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "lock-login@example.com",
      password: "secret123",
    }),
  });

  assert.equal(stillLocked.response.status, 429);
  const snapshot = await store.getSnapshot();
  assert.equal(snapshot.users[0].failedLoginAttempts, 5);
  assert.ok(snapshot.users[0].loginLockedUntil);
});

test("password reset sends a reset email and updates the password with a valid token", async (t) => {
  const passwordHash = await bcrypt.hash("secret123", 1);
  const { store, server, request, sentEmails } = await startTestApp({
    users: [
      {
        id: "user-reset",
        name: "Reset User",
        email: "reset@example.com",
        passwordHash,
        createdAt: "2026-04-10T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  const requestResponse = await request("/api/auth/password-reset/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "reset@example.com" }),
  });

  assert.equal(requestResponse.response.status, 200);
  assert.equal(
    requestResponse.data.message,
    "If that email is registered, a password reset link will be sent.",
  );
  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0].type, "password-reset");

  const repeatedRequest = await request("/api/auth/password-reset/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "reset@example.com" }),
  });

  assert.equal(repeatedRequest.response.status, 200);
  assert.equal(sentEmails.length, 1);

  const confirmResponse = await request("/api/auth/password-reset/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: sentEmails[0].token,
      password: "newsecret456",
    }),
  });

  assert.equal(confirmResponse.response.status, 200);
  const snapshot = await store.getSnapshot();
  assert.equal(snapshot.users[0].passwordResetTokenHash, null);
  assert.equal(await bcrypt.compare("newsecret456", snapshot.users[0].passwordHash), true);
});

test("auth endpoints are rate limited", async (t) => {
  const { server, request } = await startTestApp(
    {},
    {
      rateLimits: {
        auth: {
          max: 1,
          windowMs: 60_000,
        },
      },
    },
  );
  t.after(() => closeServer(server));

  await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "", password: "" }),
  });
  const { response, data } = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "", password: "" }),
  });

  assert.equal(response.status, 429);
  assert.equal(data.message, "Too many requests. Please try again later.");
});

test("central error middleware returns safe 503 for database failures", async (t) => {
  const user = {
    id: "user-db-fail",
    name: "Db Fail User",
    email: "db-fail@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
  };
  const token = createToken(user);
  const { store, server, request } = await startTestApp({ users: [user] });
  t.after(() => closeServer(server));

  store.getMonthlySummary = async () => {
    const error = new Error("Can't connect to database with password secret");
    error.code = "ECONNREFUSED";
    throw error;
  };

  const { response, data } = await request("/api/dashboard?month=2026-04", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  assert.equal(response.status, 503);
  assert.equal(data.message, "Service temporarily unavailable.");
});

test("central error middleware hides internal failures in production", async (t) => {
  const user = {
    id: "user-internal-fail",
    name: "Internal Fail User",
    email: "internal-fail@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
  };
  const token = createToken(user);
  const { store, server, request } = await startTestApp(
    { users: [user] },
    {
      env: {
        NODE_ENV: "production",
      },
    },
  );
  t.after(() => closeServer(server));

  store.getMonthlySummary = async () => {
    throw new Error("internal secret details");
  };

  const { response, data } = await request("/api/dashboard?month=2026-04", {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Forwarded-Proto": "https",
    },
  });

  assert.equal(response.status, 500);
  assert.equal(data.message, "Something went wrong.");
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

test("me returns no user without a token", async (t) => {
  const { server, request } = await startTestApp();
  t.after(() => closeServer(server));

  const { response, data } = await request("/api/auth/me");

  assert.equal(response.status, 200);
  assert.deepEqual(data, { user: null, csrfToken: "" });
});

test("me returns no user for invalid tokens", async (t) => {
  const { server, request } = await startTestApp();
  t.after(() => closeServer(server));

  const { response, data } = await request("/api/auth/me", {
    headers: {
      Authorization: "Bearer invalid-token",
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(data, { user: null, csrfToken: "" });
});

test("malformed session cookies return no user and clear session cookies", async (t) => {
  const { server, request } = await startTestApp();
  t.after(() => closeServer(server));

  const { response, data } = await request("/api/auth/me", {
    headers: {
      Cookie: "pesotrace-session=%E0%A4%A",
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(data, { user: null, csrfToken: "" });
  assert.match(response.headers.get("set-cookie") || "", /pesotrace-session=;/);
  assert.match(response.headers.get("set-cookie") || "", /pesotrace-csrf=;/);
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
  assert.ok(data.csrfToken);
});

test("cookie sessions are renewed near expiration", async (t) => {
  const user = {
    id: "user-cookie-renewal",
    name: "Cookie Renewal User",
    email: "cookie-renewal@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
  };
  const expiringToken = createToken(user, { expiresIn: "10m" });
  const { server, request } = await startTestApp({ users: [user] });
  t.after(() => closeServer(server));

  const { response, data } = await request("/api/auth/me", {
    headers: {
      Cookie: `${AUTH_COOKIE_NAME}=${expiringToken}`,
    },
  });
  const setCookieHeader = response.headers.get("set-cookie") || "";

  assert.equal(response.status, 200);
  assert.equal(data.user.email, "cookie-renewal@example.com");
  assert.match(setCookieHeader, /pesotrace-session=/);
  assert.match(setCookieHeader, /pesotrace-csrf=/);
  assert.ok(data.csrfToken);
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
      Cookie: getSessionCookieHeader(cookieHeader),
      Origin: "http://localhost:5173",
      "X-CSRF-Token": getCsrfToken(cookieHeader),
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(data, { success: true });
  assert.match(response.headers.get("set-cookie") || "", /pesotrace-session=;/);
  assert.match(response.headers.get("set-cookie") || "", /pesotrace-csrf=;/);
  assert.match(response.headers.get("set-cookie") || "", /SameSite=None/i);
  assert.match(response.headers.get("set-cookie") || "", /Secure/i);
});

test("logout revokes the current JWT", async (t) => {
  const passwordHash = await bcrypt.hash("secret123", 1);
  const { server, request } = await startTestApp({
    users: [
      {
        id: "user-logout-revoked",
        name: "Logout Revoked User",
        email: "logout-revoked@example.com",
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
      email: "logout-revoked@example.com",
      password: "secret123",
    }),
  });

  const cookieHeader = loginResponse.response.headers.get("set-cookie") || "";
  const sessionCookie = getSessionCookieHeader(cookieHeader);

  await request("/api/auth/logout", {
    method: "POST",
    headers: {
      Cookie: sessionCookie,
      Origin: "http://localhost:5173",
      "X-CSRF-Token": getCsrfToken(cookieHeader),
    },
  });

  const { response, data } = await request("/api/auth/me", {
    headers: {
      Cookie: sessionCookie,
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(data, { user: null, csrfToken: "" });
  assert.match(response.headers.get("set-cookie") || "", /pesotrace-session=;/);
  assert.match(response.headers.get("set-cookie") || "", /pesotrace-csrf=;/);
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
      Cookie: getSessionCookieHeader(cookieHeader),
      Origin: "http://localhost:5173",
      "X-CSRF-Token": getCsrfToken(cookieHeader),
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

test("cookie-authenticated mutations reject missing CSRF tokens", async (t) => {
  const passwordHash = await bcrypt.hash("secret123", 1);
  const { server, request } = await startTestApp({
    users: [
      {
        id: "user-csrf-missing",
        name: "Missing Csrf User",
        email: "csrf-missing@example.com",
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
      email: "csrf-missing@example.com",
      password: "secret123",
    }),
  });

  const cookieHeader = loginResponse.response.headers.get("set-cookie") || "";
  const { response, data } = await request("/api/transactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: getSessionCookieHeader(cookieHeader),
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({
      title: "Missing token",
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
    "A valid CSRF token is required for session-authenticated changes.",
  );
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

test("transactions reject titles and notes that exceed API limits", async (t) => {
  const user = {
    id: "user-transaction-length",
    name: "Transaction Length User",
    email: "tx-length@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
  };
  const token = createToken(user);
  const { server, request } = await startTestApp({ users: [user] });
  t.after(() => closeServer(server));

  const longTitle = await request("/api/transactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: "x".repeat(121),
      amount: 100,
      type: "expense",
      category: "Food",
      notes: "",
      transactionDate: "2026-04-12",
    }),
  });

  assert.equal(longTitle.response.status, 400);
  assert.equal(longTitle.data.message, "Transaction title must be 120 characters or fewer.");

  const longNotes = await request("/api/transactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: "Valid title",
      amount: 100,
      type: "expense",
      category: "Food",
      notes: "x".repeat(2001),
      transactionDate: "2026-04-12",
    }),
  });

  assert.equal(longNotes.response.status, 400);
  assert.equal(longNotes.data.message, "Transaction notes must be 2000 characters or fewer.");
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

test("settings password changes lock out after consecutive current password failures", async (t) => {
  const user = {
    id: "user-password-lock",
    name: "Password Lock User",
    email: "password-lock@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
  };
  const token = createToken(user);
  const { store, server, request } = await startTestApp({
    users: [user],
  });
  t.after(() => closeServer(server));

  for (let index = 0; index < 4; index += 1) {
    const failedPasswordChange = await request("/api/settings/password", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentPassword: `wrong-${index}`,
        newPassword: "newsecret456",
      }),
    });

    assert.equal(failedPasswordChange.response.status, 401);
  }

  const lockedPasswordChange = await request("/api/settings/password", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      currentPassword: "wrong-final",
      newPassword: "newsecret456",
    }),
  });

  assert.equal(lockedPasswordChange.response.status, 429);
  assert.equal(
    lockedPasswordChange.data.message,
    "Too many failed password attempts. Please try again later.",
  );

  const snapshot = await store.getSnapshot();
  assert.equal(snapshot.users[0].failedPasswordAttempts, 5);
  assert.ok(snapshot.users[0].passwordLockedUntil);
});

test("clear data requires the current password", async (t) => {
  const user = {
    id: "user-clear-password",
    name: "Clear Password User",
    email: "clear-password@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
  };
  const token = createToken(user);
  const { server, request } = await startTestApp({ users: [user] });
  t.after(() => closeServer(server));

  const { response, data } = await request("/api/settings/data", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 400);
  assert.equal(data.message, "Current password is required to clear finance data.");
});

test("clear data verifies the current password before deleting finance records", async (t) => {
  const user = {
    id: "user-clear-confirmed",
    name: "Clear Confirmed User",
    email: "clear-confirmed@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
  };
  const token = createToken(user);
  const { store, server, request } = await startTestApp({
    users: [user],
    transactions: [
      {
        id: "txn-clear",
        userId: user.id,
        title: "Delete me",
        amount: 100,
        type: "expense",
        category: "Food",
        notes: "",
        transactionDate: "2026-04-02",
        createdAt: "2026-04-02T00:00:00.000Z",
        updatedAt: "2026-04-02T00:00:00.000Z",
      },
    ],
    budgets: [
      {
        id: "budget-clear",
        userId: user.id,
        month: "2026-04",
        amount: 900,
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  const wrongPassword = await request("/api/settings/data", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword: "wrong-password" }),
  });

  assert.equal(wrongPassword.response.status, 401);
  assert.equal(wrongPassword.data.message, "Current password is incorrect.");

  const confirmed = await request("/api/settings/data", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword: "secret123" }),
  });
  const snapshot = await store.getSnapshot();

  assert.equal(confirmed.response.status, 200);
  assert.equal(confirmed.data.success, true);
  assert.equal(snapshot.transactions.length, 0);
  assert.equal(snapshot.budgets.length, 0);
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

test("recurring templates stop generating after their end date", async (t) => {
  const user = {
    id: "user-recurring-end",
    name: "Recurring End User",
    email: "recurring-end@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
  };
  const token = createToken(user);
  const { server, request } = await startTestApp({
    users: [user],
    recurringTemplates: [
      {
        id: "rec-ended",
        userId: user.id,
        title: "Finished subscription",
        amount: 499,
        type: "expense",
        category: "Bills",
        notes: "",
        startDate: "2026-01-15",
        endDate: "2026-03-31",
        repeat: "monthly",
        createdAt: "2026-01-15T00:00:00.000Z",
        updatedAt: "2026-01-15T00:00:00.000Z",
      },
    ],
  });
  t.after(() => closeServer(server));

  const marchResponse = await request("/api/transactions?month=2026-03", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const aprilResponse = await request("/api/transactions?month=2026-04", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  assert.equal(marchResponse.response.status, 200);
  assert.equal(marchResponse.data.transactions.length, 1);
  assert.equal(marchResponse.data.transactions[0].title, "Finished subscription");
  assert.equal(aprilResponse.response.status, 200);
  assert.equal(aprilResponse.data.transactions.length, 0);
});

test("recurring templates accept and validate optional end dates", async (t) => {
  const user = {
    id: "user-recurring-end-create",
    name: "Recurring End Create User",
    email: "recurring-end-create@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
  };
  const token = createToken(user);
  const { server, request } = await startTestApp({ users: [user] });
  t.after(() => closeServer(server));

  const createResponse = await request("/api/recurring-templates", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: "Term subscription",
      amount: 100,
      type: "expense",
      category: "Bills",
      notes: "",
      startDate: "2026-04-01",
      endDate: "2026-06-30",
    }),
  });
  const invalidResponse = await request("/api/recurring-templates", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: "Invalid subscription",
      amount: 100,
      type: "expense",
      category: "Bills",
      notes: "",
      startDate: "2026-06-30",
      endDate: "2026-04-01",
    }),
  });

  assert.equal(createResponse.response.status, 201);
  assert.equal(createResponse.data.template.endDate, "2026-06-30");
  assert.equal(invalidResponse.response.status, 400);
  assert.equal(
    invalidResponse.data.message,
    "Recurring end date must be on or after the start date.",
  );
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

test("recurring templates reject titles that exceed API limits", async (t) => {
  const user = {
    id: "user-recurring-length",
    name: "Recurring Length User",
    email: "recurring-length@example.com",
    passwordHash: await bcrypt.hash("secret123", 1),
    createdAt: "2026-04-10T00:00:00.000Z",
  };
  const token = createToken(user);
  const { server, request } = await startTestApp({ users: [user] });
  t.after(() => closeServer(server));

  const { response, data } = await request("/api/recurring-templates", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: "x".repeat(121),
      amount: 100,
      type: "expense",
      category: "Bills",
      notes: "",
      startDate: "2026-04-12",
    }),
  });

  assert.equal(response.status, 400);
  assert.equal(data.message, "Recurring title must be 120 characters or fewer.");
});
