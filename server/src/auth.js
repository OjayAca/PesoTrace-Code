import jwt from "jsonwebtoken";
import { getRequestOrigin, isAllowedOrigin } from "./utils/helpers.js";

export const AUTH_COOKIE_NAME = "pesotrace-session";
const AUTH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function ensureJwtSecret(env = process.env) {
  const secret = String(env.JWT_SECRET || "").trim();

  if (!secret) {
    throw new Error("JWT_SECRET is required. Set it in server/.env or the environment.");
  }

  return secret;
}

function getJwtSecret() {
  return ensureJwtSecret(process.env);
}

function getRequestProtocol(req) {
  const forwardedProtocol = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim()
    .toLowerCase();

  if (forwardedProtocol) {
    return forwardedProtocol;
  }

  if (req.protocol) {
    return req.protocol;
  }

  return req.socket?.encrypted ? "https" : "http";
}

function getRequestHost(req) {
  return String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .trim();
}

function isIpAddress(hostname) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");
}

function isLoopbackHost(hostname) {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "::1" ||
    /^127(?:\.\d{1,3}){3}$/.test(hostname)
  );
}

function getSiteKey(origin) {
  if (!origin) {
    return "";
  }

  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();

    if (isLoopbackHost(hostname) || isIpAddress(hostname)) {
      return `${url.protocol}//${hostname}`;
    }

    const labels = hostname.split(".").filter(Boolean);
    const siteHost = labels.length >= 2 ? labels.slice(-2).join(".") : hostname;
    return `${url.protocol}//${siteHost}`;
  } catch {
    return "";
  }
}

function isCrossSiteRequest(req) {
  const requestOrigin = getRequestOrigin(req.headers);
  const requestHost = getRequestHost(req);

  if (!requestOrigin || !requestHost) {
    return false;
  }

  return getSiteKey(requestOrigin) !== getSiteKey(`${getRequestProtocol(req)}://${requestHost}`);
}

function parseCookies(cookieHeader = "") {
  return cookieHeader.split(";").reduce((cookies, entry) => {
    const [rawName, ...rawValueParts] = entry.split("=");
    const name = String(rawName || "").trim();

    if (!name) {
      return cookies;
    }

    const rawValue = rawValueParts.join("=").trim();

    try {
      cookies[name] = decodeURIComponent(rawValue);
    } catch {
      cookies[name] = rawValue;
    }

    return cookies;
  }, {});
}

function getTokenFromCookie(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  return cookies[AUTH_COOKIE_NAME] || "";
}

function getTokenFromAuthorizationHeader(req) {
  const authHeader = req.headers.authorization || "";
  const [, token = ""] = authHeader.split(" ");
  return token;
}

export function createToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    getJwtSecret(),
    {
      expiresIn: "7d",
    },
  );
}

function getAuthCookieOptions(req) {
  const crossSite = isCrossSiteRequest(req);

  return {
    httpOnly: true,
    sameSite: crossSite ? "none" : "lax",
    secure: crossSite || process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_TOKEN_MAX_AGE_MS,
  };
}

export function setAuthCookie(req, res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions(req));
}

export function clearAuthCookie(req, res) {
  const { maxAge, ...options } = getAuthCookieOptions(req);
  res.clearCookie(AUTH_COOKIE_NAME, options);
}

export function requireAuth(req, res, next) {
  const headerToken = getTokenFromAuthorizationHeader(req);
  const cookieToken = getTokenFromCookie(req);
  const token = headerToken || cookieToken;

  if (!token) {
    return res.status(401).json({ message: "Authentication is required." });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    req.auth = payload;
    req.authSource = headerToken ? "bearer" : "cookie";
    return next();
  } catch {
    return res.status(401).json({ message: "Your session is invalid or expired." });
  }
}

export function requireTrustedOrigin(clientOrigin = "http://localhost:5173") {
  return (req, res, next) => {
    const method = String(req.method || "GET").toUpperCase();

    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      return next();
    }

    if (req.authSource !== "cookie") {
      return next();
    }

    const requestOrigin = getRequestOrigin(req.headers);

    if (requestOrigin && isAllowedOrigin(requestOrigin, clientOrigin)) {
      return next();
    }

    return res.status(403).json({
      message: "This request origin is not allowed for session-authenticated changes.",
    });
  };
}
