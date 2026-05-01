/**
 * Error safe to return to the client (user-facing validation, conflict, etc.).
 */
export class ClientError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "ClientError";
    this.statusCode = statusCode;
    this.expose = true;
  }
}

const MYSQL_INTERNAL_PREFIX = /^(ER_|ECONN)/;

export function isLikelyDatabaseLeak(error) {
  const code = String(error?.code || "");
  if (MYSQL_INTERNAL_PREFIX.test(code)) {
    return true;
  }
  const msg = String(error?.message || "");
  return /ECONNREFUSED|ETIMEDOUT|Access denied|Can't connect|socket hang up/i.test(msg);
}

/**
 * Map unknown errors to a safe client message; log full detail server-side.
 */
export function safeErrorResponse(error, req, env = process.env) {
  if (error instanceof ClientError) {
    return { status: error.statusCode, message: error.message };
  }

  if (error?.expose && typeof error.statusCode === "number") {
    return { status: error.statusCode, message: error.message };
  }

  const code = error?.code;
  if (code === "ER_DUP_ENTRY") {
    return { status: 409, message: "That value is already in use." };
  }

  if (code === "BUDGET_EXISTS") {
    return { status: 409, message: error.message || "Budget conflict." };
  }

  if (isLikelyDatabaseLeak(error)) {
    console.error("[api] database error", {
      path: req?.path,
      method: req?.method,
      code: error?.code,
      message: error?.message,
    });
    return { status: 503, message: "Service temporarily unavailable." };
  }

  console.error("[api] unhandled error", {
    path: req?.path,
    method: req?.method,
    message: error?.message,
    stack: error?.stack,
  });

  if (env.NODE_ENV === "production") {
    return { status: 500, message: "Something went wrong." };
  }

  return { status: 500, message: error?.message || "Something went wrong." };
}
