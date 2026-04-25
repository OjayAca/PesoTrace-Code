import assert from "node:assert/strict";
import test from "node:test";
import { createMemoryStore } from "./store.js";

test("memory store exposes joined overview stats", async () => {
  const store = createMemoryStore({
    users: [
      {
        id: "user-1",
        name: "Overview User",
        email: "overview@example.com",
        passwordHash: "hash",
        createdAt: "2026-04-10T00:00:00.000Z",
        preferences: {
          preferredTheme: "dark",
          defaultBudget: 1500,
          currency: "PHP",
        },
      },
    ],
    transactions: [
      {
        id: "txn-1",
        userId: "user-1",
        title: "Salary",
        notes: "",
        amount: 5000,
        transactionDate: "2026-04-01",
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T00:00:00.000Z",
        type: "income",
        category: "Allowance",
      },
      {
        id: "txn-2",
        userId: "user-1",
        title: "Lunch",
        notes: "",
        amount: 120,
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
        amount: 1500,
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T00:00:00.000Z",
      },
    ],
    recurringTemplates: [
      {
        id: "rec-1",
        userId: "user-1",
        title: "Internet",
        notes: "",
        amount: 499,
        startDate: "2026-03-15",
        type: "expense",
        category: "Bills",
        repeat: "monthly",
        createdAt: "2026-03-15T00:00:00.000Z",
        updatedAt: "2026-03-15T00:00:00.000Z",
      },
    ],
  });

  const overview = await store.getUserOverview("user-1");

  assert.equal(overview.user.email, "overview@example.com");
  assert.deepEqual(overview.stats, {
    transactionCount: 2,
    budgetCount: 1,
    recurringCount: 1,
  });
});

test("memory store returns a user-scoped finance snapshot", async () => {
  const store = createMemoryStore({
    users: [
      {
        id: "user-1",
        name: "Scoped User",
        email: "scoped@example.com",
        passwordHash: "hash",
        createdAt: "2026-04-10T00:00:00.000Z",
      },
      {
        id: "user-2",
        name: "Other User",
        email: "other@example.com",
        passwordHash: "hash",
        createdAt: "2026-04-11T00:00:00.000Z",
      },
    ],
    transactions: [
      {
        id: "txn-1",
        userId: "user-1",
        title: "Mine",
        notes: "",
        amount: 100,
        transactionDate: "2026-04-01",
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T00:00:00.000Z",
        type: "expense",
        category: "Food",
      },
      {
        id: "txn-2",
        userId: "user-2",
        title: "Not mine",
        notes: "",
        amount: 200,
        transactionDate: "2026-04-01",
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T00:00:00.000Z",
        type: "expense",
        category: "Food",
      },
    ],
  });

  const snapshot = await store.getUserFinanceSnapshot("user-1");

  assert.equal(snapshot.users.length, 1);
  assert.equal(snapshot.users[0].email, "scoped@example.com");
  assert.equal(snapshot.transactions.length, 1);
  assert.equal(snapshot.transactions[0].title, "Mine");
});

test("memory store lists filtered user transactions including recurring entries", async () => {
  const store = createMemoryStore({
    users: [
      {
        id: "user-1",
        name: "Scoped User",
        email: "scoped@example.com",
        passwordHash: "hash",
        createdAt: "2026-04-10T00:00:00.000Z",
      },
    ],
    transactions: [
      {
        id: "txn-1",
        userId: "user-1",
        title: "Project payout",
        notes: "",
        amount: 500,
        transactionDate: "2026-04-12",
        createdAt: "2026-04-12T00:00:00.000Z",
        updatedAt: "2026-04-12T00:00:00.000Z",
        type: "income",
        category: "Allowance",
      },
    ],
    recurringTemplates: [
      {
        id: "rec-1",
        userId: "user-1",
        title: "Internet",
        notes: "",
        amount: 400,
        startDate: "2026-03-01",
        type: "expense",
        category: "Bills",
        repeat: "monthly",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-01T00:00:00.000Z",
      },
    ],
  });

  const transactions = await store.listUserTransactions("user-1", {
    month: "2026-04",
    query: "",
    includeRecurring: true,
  });

  assert.equal(transactions.length, 2);
  assert.deepEqual(
    transactions.map((entry) => entry.title),
    ["Project payout", "Internet"],
  );
});

test("memory store returns SQL-compatible monthly summaries through the store interface", async () => {
  const store = createMemoryStore({
    users: [
      {
        id: "user-1",
        name: "Summary User",
        email: "summary@example.com",
        passwordHash: "hash",
        createdAt: "2026-04-10T00:00:00.000Z",
        preferences: {
          preferredTheme: "light",
          defaultBudget: 1200,
          currency: "PHP",
        },
      },
    ],
    transactions: [
      {
        id: "txn-1",
        userId: "user-1",
        title: "Allowance",
        notes: "",
        amount: 1500,
        transactionDate: "2026-04-02",
        createdAt: "2026-04-02T00:00:00.000Z",
        updatedAt: "2026-04-02T00:00:00.000Z",
        type: "income",
        category: "Allowance",
      },
    ],
    recurringTemplates: [
      {
        id: "rec-1",
        userId: "user-1",
        title: "Internet",
        notes: "",
        amount: 499,
        startDate: "2026-03-15",
        type: "expense",
        category: "Bills",
        repeat: "monthly",
        createdAt: "2026-03-15T00:00:00.000Z",
        updatedAt: "2026-03-15T00:00:00.000Z",
      },
    ],
  });

  const summary = await store.getMonthlySummary("user-1", "2026-04");

  assert.equal(summary.totalIncome, 1500);
  assert.equal(summary.totalExpenses, 499);
  assert.equal(summary.budget, 1200);
  assert.equal(summary.budgetSource, "default");
  assert.equal(summary.transactionCount, 2);
  assert.equal(summary.statusType, "remaining");
  assert.equal(summary.statusAmount, 701);
});

test("memory store returns recurring templates without a full user snapshot", async () => {
  const store = createMemoryStore({
    users: [
      {
        id: "user-1",
        name: "Scoped User",
        email: "scoped@example.com",
        passwordHash: "hash",
        createdAt: "2026-04-10T00:00:00.000Z",
      },
    ],
    recurringTemplates: [
      {
        id: "rec-1",
        userId: "user-1",
        title: "Internet",
        notes: "",
        amount: 400,
        startDate: "2026-03-01",
        type: "expense",
        category: "Bills",
        repeat: "monthly",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-01T00:00:00.000Z",
      },
    ],
  });

  const templates = await store.getUserRecurringTemplates("user-1");

  assert.equal(templates.length, 1);
  assert.equal(templates[0].title, "Internet");
});

test("memory store returns reports through the store interface", async () => {
  const store = createMemoryStore({
    users: [
      {
        id: "user-1",
        name: "Reports User",
        email: "reports@example.com",
        passwordHash: "hash",
        createdAt: "2026-04-10T00:00:00.000Z",
        preferences: {
          preferredTheme: "dark",
          defaultBudget: 4000,
          currency: "PHP",
        },
      },
    ],
    transactions: [
      {
        id: "txn-1",
        userId: "user-1",
        title: "Salary",
        notes: "",
        amount: 5000,
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
        amount: 1200,
        transactionDate: "2026-04-03",
        createdAt: "2026-04-03T00:00:00.000Z",
        updatedAt: "2026-04-03T00:00:00.000Z",
        type: "expense",
        category: "Food",
      },
    ],
    recurringTemplates: [
      {
        id: "rec-1",
        userId: "user-1",
        title: "Dorm rent",
        notes: "",
        amount: 3500,
        startDate: "2026-02-01",
        type: "expense",
        category: "Bills",
        repeat: "monthly",
        createdAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-01T00:00:00.000Z",
      },
    ],
  });

  const reports = await store.getReports("user-1", "2026-04", 4);

  assert.equal(reports.summary.totalExpenses, 4700);
  assert.equal(reports.monthlyTrend.length, 4);
  assert.equal(reports.highlights.topExpenseCategory.category, "Bills");
  assert.equal(reports.highlights.largestExpense.title, "Dorm rent");
  assert.equal(reports.highlights.largestIncome.title, "Salary");
  assert.equal(reports.highlights.recurringTemplateCount, 1);
});

test("memory store budget add uses the default budget as the base amount", async () => {
  const store = createMemoryStore({
    users: [
      {
        id: "user-1",
        name: "Budget User",
        email: "budget@example.com",
        passwordHash: "hash",
        createdAt: "2026-04-10T00:00:00.000Z",
        preferences: {
          preferredTheme: "light",
          defaultBudget: 500,
          currency: "PHP",
        },
      },
    ],
  });

  const budget = await store.saveBudget({
    id: "budget-1",
    userId: "user-1",
    month: "2026-04",
    amount: 100,
    mode: "add",
    createdAt: "2026-04-10T00:00:00.000Z",
    updatedAt: "2026-04-10T00:00:00.000Z",
  });

  assert.equal(budget.amount, 600);
});

test("memory store set mode rejects overwriting an existing month budget", async () => {
  const store = createMemoryStore({
    users: [
      {
        id: "user-1",
        name: "Budget User",
        email: "budget@example.com",
        passwordHash: "hash",
        createdAt: "2026-04-10T00:00:00.000Z",
      },
    ],
    budgets: [
      {
        id: "budget-1",
        userId: "user-1",
        month: "2026-04",
        amount: 100,
        createdAt: "2026-04-10T00:00:00.000Z",
        updatedAt: "2026-04-10T00:00:00.000Z",
      },
    ],
  });

  await assert.rejects(
    store.saveBudget({
      id: "budget-2",
      userId: "user-1",
      month: "2026-04",
      amount: 200,
      mode: "set",
      createdAt: "2026-04-11T00:00:00.000Z",
      updatedAt: "2026-04-11T00:00:00.000Z",
    }),
    (error) => error.code === "BUDGET_EXISTS",
  );
});

test("memory store rejects duplicate emails", async () => {
  const store = createMemoryStore({
    users: [
      {
        id: "user-1",
        name: "Existing User",
        email: "duplicate@example.com",
        passwordHash: "hash",
        createdAt: "2026-04-10T00:00:00.000Z",
      },
    ],
  });

  await assert.rejects(
    store.createUser({
      id: "user-2",
      name: "New User",
      email: "duplicate@example.com",
      passwordHash: "hash-2",
      createdAt: "2026-04-11T00:00:00.000Z",
      preferences: {
        preferredTheme: "light",
        defaultBudget: null,
        currency: "PHP",
      },
    }),
    (error) => error.code === "ER_DUP_ENTRY",
  );
});

test("memory store rejects child records without a parent user", async () => {
  const store = createMemoryStore();

  await assert.rejects(
    store.createTransaction({
      id: "txn-1",
      userId: "missing-user",
      title: "Orphan transaction",
      notes: "",
      amount: 100,
      transactionDate: "2026-04-01",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
      type: "expense",
      category: "Other",
    }),
    (error) => error.code === "ER_NO_REFERENCED_ROW_2",
  );
});

test("memory store rolls back transactional work on failure", async () => {
  const store = createMemoryStore();

  await assert.rejects(
    store.runInTransaction(async () => {
      await store.createUser({
        id: "user-1",
        name: "Rollback User",
        email: "rollback@example.com",
        passwordHash: "hash",
        createdAt: "2026-04-10T00:00:00.000Z",
        preferences: {
          preferredTheme: "light",
          defaultBudget: null,
          currency: "PHP",
        },
      });

      throw new Error("fail the transaction");
    }),
    /fail the transaction/,
  );

  const snapshot = await store.getSnapshot();
  assert.equal(snapshot.users.length, 0);
});
