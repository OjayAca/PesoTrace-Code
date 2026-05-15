import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import {
  clearAuthCookie,
  createToken,
  revokeAuthToken,
  setAuthCookie,
  setCsrfCookie,
} from "../auth.js";
import { ClientError } from "../utils/errors.js";
import { getBcryptRounds } from "../utils/bcryptConfig.js";
import { isValidEmail, sanitizeUser, isDuplicateEntryError } from "../utils/helpers.js";

const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const MAX_CONSECUTIVE_PASSWORD_FAILURES = 5;
const PASSWORD_LOCK_MS = 15 * 60 * 1000;
const PASSWORD_RESET_REQUEST_MESSAGE =
  "If that email is registered, a password reset link will be sent.";

function createSecretToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashSecretToken(token) {
  return crypto.createHash("sha256").update(String(token || ""), "utf8").digest("hex");
}

function addMs(date, milliseconds) {
  return new Date(date.getTime() + milliseconds).toISOString();
}

function isFuture(value, now = new Date()) {
  return value ? new Date(value).getTime() > now.getTime() : false;
}

function assertTokenIsUsable(user, expiresAt, message) {
  if (!user || !isFuture(expiresAt)) {
    throw new ClientError(message, 400);
  }
}

function assertLoginAllowed(user, now = new Date()) {
  if (isFuture(user.loginLockedUntil, now)) {
    throw new ClientError("Too many failed sign-in attempts. Please try again later.", 429);
  }
}

function assertPasswordChangeAllowed(user, now = new Date()) {
  if (isFuture(user.passwordLockedUntil, now)) {
    throw new ClientError("Too many failed password attempts. Please try again later.", 429);
  }
}

export function register(store) {
  return async (req, res) => {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      throw new ClientError("Name, email, and password are required.");
    }

    if (!isValidEmail(email)) {
      throw new ClientError("Email must be a valid email address.");
    }

    if (password.length < 6) {
      throw new ClientError("Password must be at least 6 characters.");
    }

    const existingUser = await store.getUserByEmail(email);

    if (existingUser) {
      throw new ClientError("That email is already registered.", 409);
    }

    const now = new Date().toISOString();
    let user;

    try {
      user = await store.createUser({
        id: crypto.randomUUID(),
        name,
        email,
        passwordHash: await bcrypt.hash(password, getBcryptRounds()),
        createdAt: now,
        preferences: {
          preferredTheme: "light",
          defaultBudget: null,
          currency: "PHP",
        },
      });
    } catch (error) {
      if (isDuplicateEntryError(error)) {
        throw new ClientError("That email is already registered.", 409);
      }

      throw error;
    }

    const publicUser = sanitizeUser(user);
    setAuthCookie(req, res, createToken(publicUser));
    const csrfToken = setCsrfCookie(req, res);
    return res.status(201).json({
      user: publicUser,
      csrfToken,
    });
  };
}

export function login(store) {
  return async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      throw new ClientError("Email and password are required.");
    }

    const user = await store.getUserByEmail(email);

    if (!user) {
      throw new ClientError("Invalid email or password.", 401);
    }

    assertLoginAllowed(user);

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      const updatedUser = await store.incrementUserLoginFailure(user.id, {
        threshold: MAX_CONSECUTIVE_PASSWORD_FAILURES,
        lockedUntil: addMs(new Date(), PASSWORD_LOCK_MS),
      });

      if (updatedUser && isFuture(updatedUser.loginLockedUntil)) {
        throw new ClientError("Too many failed sign-in attempts. Please try again later.", 429);
      }

      throw new ClientError("Invalid email or password.", 401);
    }

    await store.resetUserLoginFailures(user.id);
    const publicUser = sanitizeUser(user);
    setAuthCookie(req, res, createToken(publicUser));
    const csrfToken = setCsrfCookie(req, res);
    return res.json({
      user: publicUser,
      csrfToken,
    });
  };
}

export function requestPasswordReset(store, emailService) {
  return async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!email || !isValidEmail(email)) {
      throw new ClientError("A valid email is required.");
    }

    const user = await store.getUserByEmail(email);

    if (user && !isFuture(user.passwordResetExpiresAt)) {
      const token = createSecretToken();
      await store.setPasswordResetToken(
        user.id,
        hashSecretToken(token),
        addMs(new Date(), PASSWORD_RESET_TOKEN_TTL_MS),
      );
      await emailService.sendPasswordReset(user, token);
    }

    return res.json({ message: PASSWORD_RESET_REQUEST_MESSAGE });
  };
}

export function confirmPasswordReset(store) {
  return async (req, res) => {
    const token = String(req.body.token || "").trim();
    const password = String(req.body.password || "");

    if (!token || !password) {
      throw new ClientError("Reset token and new password are required.");
    }

    if (password.length < 6) {
      throw new ClientError("New password must be at least 6 characters.");
    }

    const user = await store.getUserByPasswordResetTokenHash(hashSecretToken(token));
    assertTokenIsUsable(user, user?.passwordResetExpiresAt, "Password reset link is invalid or expired.");

    await store.updateUserPassword(user.id, await bcrypt.hash(password, getBcryptRounds()));

    return res.json({ success: true });
  };
}

export function checkPasswordChangeAllowed(user) {
  assertPasswordChangeAllowed(user);
}

export function getPasswordFailureLockout() {
  return {
    threshold: MAX_CONSECUTIVE_PASSWORD_FAILURES,
    lockedUntil: addMs(new Date(), PASSWORD_LOCK_MS),
  };
}

export function me(store) {
  return async (req, res) => {
    if (!req.auth) {
      return res.json({ user: null, csrfToken: "" });
    }

    const user = await store.getUserById(req.auth.userId);

    if (!user) {
      throw new ClientError("User account no longer exists.", 404);
    }

    return res.json({ user: sanitizeUser(user), csrfToken: req.csrfToken || "" });
  };
}

export function logout() {
  return (req, res) => {
    revokeAuthToken(req.auth);
    clearAuthCookie(req, res);
    return res.json({ success: true });
  };
}
