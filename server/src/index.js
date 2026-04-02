import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createToken, requireAuth } from "./auth.js";
import {
  getMonthlySummary,
  getUserTransactions,
  normalizeDate,
  normalizeMonth,
  toAmount,
} from "./finance.js";
import { db, initStore, persist } from "./store.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: CLIENT_ORIGIN.split(",").map((origin) => origin.trim()),
  }),
);
app.use(express.json());

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const existingUser = db.data.users.find((user) => user.email === email);

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
    };

    db.data.users.push(user);
    await persist();

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
    const user = db.data.users.find((entry) => entry.email === email);

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
  const user = db.data.users.find((entry) => entry.id === req.auth.userId);

  if (!user) {
    return res.status(404).json({ message: "User account no longer exists." });
  }

  return res.json({ user: sanitizeUser(user) });
});

app.get("/api/dashboard", requireAuth, (req, res) => {
  try {
    const month = normalizeMonth(req.query.month);
    const summary = getMonthlySummary(req.auth.userId, month);
    return res.json({ summary });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

app.get("/api/transactions", requireAuth, (req, res) => {
  try {
    const month = req.query.month ? normalizeMonth(req.query.month) : "";
    const transactions = getUserTransactions(req.auth.userId, month);
    return res.json({ transactions });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

app.post("/api/transactions", requireAuth, async (req, res) => {
  try {
    const title = String(req.body.title || "").trim();
    const notes = String(req.body.notes || "").trim();
    const amount = toAmount(req.body.amount, "Amount");
    const transactionDate = normalizeDate(req.body.transactionDate);

    if (!title) {
      return res.status(400).json({ message: "Transaction title is required." });
    }

    const now = new Date().toISOString();
    const transaction = {
      id: crypto.randomUUID(),
      userId: req.auth.userId,
      title,
      notes,
      amount,
      transactionDate,
      createdAt: now,
      updatedAt: now,
    };

    db.data.transactions.push(transaction);
    await persist();

    return res.status(201).json({ transaction });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

app.put("/api/transactions/:id", requireAuth, async (req, res) => {
  try {
    const transaction = db.data.transactions.find(
      (entry) => entry.id === req.params.id && entry.userId === req.auth.userId,
    );

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    const title = String(req.body.title || "").trim();
    const notes = String(req.body.notes || "").trim();
    const amount = toAmount(req.body.amount, "Amount");
    const transactionDate = normalizeDate(req.body.transactionDate);

    if (!title) {
      return res.status(400).json({ message: "Transaction title is required." });
    }

    transaction.title = title;
    transaction.notes = notes;
    transaction.amount = amount;
    transaction.transactionDate = transactionDate;
    transaction.updatedAt = new Date().toISOString();

    await persist();

    return res.json({ transaction });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

app.delete("/api/transactions/:id", requireAuth, async (req, res) => {
  const index = db.data.transactions.findIndex(
    (entry) => entry.id === req.params.id && entry.userId === req.auth.userId,
  );

  if (index === -1) {
    return res.status(404).json({ message: "Transaction not found." });
  }

  db.data.transactions.splice(index, 1);
  await persist();

  return res.json({ success: true });
});

app.put("/api/budgets/:month", requireAuth, async (req, res) => {
  try {
    const month = normalizeMonth(req.params.month);
    const amount = toAmount(req.body.amount, "Budget", { allowZero: true });
    const existingBudget = db.data.budgets.find(
      (entry) => entry.userId === req.auth.userId && entry.month === month,
    );
    const now = new Date().toISOString();

    if (existingBudget) {
      existingBudget.amount = amount;
      existingBudget.updatedAt = now;
    } else {
      db.data.budgets.push({
        id: crypto.randomUUID(),
        userId: req.auth.userId,
        month,
        amount,
        createdAt: now,
        updatedAt: now,
      });
    }

    await persist();

    return res.json({
      summary: getMonthlySummary(req.auth.userId, month),
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

initStore()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`PesoTrace API listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize data store.", error);
    process.exit(1);
  });
