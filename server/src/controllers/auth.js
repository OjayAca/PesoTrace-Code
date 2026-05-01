import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { clearAuthCookie, createToken, setAuthCookie } from "../auth.js";
import { ClientError } from "../utils/errors.js";
import { getBcryptRounds } from "../utils/bcryptConfig.js";
import { isValidEmail, sanitizeUser, isDuplicateEntryError } from "../utils/helpers.js";

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
    return res.status(201).json({
      user: publicUser,
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

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      throw new ClientError("Invalid email or password.", 401);
    }

    const publicUser = sanitizeUser(user);
    setAuthCookie(req, res, createToken(publicUser));
    return res.json({
      user: publicUser,
    });
  };
}

export function me(store) {
  return async (req, res) => {
    const user = await store.getUserById(req.auth.userId);

    if (!user) {
      throw new ClientError("User account no longer exists.", 404);
    }

    return res.json({ user: sanitizeUser(user) });
  };
}

export function logout() {
  return (req, res) => {
    clearAuthCookie(req, res);
    return res.json({ success: true });
  };
}
