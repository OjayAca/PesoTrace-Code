import { toAmount, normalizeDate, normalizeTransactionType, normalizeCategory } from "../finance.js";

export function getUserPreferences(user = {}) {
  return {
    preferredTheme: user?.preferences?.preferredTheme || "light",
    currency: user?.preferences?.currency || "PHP",
  };
}

export function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    preferences: getUserPreferences(user),
  };
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isDuplicateEntryError(error) {
  return error?.code === "ER_DUP_ENTRY";
}

export function buildUserPreferences(user, payload = {}) {
  const current = getUserPreferences(user);
  const nextTheme =
    payload.preferredTheme === undefined
      ? current.preferredTheme
      : String(payload.preferredTheme || "").trim().toLowerCase();

  if (!["light", "dark"].includes(nextTheme)) {
    throw new Error("Preferred theme must be light or dark.");
  }

  return {
    preferredTheme: nextTheme,
    currency: "PHP",
  };
}

export function getTransactionPayload(body) {
  const title = String(body.title || "").trim();
  const notes = String(body.notes || "").trim();
  const amount = toAmount(body.amount, "Amount");
  const transactionDate = normalizeDate(body.transactionDate);
  const type = normalizeTransactionType(body.type || "expense");
  const category = normalizeCategory(body.category);

  if (!title) {
    throw new Error("Transaction title is required.");
  }

  return {
    title,
    notes,
    amount,
    transactionDate,
    type,
    category,
  };
}

export function getRecurringTemplatePayload(body) {
  const title = String(body.title || "").trim();
  const notes = String(body.notes || "").trim();
  const amount = toAmount(body.amount, "Amount");
  const startDate = normalizeDate(body.startDate);
  const type = normalizeTransactionType(body.type || "expense");
  const category = normalizeCategory(body.category);

  if (!title) {
    throw new Error("Recurring title is required.");
  }

  return {
    title,
    notes,
    amount,
    startDate,
    type,
    category,
    repeat: "monthly",
  };
}

export function isLocalDevOrigin(origin) {
  if (!origin) {
    return false;
  }

  try {
    const url = new URL(origin);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function isAllowedOrigin(origin, clientOrigin = "http://localhost:5173") {
  const allowedOrigins = new Set(
    clientOrigin
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );

  if (allowedOrigins.has(origin)) {
    return true;
  }

  if (process.env.NODE_ENV !== "production" && isLocalDevOrigin(origin)) {
    return true;
  }

  for (const rawOrigin of allowedOrigins) {
    try {
      const url = new URL(rawOrigin);

      if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
        continue;
      }

      const alternateHost = url.hostname === "localhost" ? "127.0.0.1" : "localhost";
      const alternateOrigin = `${url.protocol}//${alternateHost}${url.port ? `:${url.port}` : ""}`;

      if (origin === alternateOrigin) {
        return true;
      }
    } catch {
      // Ignore
    }
  }

  return false;
}

export function getRequestOrigin(headers = {}) {
  const origin = String(headers.origin || "").trim();

  if (origin) {
    return origin;
  }

  const referer = String(headers.referer || headers.referrer || "").trim();

  if (!referer) {
    return "";
  }

  try {
    return new URL(referer).origin;
  } catch {
    return "";
  }
}
