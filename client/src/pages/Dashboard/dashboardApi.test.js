import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTransactionsQuery,
  getBudgetSubmissionDetails,
  loadDashboardWorkspace,
  loadDashboardTransactions,
  loadDashboardSupportData,
  loadDashboardMutationData,
} from "./dashboardApi.js";

function createApiStub() {
  return {
    async getDashboard(month) {
      return {
        summary: {
          month,
          budget: 1200,
        },
      };
    },
    async getReports(month) {
      return {
        summary: { month },
        monthlyTrend: [],
      };
    },
    async getTransactions(query) {
      return {
        transactions: [{ id: "txn-1", title: query.query || "Lunch" }],
      };
    },
    async getSettings() {
      return {
        user: {
          id: "user-1",
          name: "Dashboard User",
          email: "dashboard@example.com",
          preferences: {
            preferredTheme: "light",
            defaultBudget: 1200,
          },
        },
      };
    },
    async getRecurringTemplates() {
      return {
        templates: [{ id: "rec-1", title: "Internet" }],
      };
    },
  };
}

test("buildTransactionsQuery keeps recurring transactions enabled", () => {
  assert.deepEqual(
    buildTransactionsQuery("2026-04", {
      query: "coffee",
      sortBy: "amount",
      sortOrder: "asc",
    }),
    {
      month: "2026-04",
      type: "",
      category: "",
      query: "coffee",
      startDate: "",
      endDate: "",
      sortBy: "amount",
      sortOrder: "asc",
      includeRecurring: "true",
    },
  );
});

test("getBudgetSubmissionDetails switches to edit when a budget already exists", () => {
  assert.deepEqual(
    getBudgetSubmissionDetails({ budget: 500 }, "Apr 2026"),
    {
      monthlyBudgetLocked: true,
      mode: "edit",
      successMessage: "Budget updated for Apr 2026.",
    },
  );
});

test("dashboard api helpers normalize workspace, transactions, and support data", async () => {
  const api = createApiStub();

  const workspace = await loadDashboardWorkspace(api, "2026-04");
  assert.equal(workspace.summary.month, "2026-04");
  assert.equal(workspace.budgetAmount, "1200");
  assert.equal(workspace.budgetTopUpAmount, "");

  const transactions = await loadDashboardTransactions(api, "2026-04", {
    query: "coffee",
  });
  assert.deepEqual(transactions, [{ id: "txn-1", title: "coffee" }]);

  const support = await loadDashboardSupportData(api);
  assert.equal(support.settings.user.email, "dashboard@example.com");
  assert.equal(support.recurringTemplates.length, 1);

  const combined = await loadDashboardMutationData(api, "2026-04", { query: "coffee" });
  assert.equal(combined.summary.month, "2026-04");
  assert.equal(combined.transactions.length, 1);
  assert.equal(combined.recurringTemplates.length, 1);
});
