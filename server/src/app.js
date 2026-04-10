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

function getAuthenticatedUser(store, userId) {
  return store.data.users.find((entry) => entry.id === userId) || null;
}

function updateUserPreferences(user, payload = {}) {
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

  user.preferences = {
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

export function createApp({
  store,
  persistStore,
  clientOrigin = "http://localhost:5173",
} = {}) {
  if (!store?.data) {
    throw new Error("A store with a data object is required.");
  }

  if (typeof persistStore !== "function") {
    throw new Error("persistStore must be a function.");
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

      const existingUser = store.data.users.find((user) => user.email === email);

      if (existingUser) {
        return res.status(409).json({ message: "That email is already registered." });
      }

      const now = new Date().toISOString();
      const user = {
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
      };

      store.data.users.push(user);
      await persistStore();

      const publicUser = sanitizeUser(user);
      return res.status(201).json({
        user: publicUser,
        token: createToken(publicUser),
      });
    } catch {
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

      const user = store.data.users.find((entry) => entry.email === email);

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

  app.get("/api/auth/me", requireAuth, (req, res) => {
    const user = getAuthenticatedUser(store, req.auth.userId);

    if (!user) {
      return res.status(404).json({ message: "User account no longer exists." });
    }

    return res.json({ user: sanitizeUser(user) });
  });

  app.get("/api/dashboard", requireAuth, (req, res) => {
    try {
      const month = normalizeMonth(req.query.month);
      const summary = getMonthlySummary(req.auth.userId, month, store.data);
      return res.json({ summary });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/reports", requireAuth, (req, res) => {
    try {
      const month = normalizeMonth(req.query.month);
      const months = Number(req.query.months || 6);
      const report = getReports(req.auth.userId, month, store.data, months);
      return res.json(report);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/transactions", requireAuth, (req, res) => {
    try {
      const month = req.query.month ? normalizeMonth(req.query.month) : "";
      const includeRecurring = req.query.includeRecurring !== "false";
      const transactions = getUserTransactions(
        req.auth.userId,
        {
          month,
          type: req.query.type || "",
          category: req.query.category || "",
          query: req.query.query || "",
          includeRecurring,
        },
        store.data,
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
      const transaction = {
        id: crypto.randomUUID(),
        userId: req.auth.userId,
        ...payload,
        createdAt: now,
        updatedAt: now,
      };

      store.data.transactions.push(transaction);
      await persistStore();

      return res.status(201).json({ transaction });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/transactions/:id", requireAuth, async (req, res) => {
    try {
      const transaction = store.data.transactions.find(
        (entry) => entry.id === req.params.id && entry.userId === req.auth.userId,
      );

      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found." });
      }

      Object.assign(transaction, getTransactionPayload(req.body), {
        updatedAt: new Date().toISOString(),
      });

      await persistStore();

      return res.json({ transaction });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/transactions/:id", requireAuth, async (req, res) => {
    const index = store.data.transactions.findIndex(
      (entry) => entry.id === req.params.id && entry.userId === req.auth.userId,
    );

    if (index === -1) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    store.data.transactions.splice(index, 1);
    await persistStore();

    return res.json({ success: true });
  });

  app.put("/api/budgets/:month", requireAuth, async (req, res) => {
    try {
      const month = normalizeMonth(req.params.month);
      const amount = toAmount(req.body.amount, "Budget", { allowZero: true });
      const existingBudget = store.data.budgets.find(
        (entry) => entry.userId === req.auth.userId && entry.month === month,
      );
      const now = new Date().toISOString();

      if (existingBudget) {
        existingBudget.amount = amount;
        existingBudget.updatedAt = now;
      } else {
        store.data.budgets.push({
          id: crypto.randomUUID(),
          userId: req.auth.userId,
          month,
          amount,
          createdAt: now,
          updatedAt: now,
        });
      }

      await persistStore();

      return res.json({
        summary: getMonthlySummary(req.auth.userId, month, store.data),
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/settings", requireAuth, (req, res) => {
    const user = getAuthenticatedUser(store, req.auth.userId);

    if (!user) {
      return res.status(404).json({ message: "User account no longer exists." });
    }

    return res.json({
      user: sanitizeUser(user),
      stats: {
        transactionCount: store.data.transactions.filter(
          (entry) => entry.userId === req.auth.userId,
        ).length,
        budgetCount: store.data.budgets.filter(
          (entry) => entry.userId === req.auth.userId,
        ).length,
        recurringCount: store.data.recurringTemplates.filter(
          (entry) => entry.userId === req.auth.userId,
        ).length,
      },
    });
  });

  app.put("/api/settings/profile", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(store, req.auth.userId);

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

      const existingUser = store.data.users.find(
        (entry) => entry.email === email && entry.id !== req.auth.userId,
      );

      if (existingUser) {
        return res.status(409).json({ message: "That email is already registered." });
      }

      user.name = name;
      user.email = email;
      await persistStore();

      return res.json({ user: sanitizeUser(user) });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/settings/preferences", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(store, req.auth.userId);

      if (!user) {
        return res.status(404).json({ message: "User account no longer exists." });
      }

      updateUserPreferences(user, req.body);
      await persistStore();

      return res.json({ user: sanitizeUser(user) });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/settings/password", requireAuth, async (req, res) => {
    try {
      const user = getAuthenticatedUser(store, req.auth.userId);

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

      user.passwordHash = await bcrypt.hash(newPassword, 10);
      await persistStore();

      return res.json({ success: true });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/settings/export", requireAuth, (req, res) => {
    const user = getAuthenticatedUser(store, req.auth.userId);

    if (!user) {
      return res.status(404).json({ message: "User account no longer exists." });
    }

    return res.json({
      exportedAt: new Date().toISOString(),
      user: sanitizeUser(user),
      budgets: store.data.budgets.filter((entry) => entry.userId === req.auth.userId),
      transactions: store.data.transactions.filter(
        (entry) => entry.userId === req.auth.userId,
      ),
      recurringTemplates: getRecurringTemplates(req.auth.userId, store.data),
    });
  });

  app.delete("/api/settings/data", requireAuth, async (req, res) => {
    store.data.transactions = store.data.transactions.filter(
      (entry) => entry.userId !== req.auth.userId,
    );
    store.data.budgets = store.data.budgets.filter(
      (entry) => entry.userId !== req.auth.userId,
    );
    store.data.recurringTemplates = store.data.recurringTemplates.filter(
      (entry) => entry.userId !== req.auth.userId,
    );
    await persistStore();

    return res.json({ success: true });
  });

  app.get("/api/recurring-templates", requireAuth, (req, res) => {
    return res.json({
      templates: getRecurringTemplates(req.auth.userId, store.data),
    });
  });

  app.post("/api/recurring-templates", requireAuth, async (req, res) => {
    try {
      const now = new Date().toISOString();
      const template = {
        id: crypto.randomUUID(),
        userId: req.auth.userId,
        ...getRecurringTemplatePayload(req.body),
        createdAt: now,
        updatedAt: now,
      };

      store.data.recurringTemplates.push(template);
      await persistStore();

      return res.status(201).json({ template });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/recurring-templates/:id", requireAuth, async (req, res) => {
    try {
      const template = store.data.recurringTemplates.find(
        (entry) => entry.id === req.params.id && entry.userId === req.auth.userId,
      );

      if (!template) {
        return res.status(404).json({ message: "Recurring template not found." });
      }

      Object.assign(template, getRecurringTemplatePayload(req.body), {
        updatedAt: new Date().toISOString(),
      });
      await persistStore();

      return res.json({ template });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/recurring-templates/:id", requireAuth, async (req, res) => {
    const index = store.data.recurringTemplates.findIndex(
      (entry) => entry.id === req.params.id && entry.userId === req.auth.userId,
    );

    if (index === -1) {
      return res.status(404).json({ message: "Recurring template not found." });
    }

    store.data.recurringTemplates.splice(index, 1);
    await persistStore();

    return res.json({ success: true });
  });

  return app;
}
