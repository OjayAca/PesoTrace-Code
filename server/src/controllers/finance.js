import crypto from "node:crypto";
import { normalizeMonth, toAmount } from "../finance.js";
import { ClientError } from "../utils/errors.js";
import { getTransactionPayload, getRecurringTemplatePayload } from "../utils/helpers.js";

function getClientPayload(readPayload) {
  try {
    return readPayload();
  } catch (error) {
    throw new ClientError(error.message);
  }
}

export function getDashboard(store) {
  return async (req, res) => {
    const month = getClientPayload(() => normalizeMonth(req.query.month));
    const summary = await store.getMonthlySummary(req.auth.userId, month);
    return res.json({ summary });
  };
}

export function getReportsView(store) {
  return async (req, res) => {
    const month = getClientPayload(() => normalizeMonth(req.query.month));
    const months = Number(req.query.months || 6);
    const report = await store.getReports(req.auth.userId, month, months);
    return res.json(report);
  };
}

export function getTransactions(store) {
  return async (req, res) => {
    const query = getClientPayload(() => ({
      month: req.query.month ? normalizeMonth(req.query.month) : "",
      type: req.query.type || "",
      category: req.query.category || "",
      query: req.query.query || "",
      startDate: req.query.startDate || "",
      endDate: req.query.endDate || "",
      sortBy: req.query.sortBy || "",
      sortOrder: req.query.sortOrder || "",
      includeRecurring: req.query.includeRecurring !== "false",
      limit: req.query.limit || "",
      offset: req.query.offset || "",
    }));
    let transactions;
    try {
      transactions = await store.listUserTransactions(req.auth.userId, query);
    } catch (error) {
      if (/^Transaction (limit|offset) must be/.test(error.message)) {
        throw new ClientError(error.message);
      }

      throw error;
    }

    return res.json({
      transactions,
      pagination: transactions.pagination || {
        limit: query.limit || 2550,
        offset: query.offset || 0,
        count: transactions.length,
        hasMore: false,
      },
    });
  };
}

export function createTransaction(store) {
  return async (req, res) => {
    const payload = getClientPayload(() => getTransactionPayload(req.body));
    const now = new Date().toISOString();
    const transaction = await store.createTransaction({
      id: crypto.randomUUID(),
      userId: req.auth.userId,
      ...payload,
      createdAt: now,
      updatedAt: now,
    });

    return res.status(201).json({ transaction });
  };
}

export function updateTransaction(store) {
  return async (req, res) => {
    const existingTransaction = await store.findTransaction(req.auth.userId, req.params.id);

    if (!existingTransaction) {
      throw new ClientError("Transaction not found.", 404);
    }

    const payload = getClientPayload(() => getTransactionPayload(req.body));
    const transaction = await store.updateTransaction(req.auth.userId, req.params.id, {
      ...existingTransaction,
      ...payload,
      updatedAt: new Date().toISOString(),
    });

    return res.json({ transaction });
  };
}

export function deleteTransaction(store) {
  return async (req, res) => {
    const deleted = await store.deleteTransaction(req.auth.userId, req.params.id);

    if (!deleted) {
      throw new ClientError("Transaction not found.", 404);
    }

    return res.json({ success: true });
  };
}

export function upsertBudget(store) {
  return async (req, res) => {
    const { month, mode, amount } = getClientPayload(() => {
      const month = normalizeMonth(req.params.month);
      const mode = String(req.body.mode || "set").trim().toLowerCase();
      if (!["set", "add", "edit"].includes(mode)) {
        throw new Error("Budget mode must be set, add, or edit.");
      }

      const amount =
        mode === "add"
          ? toAmount(req.body.amount, "Budget top-up")
          : toAmount(req.body.amount, "Budget", { allowZero: true });
      return { month, mode, amount };
    });
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
    const payload = getClientPayload(() => getRecurringTemplatePayload(req.body));
    const now = new Date().toISOString();
    const template = await store.createRecurringTemplate({
      id: crypto.randomUUID(),
      userId: req.auth.userId,
      ...payload,
      createdAt: now,
      updatedAt: now,
    });

    return res.status(201).json({ template });
  };
}

export function updateRecurringTemplate(store) {
  return async (req, res) => {
    const existingTemplate = await store.findRecurringTemplate(req.auth.userId, req.params.id);

    if (!existingTemplate) {
      throw new ClientError("Recurring template not found.", 404);
    }

    const payload = getClientPayload(() => getRecurringTemplatePayload(req.body));
    const template = await store.updateRecurringTemplate(req.auth.userId, req.params.id, {
      ...existingTemplate,
      ...payload,
      updatedAt: new Date().toISOString(),
    });

    return res.json({ template });
  };
}

export function deleteRecurringTemplate(store) {
  return async (req, res) => {
    const deleted = await store.deleteRecurringTemplate(req.auth.userId, req.params.id);

    if (!deleted) {
      throw new ClientError("Recurring template not found.", 404);
    }

    return res.json({ success: true });
  };
}
