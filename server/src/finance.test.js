import assert from "node:assert/strict";
import test from "node:test";
import { getMonthlySummary, normalizeMonth } from "./finance.js";

test("normalizeMonth defaults to the local calendar month", () => {
  const now = new Date();
  const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  assert.equal(normalizeMonth(), expected);
});

test("getMonthlySummary includes income in remaining budget calculations", () => {
  const summary = getMonthlySummary("user-1", "2026-04", {
    users: [],
    transactions: [
      {
        id: "txn-1",
        userId: "user-1",
        title: "Allowance",
        notes: "",
        amount: 1500,
        transactionDate: "2026-04-01",
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T00:00:00.000Z",
        type: "income",
        category: "Allowance",
      },
      {
        id: "txn-2",
        userId: "user-1",
        title: "Groceries",
        notes: "",
        amount: 2000,
        transactionDate: "2026-04-02",
        createdAt: "2026-04-02T00:00:00.000Z",
        updatedAt: "2026-04-02T00:00:00.000Z",
        type: "expense",
        category: "Food",
      },
    ],
    budgets: [
      {
        id: "budget-1",
        userId: "user-1",
        month: "2026-04",
        amount: 5000,
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
    ],
    recurringTemplates: [],
  });

  assert.equal(summary.totalIncome, 1500);
  assert.equal(summary.totalExpenses, 2000);
  assert.equal(summary.availableFunds, 6500);
  assert.equal(summary.statusType, "remaining");
  assert.equal(summary.statusAmount, 4500);
  assert.equal(summary.budgetRemaining, 4500);
});
