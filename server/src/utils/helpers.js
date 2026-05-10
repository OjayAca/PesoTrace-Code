import { toAmount, normalizeDate, normalizeTransactionType, normalizeCategory } from "../finance.js";

const TITLE_MAX_LENGTH = 120;
const NOTES_MAX_LENGTH = 2000;
export const LOCAL_CLIENT_ORIGIN = "http://localhost:5173";
export const PRODUCTION_CLIENT_ORIGIN = "https://pesotrace.vercel.app";

export function getDefaultClientOrigin(env = process.env) {
  const configured = String(env.CLIENT_ORIGIN || "").trim();
  const origins = configured
    ? configured.split(",").map((value) => value.trim()).filter(Boolean)
    : [];

  if (!configured && env.NODE_ENV !== "production") {
    origins.push(LOCAL_CLIENT_ORIGIN);
  }

  origins.push(PRODUCTION_CLIENT_ORIGIN);

  return [...new Set(origins)].join(",");
}

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
    // defaultBudget is intentionally ignored: budgets are month-scoped records, not account preferences.
    currency: "PHP",
  };
}

function assertTextLength(value, fieldName, maxLength) {
  if (value.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or fewer.`);
  }
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

  assertTextLength(title, "Transaction title", TITLE_MAX_LENGTH);
  assertTextLength(notes, "Transaction notes", NOTES_MAX_LENGTH);

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
  const endDate = body.endDate ? normalizeDate(body.endDate) : null;
  const type = normalizeTransactionType(body.type || "expense");
  const category = normalizeCategory(body.category);

  if (!title) {
    throw new Error("Recurring title is required.");
  }

  if (endDate && endDate < startDate) {
    throw new Error("Recurring end date must be on or after the start date.");
  }

  assertTextLength(title, "Recurring title", TITLE_MAX_LENGTH);
  assertTextLength(notes, "Recurring notes", NOTES_MAX_LENGTH);

  return {
    title,
    notes,
    amount,
    startDate,
    endDate,
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

function normalizeOrigin(origin) {
  const value = String(origin || "").trim();

  if (!value) {
    return "";
  }

  try {
    return new URL(value).origin;
  } catch {
    return value.replace(/\/+$/, "");
  }
}

export function isAllowedOrigin(origin, clientOrigin = getDefaultClientOrigin()) {
  const requestOrigin = normalizeOrigin(origin);
  const allowedOrigins = new Set(
    String(clientOrigin || "")
      .split(",")
      .map(normalizeOrigin)
      .filter(Boolean),
  );

  if (allowedOrigins.has(requestOrigin)) {
    return true;
  }

  if (process.env.NODE_ENV !== "production" && isLocalDevOrigin(requestOrigin)) {
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

      if (requestOrigin === alternateOrigin) {
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
