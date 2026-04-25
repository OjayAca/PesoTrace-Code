import crypto from "node:crypto";
import { normalizeMonth, toAmount } from "../finance.js";
import { getTransactionPayload, getRecurringTemplatePayload } from "../utils/helpers.js";

export function getDashboard(store) {
  return async (req, res) => {
    try {
      const month = normalizeMonth(req.query.month);
      const summary = await store.getMonthlySummary(req.auth.userId, month);
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
      const report = await store.getReports(req.auth.userId, month, months);
      return res.json(report);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  };
}

export function getTransactions(store) {
  return async (req, res) => {
    try {
      const transactions = await store.listUserTransactions(
        req.auth.userId,
        {
          month: req.query.month ? normalizeMonth(req.query.month) : "",
          type: req.query.type || "",
          category: req.query.category || "",
          query: req.query.query || "",
          startDate: req.query.startDate || "",
          endDate: req.query.endDate || "",
          sortBy: req.query.sortBy || "",
          sortOrder: req.query.sortOrder || "",
          includeRecurring: req.query.includeRecurring !== "false",
        },
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
      if (!["set", "add", "edit"].includes(mode)) {
        throw new Error("Budget mode must be set, add, or edit.");
      }

      const amount =
        mode === "add"
          ? toAmount(req.body.amount, "Budget top-up")
          : toAmount(req.body.amount, "Budget", { allowZero: true });
      const now = new Date().toISOString();
      await store.saveBudget({
        id: crypto.randomUUID(),
        userId: req.auth.userId,
        month,
        amount,
        mode,
        createdAt: now,
        updatedAt: now,
      });

      return res.json({
        summary: await store.getMonthlySummary(req.auth.userId, month),
      });
    } catch (error) {
      if (error?.code === "BUDGET_EXISTS") {
        return res.status(409).json({ message: error.message });
      }

      return res.status(400).json({ message: error.message });
    }
  };
}

export function getRecurringTemplatesList(store) {
  return async (req, res) => {
    return res.json({
      templates: await store.getUserRecurringTemplates(req.auth.userId),
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
