const EMPTY_STORE_DATA = {
  users: [],
  transactions: [],
  budgets: [],
  recurringTemplates: [],
};

export const DEFAULT_CATEGORIES = [
  "Food",
  "Transport",
  "Bills",
  "School",
  "Allowance",
  "Health",
  "Shopping",
  "Savings",
  "Entertainment",
  "Other",
];

export const TRANSACTION_TYPES = ["expense", "income"];

function roundCurrency(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function getMonthKey(value) {
  return String(value || "").slice(0, 7);
}

function getLocalMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(month) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
  });
}

function compareMonths(left, right) {
  return left.localeCompare(right);
}

function getDaysInMonth(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

function getCategoryLabel(value) {
  const category = String(value || "").trim();
  return category || "Other";
}

function normalizeTransactionShape(transaction) {
  return {
    ...transaction,
    type: transaction?.type === "income" ? "income" : "expense",
    category: getCategoryLabel(transaction?.category),
    amount: roundCurrency(transaction?.amount),
  };
}

function resolveOccurrenceDate(startDate, month) {
  const day = Number(String(startDate).slice(8, 10)) || 1;
  const safeDay = String(Math.min(day, getDaysInMonth(month))).padStart(2, "0");
  return `${month}-${safeDay}`;
}

function buildRecurringTransactions(userId, month, storeData = EMPTY_STORE_DATA) {
  if (!month) {
    return [];
  }

  return storeData.recurringTemplates
    .filter((template) => {
      if (template.userId !== userId) {
        return false;
      }

      return compareMonths(getMonthKey(template.startDate), month) <= 0;
    })
    .map((template) => ({
      id: `recurring:${template.id}:${month}`,
      sourceId: template.id,
      userId,
      title: template.title,
      notes: template.notes || "",
      amount: roundCurrency(template.amount),
      type: template.type === "income" ? "income" : "expense",
      category: getCategoryLabel(template.category),
      transactionDate: resolveOccurrenceDate(template.startDate, month),
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      isRecurring: true,
      repeat: "monthly",
    }));
}

function applyTransactionFilters(items, { type = "", category = "", query = "" } = {}) {
  const normalizedType = type ? normalizeTransactionType(type) : "";
  const normalizedCategory = category ? getCategoryLabel(category) : "";
  const normalizedQuery = String(query || "").trim().toLowerCase();

  return items.filter((transaction) => {
    if (normalizedType && transaction.type !== normalizedType) {
      return false;
    }

    if (normalizedCategory && transaction.category !== normalizedCategory) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      transaction.title,
      transaction.notes,
      transaction.category,
      transaction.type,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

function getBudgetAmount(userId, month, storeData = EMPTY_STORE_DATA) {
  const budgetRecord =
    storeData.budgets.find(
      (budget) => budget.userId === userId && budget.month === month,
    ) || null;

  if (budgetRecord) {
    return {
      amount: roundCurrency(budgetRecord.amount),
      source: "month",
    };
  }

  return {
    amount: null,
    source: "unset",
  };
}

export function normalizeMonth(value) {
  const month = value || getLocalMonthKey();

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

export function toAmount(value, fieldName, { allowZero = false, allowEmpty = false } = {}) {
  if (allowEmpty && (value === "" || value === null || value === undefined)) {
    return null;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount) || (!allowZero && amount <= 0) || (allowZero && amount < 0)) {
    throw new Error(`${fieldName} must be a valid ${allowZero ? "non-negative" : "positive"} number.`);
  }

  return roundCurrency(amount);
}

export function normalizeTransactionType(value) {
  const type = String(value || "")
    .trim()
    .toLowerCase();

  if (!TRANSACTION_TYPES.includes(type)) {
    throw new Error("Transaction type must be expense or income.");
  }

  return type;
}

export function normalizeCategory(value) {
  const category = getCategoryLabel(value);

  if (category.length > 40) {
    throw new Error("Category must be 40 characters or fewer.");
  }

  return category;
}

export function normalizeSortOrder(value) {
  const sortOrder = String(value || "desc").trim().toLowerCase();

  if (!["asc", "desc"].includes(sortOrder)) {
    throw new Error("Sort order must be asc or desc.");
  }

  return sortOrder;
}

export function sortTransactions(items, { sortBy = "date", sortOrder = "desc" } = {}) {
  const normalizedSortBy = String(sortBy || "date").trim().toLowerCase();
  const normalizedSortOrder = normalizeSortOrder(sortOrder);
  const direction = normalizedSortOrder === "asc" ? 1 : -1;

  return [...items].sort((left, right) => {
    let comparison = 0;

    if (normalizedSortBy === "amount") {
      comparison = Number(left.amount) - Number(right.amount);
    } else if (normalizedSortBy === "title") {
      comparison = String(left.title || "").localeCompare(String(right.title || ""));
    } else {
      const leftDate = new Date(left.transactionDate).getTime();
      const rightDate = new Date(right.transactionDate).getTime();
      comparison = leftDate - rightDate;

      if (comparison === 0) {
        comparison =
          new Date(left.updatedAt || left.createdAt).getTime() -
          new Date(right.updatedAt || right.createdAt).getTime();
      }
    }

    if (comparison === 0) {
      comparison = String(left.id || "").localeCompare(String(right.id || ""));
    }

    return comparison * direction;
  });
}

export function getUserTransactions(userId, filters = {}, storeData = EMPTY_STORE_DATA) {
  const month = filters.month ? normalizeMonth(filters.month) : "";
  const includeRecurring = filters.includeRecurring !== false;
  const startDate = filters.startDate ? normalizeDate(filters.startDate) : "";
  const endDate = filters.endDate ? normalizeDate(filters.endDate) : "";
  const sortBy = filters.sortBy ? String(filters.sortBy).trim().toLowerCase() : "date";
  const sortOrder = filters.sortOrder ? normalizeSortOrder(filters.sortOrder) : "desc";
  function isInRequestedRange(transaction) {
    if (month && !transaction.transactionDate.startsWith(month)) {
      return false;
    }

    if (startDate && transaction.transactionDate < startDate) {
      return false;
    }

    if (endDate && transaction.transactionDate > endDate) {
      return false;
    }

    return true;
  }

  const baseTransactions = storeData.transactions
    .filter((transaction) => transaction.userId === userId && isInRequestedRange(transaction))
    .map(normalizeTransactionShape);

  const recurringTransactions =
    includeRecurring && month
      ? buildRecurringTransactions(userId, month, storeData).filter(isInRequestedRange)
      : [];

  return sortTransactions(applyTransactionFilters([...baseTransactions, ...recurringTransactions], filters), {
    sortBy,
    sortOrder,
  });
}

export function getMonthlySummary(userId, month, storeData = EMPTY_STORE_DATA) {
  const normalizedMonth = normalizeMonth(month);
  const transactions = getUserTransactions(
    userId,
    { month: normalizedMonth, includeRecurring: true },
    storeData,
  );
  const { amount: budget, source: budgetSource } = getBudgetAmount(
    userId,
    normalizedMonth,
    storeData,
  );

  const totals = transactions.reduce(
    (summary, transaction) => {
      if (transaction.type === "income") {
        summary.totalIncome += Number(transaction.amount);
      } else {
        summary.totalExpenses += Number(transaction.amount);
      }

      return summary;
    },
    {
      totalIncome: 0,
      totalExpenses: 0,
    },
  );

  const roundedIncome = roundCurrency(totals.totalIncome);
  const roundedExpenses = roundCurrency(totals.totalExpenses);
  const netBalance = roundCurrency(roundedIncome - roundedExpenses);
  const summary = {
    month: normalizedMonth,
    totalExpenses: roundedExpenses,
    totalIncome: roundedIncome,
    netBalance,
    budget,
    budgetSource,
    availableFunds: null,
    budgetRemaining: null,
    transactionCount: transactions.length,
    statusType: "unset",
    statusAmount: null,
  };

  if (budget !== null) {
    const availableFunds = roundCurrency(budget + roundedIncome);
    const statusAmount = roundCurrency(availableFunds - roundedExpenses);
    summary.availableFunds = availableFunds;
    summary.budgetRemaining = statusAmount;
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

export function getRecurringTemplates(userId, storeData = EMPTY_STORE_DATA) {
  return [...storeData.recurringTemplates]
    .filter((template) => template.userId === userId)
    .map((template) => ({
      ...template,
      type: template.type === "income" ? "income" : "expense",
      category: getCategoryLabel(template.category),
      repeat: "monthly",
    }))
    .sort((left, right) => left.startDate.localeCompare(right.startDate));
}

export function getReports(userId, month, storeData = EMPTY_STORE_DATA, months = 6) {
  const normalizedMonth = normalizeMonth(month);
  const safeMonths = Math.max(3, Math.min(Number(months) || 6, 12));
  const selectedTransactions = getUserTransactions(
    userId,
    { month: normalizedMonth, includeRecurring: true },
    storeData,
  );
  const categoryMap = new Map();

  for (const transaction of selectedTransactions) {
    const key = `${transaction.type}:${transaction.category}`;
    const current =
      categoryMap.get(key) || {
        type: transaction.type,
        category: transaction.category,
        amount: 0,
      };

    current.amount = roundCurrency(current.amount + Number(transaction.amount));
    categoryMap.set(key, current);
  }

  const categoryBreakdown = [...categoryMap.values()].sort(
    (left, right) => right.amount - left.amount,
  );

  const monthlyTrend = [];

  for (let index = safeMonths - 1; index >= 0; index -= 1) {
    const cursor = new Date(`${normalizedMonth}-01T00:00:00`);
    cursor.setMonth(cursor.getMonth() - index);
    const trendMonth = getLocalMonthKey(cursor);
    const summary = getMonthlySummary(userId, trendMonth, storeData);

    monthlyTrend.push({
      month: trendMonth,
      label: getMonthLabel(trendMonth),
      totalExpenses: summary.totalExpenses,
      totalIncome: summary.totalIncome,
      netBalance: summary.netBalance,
      budget: summary.budget,
    });
  }

  const largestExpense =
    selectedTransactions
      .filter((transaction) => transaction.type === "expense")
      .sort((left, right) => right.amount - left.amount)[0] || null;
  const largestIncome =
    selectedTransactions
      .filter((transaction) => transaction.type === "income")
      .sort((left, right) => right.amount - left.amount)[0] || null;
  const topExpenseCategory =
    categoryBreakdown.find((item) => item.type === "expense") || null;

  return {
    summary: getMonthlySummary(userId, normalizedMonth, storeData),
    monthlyTrend,
    categoryBreakdown,
    highlights: {
      largestExpense,
      largestIncome,
      topExpenseCategory,
      recurringTemplateCount: getRecurringTemplates(userId, storeData).length,
    },
  };
}
