import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { clearAuthCookie, createToken, setAuthCookie } from "../auth.js";
import { isValidEmail, sanitizeUser, isDuplicateEntryError } from "../utils/helpers.js";

export function register(store) {
  return async (req, res) => {
    try {
      const name = String(req.body.name || "").trim();
      const email = String(req.body.email || "").trim().toLowerCase();
      const password = String(req.body.password || "");

      if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email, and password are required." });
      }

      if (!isValidEmail(email)) {
        return res.status(400).json({ message: "Email must be a valid email address." });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters." });
      }

      const existingUser = await store.getUserByEmail(email);

      if (existingUser) {
        return res.status(409).json({ message: "That email is already registered." });
      }

      const now = new Date().toISOString();
      const user = await store.createUser({
        id: crypto.randomUUID(),
        name,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        createdAt: now,
        preferences: {
          preferredTheme: "light",
          defaultBudget: null,
          currency: "PHP",
        },
      });

      const publicUser = sanitizeUser(user);
      setAuthCookie(req, res, createToken(publicUser));
      return res.status(201).json({
        user: publicUser,
      });
    } catch (error) {
      if (isDuplicateEntryError(error)) {
        return res.status(409).json({ message: "That email is already registered." });
      }

      return res.status(500).json({ message: "Failed to register account." });
    }
  };
}

export function login(store) {
  return async (req, res) => {
    try {
      const email = String(req.body.email || "").trim().toLowerCase();
      const password = String(req.body.password || "");

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
      }

      const user = await store.getUserByEmail(email);

      if (!user) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);

      if (!isMatch) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      const publicUser = sanitizeUser(user);
      setAuthCookie(req, res, createToken(publicUser));
      return res.json({
        user: publicUser,
      });
    } catch {
      return res.status(500).json({ message: "Failed to log in." });
    }
  };
}

export function me(store) {
  return async (req, res) => {
    const user = await store.getUserById(req.auth.userId);

    if (!user) {
      return res.status(404).json({ message: "User account no longer exists." });
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
