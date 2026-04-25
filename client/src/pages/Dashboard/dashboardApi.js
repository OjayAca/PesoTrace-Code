export function buildTransactionsQuery(month, filters = {}) {
  return {
    month,
    type: filters.type || "",
    category: filters.category || "",
    query: filters.query || "",
    startDate: filters.startDate || "",
    endDate: filters.endDate || "",
    sortBy: filters.sortBy || "",
    sortOrder: filters.sortOrder || "",
    includeRecurring: "true",
  };
}

export function getBudgetSubmissionDetails(summary, monthLabel) {
  const hasMonthBudget = summary?.budget !== null && summary?.budget !== undefined;

  return {
    monthlyBudgetLocked: hasMonthBudget,
    mode: hasMonthBudget ? "edit" : "set",
    successMessage: hasMonthBudget
      ? `Budget updated for ${monthLabel}.`
      : `Budget saved for ${monthLabel}.`,
  };
}

export async function loadDashboardWorkspace(apiClient, month) {
  const [dashboardResponse, reportResponse] = await Promise.all([
    apiClient.getDashboard(month),
    apiClient.getReports(month),
  ]);

  return {
    summary: dashboardResponse.summary,
    reports: reportResponse,
    budgetAmount:
      dashboardResponse.summary?.budget === null || dashboardResponse.summary?.budget === undefined
        ? ""
        : String(dashboardResponse.summary.budget),
    budgetTopUpAmount: "",
  };
}

export async function loadDashboardTransactions(apiClient, month, filters) {
  const response = await apiClient.getTransactions(buildTransactionsQuery(month, filters));
  return response.transactions || [];
}

export async function loadDashboardSupportData(apiClient) {
  const [settingsResponse, recurringResponse] = await Promise.all([
    apiClient.getSettings(),
    apiClient.getRecurringTemplates(),
  ]);

  return {
    settings: settingsResponse,
    recurringTemplates: recurringResponse.templates || [],
  };
}

export async function loadDashboardMutationData(apiClient, month, filters) {
  const [workspace, transactions, support] = await Promise.all([
    loadDashboardWorkspace(apiClient, month),
    loadDashboardTransactions(apiClient, month, filters),
    loadDashboardSupportData(apiClient),
  ]);

  return {
    ...workspace,
    transactions,
    ...support,
  };
}
