import assert from "node:assert/strict";
import test from "node:test";
import { buildReportPdf, buildReportWorkbook, buildTransactionsCsv } from "./reportExports.js";

const samplePayload = {
  monthLabel: "April 2026",
  exportedAt: "2026-04-26T09:15:00.000Z",
  summary: {
    totalIncome: 12500,
    totalExpenses: 7320,
    totalTransfers: 2100,
    netBalance: 5180,
    budget: 9000,
    availableFunds: 21500,
    budgetRemaining: 14180,
    statusType: "remaining",
    statusAmount: 14180,
    transactionCount: 3,
  },
  reports: {
    monthlyTrend: [
      {
        month: "2026-03",
        label: "Mar 2026",
        totalIncome: 11000,
        totalExpenses: 6800,
        totalTransfers: 1500,
        netBalance: 4200,
        budget: 8500,
      },
      {
        month: "2026-04",
        label: "Apr 2026",
        totalIncome: 12500,
        totalExpenses: 7320,
        totalTransfers: 2100,
        netBalance: 5180,
        budget: 9000,
      },
    ],
    categoryBreakdown: [
      { category: "Food", amount: 1320 },
      { category: "Bills", amount: 6000 },
    ],
    highlights: {
      largestExpense: { title: "Groceries", amount: 1200 },
      largestIncome: { title: "Allowance", amount: 12500 },
      topExpenseCategory: { category: "Bills", amount: 6000 },
      recurringTemplateCount: 2,
      subscriptionCount: 1,
    },
  },
  reportComparisons: {
    expenseDelta: 520,
    incomeDelta: 1500,
    budgetDelta: 500,
  },
  transactions: [
    {
      id: "txn-1",
      transactionDate: "2026-04-21",
      title: "Groceries",
      type: "expense",
      accountName: "Cash",
      category: "Food",
      tags: [{ id: "tag-1", name: "school" }],
      amount: 1200,
      notes: "Rice, fruit, and milk",
      isRecurring: false,
    },
    {
      id: "txn-2",
      transactionDate: "2026-04-05",
      title: "Cash transfer",
      type: "transfer",
      transferRoute: "Bank -> Cash",
      category: "",
      tags: [],
      amount: 3500,
      notes: "",
      isRecurring: false,
    },
  ],
};

test("buildTransactionsCsv includes account routes and tag labels", () => {
  const csv = buildTransactionsCsv(samplePayload.transactions);

  assert.match(csv, /^date,title,type,accountRoute,category,tags,amount,notes,recurring/m);
  assert.match(csv, /Cash/);
  assert.match(csv, /Bank -> Cash/);
  assert.match(csv, /school/);
});

test("buildReportWorkbook includes transfer fields and updated sheets", () => {
  const workbook = buildReportWorkbook(samplePayload);

  assert.match(workbook, /<Worksheet ss:Name="Summary">/);
  assert.match(workbook, /<Worksheet ss:Name="Monthly Trend">/);
  assert.match(workbook, /Transfers/);
  assert.match(workbook, /Available funds/);
  assert.match(workbook, /Remaining budget/);
  assert.match(workbook, /Account Route/);
});

test("buildReportPdf includes the new finance report fields", () => {
  const pdf = buildReportPdf(samplePayload);
  const decoded = new TextDecoder().decode(pdf);

  assert.match(decoded, /^%PDF-1\.4/);
  assert.match(decoded, /Total transfers/);
  assert.match(decoded, /Available funds/);
  assert.match(decoded, /Remaining budget/);
  assert.match(decoded, /Budget status: On track/);
  assert.match(decoded, /Bank -> Cash/);
  assert.match(decoded, /Subscriptions/);
});
