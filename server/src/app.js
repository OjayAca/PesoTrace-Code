import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import { createToken, requireAuth } from "./auth.js";
import {
  DEFAULT_CATEGORIES,
  getMonthlySummary,
  getRecurringTemplates,
  getReports,
  getUserTransactions,
  normalizeCategory,
  normalizeDate,
  normalizeMonth,
  normalizeTransactionType,
  toAmount,
} from "./finance.js";

function getUserPreferences(user = {}) {
  return {
    preferredTheme: user?.preferences?.preferredTheme || "light",
    defaultBudget:
      user?.preferences?.defaultBudget === null ||
      user?.preferences?.defaultBudget === undefined ||
      user?.preferences?.defaultBudget === ""
        ? null
        : Number(user.preferences.defaultBudget),
    currency: user?.preferences?.currency || "PHP",
  };
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    preferences: getUserPreferences(user),
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isDuplicateEntryError(error) {
  return error?.code === "ER_DUP_ENTRY";
}

function buildUserPreferences(user, payload = {}) {
  const current = getUserPreferences(user);
  const nextTheme =
    payload.preferredTheme === undefined
      ? current.preferredTheme
      : String(payload.preferredTheme || "").trim().toLowerCase();

  if (!["light", "dark"].includes(nextTheme)) {
    throw new Error("Preferred theme must be light or dark.");
  }

  const nextBudget =
    payload.defaultBudget === undefined
      ? current.defaultBudget
      : toAmount(payload.defaultBudget, "Default budget", {
          allowZero: true,
          allowEmpty: true,
        });

  return {
    preferredTheme: nextTheme,
    defaultBudget: nextBudget,
    currency: "PHP",
  };
}

function getTransactionPayload(body) {
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

function getRecurringTemplatePayload(body) {
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

export function createApp({ store, clientOrigin = "http://localhost:5173" } = {}) {
  if (!store) {
    throw new Error("A store is required.");
  }

  const requiredMethods = [
    "getSnapshot",
    "getUserById",
    "getUserByEmail",
    "createUser",
    "updateUserProfile",
    "updateUserPreferences",
    "updateUserPassword",
    "createTransaction",
    "findTransaction",
    "updateTransaction",
    "deleteTransaction",
    "upsertBudget",
    "getUserStats",
    "clearUserData",
    "createRecurringTemplate",
    "findRecurringTemplate",
    "updateRecurringTemplate",
    "deleteRecurringTemplate",
  ];

  for (const methodName of requiredMethods) {
    if (typeof store[methodName] !== "function") {
      throw new Error(`Store method ${methodName} is required.`);
    }
  }

  const app = express();

  app.use(
    cors({
      origin: clientOrigin.split(",").map((origin) => origin.trim()),
    }),
  );
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/meta", (_req, res) => {
    res.json({
      categories: DEFAULT_CATEGORIES,
      transactionTypes: ["expense", "income"],
    });
  });

  app.post("/api/auth/register", async (req, res) => {
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
      return res.status(201).json({
        user: publicUser,
        token: createToken(publicUser),
      });
    } catch (error) {
      if (isDuplicateEntryError(error)) {
        return res.status(409).json({ message: "That email is already registered." });
      }

      return res.status(500).json({ message: "Failed to register account." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
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
      return res.json({
        user: publicUser,
        token: createToken(publicUser),
      });
    } catch {
      return res.status(500).json({ message: "Failed to log in." });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = await store.getUserById(req.auth.userId);

    if (!user) {
      return res.status(404).json({ message: "User account no longer exists." });
    }

    return res.json({ user: sanitizeUser(user) });
  });

  app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      const month = normalizeMonth(req.query.month);
      const snapshot = await store.getSnapshot();
      const summary = getMonthlySummary(req.auth.userId, month, snapshot);
      return res.json({ summary });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/reports", requireAuth, async (req, res) => {
    try {
      const month = normalizeMonth(req.query.month);
      const months = Number(req.query.months || 6);
      const snapshot = await store.getSnapshot();
      const report = getReports(req.auth.userId, month, snapshot, months);
      return res.json(report);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/transactions", requireAuth, async (req, res) => {
    try {
      const month = req.query.month ? normalizeMonth(req.query.month) : "";
      const includeRecurring = req.query.includeRecurring !== "false";
      const snapshot = await store.getSnapshot();
      const transactions = getUserTransactions(
        req.auth.userId,
        {
          month,
          type: req.query.type || "",
          category: req.query.category || "",
          query: req.query.query || "",
          includeRecurring,
        },
        snapshot,
      );

      return res.json({ transactions });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/transactions", requireAuth, async (req, res) => {
    try {
      const payload = getTransactionPayload(req.body);
      const now = new Date().toISOString();
      const transaction = await store.createTransaction({
        id: crypto.randomUUID(),
        userId: req.auth.userId,
        ...payload,
        createdAt: now,
        updatedAt: now,
      });

      return res.status(201).json({ transaction });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/transactions/:id", requireAuth, async (req, res) => {
    try {
      const existingTransaction = await store.findTransaction(req.auth.userId, req.params.id);

      if (!existingTransaction) {
        return res.status(404).json({ message: "Transaction not found." });
      }

      const transaction = await store.updateTransaction(req.auth.userId, req.params.id, {
        ...existingTransaction,
        ...getTransactionPayload(req.body),
        updatedAt: new Date().toISOString(),
      });

      return res.json({ transaction });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/transactions/:id", requireAuth, async (req, res) => {
    const deleted = await store.deleteTransaction(req.auth.userId, req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    return res.json({ success: true });
  });

  app.put("/api/budgets/:month", requireAuth, async (req, res) => {
    try {
      const month = normalizeMonth(req.params.month);
      const amount = toAmount(req.body.amount, "Budget", { allowZero: true });
      const now = new Date().toISOString();

      await store.upsertBudget({
        id: crypto.randomUUID(),
        userId: req.auth.userId,
        month,
        amount,
        createdAt: now,
        updatedAt: now,
      });

      const snapshot = await store.getSnapshot();
      return res.json({
        summary: getMonthlySummary(req.auth.userId, month, snapshot),
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/settings", requireAuth, async (req, res) => {
    const [user, stats] = await Promise.all([
      store.getUserById(req.auth.userId),
      store.getUserStats(req.auth.userId),
    ]);

    if (!user) {
      return res.status(404).json({ message: "User account no longer exists." });
    }

    return res.json({
      user: sanitizeUser(user),
      stats,
    });
  });

  app.put("/api/settings/profile", requireAuth, async (req, res) => {
    try {
      const user = await store.getUserById(req.auth.userId);

      if (!user) {
        return res.status(404).json({ message: "User account no longer exists." });
      }

      const name = String(req.body.name || "").trim();
      const email = String(req.body.email || "").trim().toLowerCase();

      if (!name || !email) {
        return res.status(400).json({ message: "Name and email are required." });
      }

      if (!isValidEmail(email)) {
        return res.status(400).json({ message: "Email must be a valid email address." });
      }

      const existingUser = await store.getUserByEmail(email);

      if (existingUser && existingUser.id !== req.auth.userId) {
        return res.status(409).json({ message: "That email is already registered." });
      }

      const updatedUser = await store.updateUserProfile(req.auth.userId, {
        name,
        email,
      });

      return res.json({ user: sanitizeUser(updatedUser) });
    } catch (error) {
      if (isDuplicateEntryError(error)) {
        return res.status(409).json({ message: "That email is already registered." });
      }

      return res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/settings/preferences", requireAuth, async (req, res) => {
    try {
      const user = await store.getUserById(req.auth.userId);

      if (!user) {
        return res.status(404).json({ message: "User account no longer exists." });
      }

      const updatedUser = await store.updateUserPreferences(
        req.auth.userId,
        buildUserPreferences(user, req.body),
      );

      return res.json({ user: sanitizeUser(updatedUser) });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/settings/password", requireAuth, async (req, res) => {
    try {
      const user = await store.getUserById(req.auth.userId);

      if (!user) {
        return res.status(404).json({ message: "User account no longer exists." });
      }

      const currentPassword = String(req.body.currentPassword || "");
      const newPassword = String(req.body.newPassword || "");

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required." });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters." });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);

      if (!isMatch) {
        return res.status(401).json({ message: "Current password is incorrect." });
      }

      await store.updateUserPassword(req.auth.userId, await bcrypt.hash(newPassword, 10));

      return res.json({ success: true });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/settings/export", requireAuth, async (req, res) => {
    const [user, snapshot] = await Promise.all([
      store.getUserById(req.auth.userId),
      store.getSnapshot(),
    ]);

    if (!user) {
      return res.status(404).json({ message: "User account no longer exists." });
    }

    return res.json({
      exportedAt: new Date().toISOString(),
      user: sanitizeUser(user),
      budgets: snapshot.budgets.filter((entry) => entry.userId === req.auth.userId),
      transactions: snapshot.transactions.filter((entry) => entry.userId === req.auth.userId),
      recurringTemplates: getRecurringTemplates(req.auth.userId, snapshot),
    });
  });

  app.delete("/api/settings/data", requireAuth, async (_req, res) => {
    await store.clearUserData(_req.auth.userId);
    return res.json({ success: true });
  });

  app.get("/api/recurring-templates", requireAuth, async (req, res) => {
    const snapshot = await store.getSnapshot();
    return res.json({
      templates: getRecurringTemplates(req.auth.userId, snapshot),
    });
  });

  app.post("/api/recurring-templates", requireAuth, async (req, res) => {
    try {
      const now = new Date().toISOString();
      const template = await store.createRecurringTemplate({
        id: crypto.randomUUID(),
        userId: req.auth.userId,
        ...getRecurringTemplatePayload(req.body),
        createdAt: now,
        updatedAt: now,
      });

      return res.status(201).json({ template });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/recurring-templates/:id", requireAuth, async (req, res) => {
    try {
      const existingTemplate = await store.findRecurringTemplate(req.auth.userId, req.params.id);

      if (!existingTemplate) {
        return res.status(404).json({ message: "Recurring template not found." });
      }

      const template = await store.updateRecurringTemplate(req.auth.userId, req.params.id, {
        ...existingTemplate,
        ...getRecurringTemplatePayload(req.body),
        updatedAt: new Date().toISOString(),
      });

      return res.json({ template });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/recurring-templates/:id", requireAuth, async (req, res) => {
    const deleted = await store.deleteRecurringTemplate(req.auth.userId, req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Recurring template not found." });
    }

    return res.json({ success: true });
  });

  return app;
}
