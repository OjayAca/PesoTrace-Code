import crypto from "node:crypto";
import {
  normalizeMonth,
  getMonthlySummary,
  getReports,
  getUserTransactions,
  toAmount,
  getRecurringTemplates,
} from "../finance.js";
import { getTransactionPayload, getRecurringTemplatePayload } from "../utils/helpers.js";

export function getDashboard(store) {
  return async (req, res) => {
    try {
      const month = normalizeMonth(req.query.month);
      const snapshot = await store.getSnapshot();
      const summary = getMonthlySummary(req.auth.userId, month, snapshot);
      return res.json({ summary });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  };
}

export function getReportsView(store) {
  return async (req, res) => {
    try {
      const month = normalizeMonth(req.query.month);
      const months = Number(req.query.months || 6);
      const snapshot = await store.getSnapshot();
      const report = getReports(req.auth.userId, month, snapshot, months);
      return res.json(report);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  };
}

export function getTransactions(store) {
  return async (req, res) => {
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
          startDate: req.query.startDate || "",
          endDate: req.query.endDate || "",
          sortBy: req.query.sortBy || "",
          sortOrder: req.query.sortOrder || "",
          includeRecurring,
        },
        snapshot,
      );

      return res.json({ transactions });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  };
}

export function createTransaction(store) {
  return async (req, res) => {
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
  };
}

export function updateTransaction(store) {
  return async (req, res) => {
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
  };
}

export function deleteTransaction(store) {
  return async (req, res) => {
    const deleted = await store.deleteTransaction(req.auth.userId, req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    return res.json({ success: true });
  };
}

export function upsertBudget(store) {
  return async (req, res) => {
    try {
      const month = normalizeMonth(req.params.month);
      const mode = String(req.body.mode || "set").trim().toLowerCase();
      if (!["set", "add"].includes(mode)) {
        throw new Error("Budget mode must be set or add.");
      }

      const amount =
        mode === "add"
          ? toAmount(req.body.amount, "Budget top-up")
          : toAmount(req.body.amount, "Budget", { allowZero: true });
      const now = new Date().toISOString();
      const snapshot = await store.getSnapshot();
      let nextAmount = amount;

      if (mode === "add") {
        const currentSummary = getMonthlySummary(req.auth.userId, month, snapshot);
        const currentBudget = currentSummary.budget === null ? 0 : Number(currentSummary.budget);
        nextAmount = Math.round((currentBudget + amount) * 100) / 100;
      }

      await store.upsertBudget({
        id: crypto.randomUUID(),
        userId: req.auth.userId,
        month,
        amount: nextAmount,
        createdAt: now,
        updatedAt: now,
      });

      const updatedSnapshot = await store.getSnapshot();
      return res.json({
        summary: getMonthlySummary(req.auth.userId, month, updatedSnapshot),
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  };
}

export function getRecurringTemplatesList(store) {
  return async (req, res) => {
    const snapshot = await store.getSnapshot();
    return res.json({
      templates: getRecurringTemplates(req.auth.userId, snapshot),
    });
  };
}

export function createRecurringTemplate(store) {
  return async (req, res) => {
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
  };
}

export function updateRecurringTemplate(store) {
  return async (req, res) => {
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
  };
}

export function deleteRecurringTemplate(store) {
  return async (req, res) => {
    const deleted = await store.deleteRecurringTemplate(req.auth.userId, req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Recurring template not found." });
    }

    return res.json({ success: true });
  };
}
