import { db } from "./store.js";

export function normalizeMonth(value) {
  const month = value || new Date().toISOString().slice(0, 7);

  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("Month must use the YYYY-MM format.");
  }

  return month;
}

export function normalizeDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    throw new Error("Transaction date must use the YYYY-MM-DD format.");
  }

  return value;
}

export function toAmount(value, fieldName, { allowZero = false } = {}) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || (!allowZero && amount <= 0) || (allowZero && amount < 0)) {
    throw new Error(`${fieldName} must be a valid ${allowZero ? "non-negative" : "positive"} number.`);
  }

  return Math.round(amount * 100) / 100;
}

export function sortTransactionsDesc(items) {
  return [...items].sort((left, right) => {
    const leftDate = new Date(left.transactionDate).getTime();
    const rightDate = new Date(right.transactionDate).getTime();

    if (leftDate !== rightDate) {
      return rightDate - leftDate;
    }

    return new Date(right.updatedAt || right.createdAt).getTime() -
      new Date(left.updatedAt || left.createdAt).getTime();
  });
}

export function getMonthlySummary(userId, month) {
  const transactions = db.data.transactions.filter(
    (transaction) =>
      transaction.userId === userId && transaction.transactionDate.startsWith(month),
  );
  const budgetRecord =
    db.data.budgets.find(
      (budget) => budget.userId === userId && budget.month === month,
    ) || null;

  const totalExpenses = transactions.reduce(
    (sum, transaction) => sum + Number(transaction.amount),
    0,
  );
  const roundedExpenses = Math.round(totalExpenses * 100) / 100;
  const budget = budgetRecord ? Number(budgetRecord.amount) : null;
  const summary = {
    month,
    totalExpenses: roundedExpenses,
    budget,
    transactionCount: transactions.length,
    statusType: "unset",
    statusAmount: null,
  };

  if (budget !== null) {
    const statusAmount = Math.round((budget - roundedExpenses) * 100) / 100;
    summary.statusAmount = statusAmount;

    if (statusAmount > 0) {
      summary.statusType = "remaining";
    } else if (statusAmount < 0) {
      summary.statusType = "deficit";
    } else {
      summary.statusType = "exact";
    }
  }

  return summary;
}

export function getUserTransactions(userId, month) {
  const items = db.data.transactions.filter((transaction) => {
    if (transaction.userId !== userId) {
      return false;
    }

    return month ? transaction.transactionDate.startsWith(month) : true;
  });

  return sortTransactionsDesc(items);
}
