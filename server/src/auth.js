import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { getRequestOrigin, isAllowedOrigin } from "./utils/helpers.js";

export const AUTH_COOKIE_NAME = "pesotrace-session";
export const CSRF_COOKIE_NAME = "pesotrace-csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";
const AUTH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const AUTH_RENEWAL_THRESHOLD_SECONDS = 24 * 60 * 60;
const revokedTokenIds = new Map();

export function ensureJwtSecret(env = process.env) {
  const secret = String(env.JWT_SECRET || "").trim();

  if (!secret) {
    throw new Error("JWT_SECRET is required. Set it in server/.env or the environment.");
  }

  if (secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters.");
  }

  return secret;
}

function getJwtSecret() {
  return ensureJwtSecret(process.env);
}

function createCsrfToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function createTokenId() {
  return crypto.randomUUID();
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

function getCsrfTokenFromCookie(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  return cookies[CSRF_COOKIE_NAME] || "";
}

function getTokenFromAuthorizationHeader(req) {
  const authHeader = req.headers.authorization || "";
  const [, token = ""] = authHeader.split(" ");
  return token;
}

function cleanupRevokedTokenIds(now = Date.now()) {
  for (const [tokenId, expiresAt] of revokedTokenIds) {
    if (expiresAt <= now) {
      revokedTokenIds.delete(tokenId);
    }
  }
}

function isTokenRevoked(payload) {
  cleanupRevokedTokenIds();
  return Boolean(payload?.jti && revokedTokenIds.has(payload.jti));
}

function hasValidCsrfToken(req) {
  const headerToken = String(req.headers[CSRF_HEADER_NAME] || "").trim();
  const cookieToken = getCsrfTokenFromCookie(req);

  const headerBuffer = Buffer.from(headerToken);
  const cookieBuffer = Buffer.from(cookieToken);

  if (!headerToken || !cookieToken || headerBuffer.length !== cookieBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(headerBuffer, cookieBuffer);
}

function shouldRenewAuthCookie(payload) {
  const expiresAt = Number(payload?.exp || 0);

  if (!expiresAt) {
    return false;
  }

  return expiresAt - Math.floor(Date.now() / 1000) <= AUTH_RENEWAL_THRESHOLD_SECONDS;
}

export function createToken(user, options = {}) {
  return jwt.sign(
    {
      userId: user.id || user.userId,
      email: user.email,
      jti: createTokenId(),
    },
    getJwtSecret(),
    {
      expiresIn: options.expiresIn || "7d",
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

export function setCsrfCookie(req, res, token = createCsrfToken()) {
  res.cookie(CSRF_COOKIE_NAME, token, getAuthCookieOptions(req));
  return token;
}

export function clearAuthCookie(req, res) {
  const { maxAge, ...options } = getAuthCookieOptions(req);
  res.clearCookie(AUTH_COOKIE_NAME, options);
  res.clearCookie(CSRF_COOKIE_NAME, options);
}

export function revokeAuthToken(payload = {}) {
  const tokenId = String(payload.jti || "").trim();
  const expiresAt = Number(payload.exp || 0) * 1000;

  if (!tokenId || !expiresAt) {
    return;
  }

  cleanupRevokedTokenIds();
  revokedTokenIds.set(tokenId, expiresAt);
}

function authenticateRequest(req, res, next, options = {}) {
  const required = options.required !== false;
  const headerToken = getTokenFromAuthorizationHeader(req);
  const cookieToken = getTokenFromCookie(req);
  const token = headerToken || cookieToken;

  if (!token) {
    if (!required) {
      req.auth = null;
      req.authSource = "";
      req.authToken = "";
      req.csrfToken = "";
      return next();
    }

    return res.status(401).json({ message: "Authentication is required." });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());

    if (!payload.jti || isTokenRevoked(payload)) {
      if (!required) {
        if (cookieToken) {
          clearAuthCookie(req, res);
        }

        req.auth = null;
        req.authSource = "";
        req.authToken = "";
        req.csrfToken = "";
        return next();
      }

      return res.status(401).json({ message: "Your session is invalid or expired." });
    }

    req.auth = payload;
    req.authSource = headerToken ? "bearer" : "cookie";
    req.authToken = token;

    if (req.authSource === "cookie") {
      req.csrfToken = getCsrfTokenFromCookie(req) || setCsrfCookie(req, res);

      if (shouldRenewAuthCookie(payload)) {
        setAuthCookie(req, res, createToken(payload));
      }
    }

    return next();
  } catch {
    if (!required) {
      if (cookieToken) {
        clearAuthCookie(req, res);
      }

      req.auth = null;
      req.authSource = "";
      req.authToken = "";
      req.csrfToken = "";
      return next();
    }

    return res.status(401).json({ message: "Your session is invalid or expired." });
  }
}

export function optionalAuth(req, res, next) {
  return authenticateRequest(req, res, next, { required: false });
}

export function requireAuth(req, res, next) {
  return authenticateRequest(req, res, next);
}

export function requireTrustedRequestOrigin(clientOrigin = "http://localhost:5173") {
  return (req, res, next) => {
    const method = String(req.method || "GET").toUpperCase();

    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      return next();
    }

    const requestOrigin = getRequestOrigin(req.headers);

    if (!requestOrigin || isAllowedOrigin(requestOrigin, clientOrigin)) {
      return next();
    }

    return res.status(403).json({
      message: "This request origin is not allowed for session-authenticated changes.",
    });
  };
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
      if (hasValidCsrfToken(req)) {
        return next();
      }

      return res.status(403).json({
        message: "A valid CSRF token is required for session-authenticated changes.",
      });
    }

    return res.status(403).json({
      message: "This request origin is not allowed for session-authenticated changes.",
    });
  };
}
