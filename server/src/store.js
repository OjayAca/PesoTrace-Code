import {
  getUserTransactions as getComputedUserTransactions,
  getRecurringTemplates as getComputedRecurringTemplates,
  getMonthlySummary as getComputedMonthlySummary,
  getReports as getComputedReports,
  normalizeCategory,
  normalizeDate,
  normalizeMonth,
  normalizeSortOrder,
  normalizeTransactionType,
} from "./finance.js";

const DEFAULT_DATA = {
  users: [],
  transactions: [],
  budgets: [],
  recurringTemplates: [],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function roundCurrency(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function createDuplicateEntryError(message) {
  const error = new Error(message);
  error.code = "ER_DUP_ENTRY";
  return error;
}

function createForeignKeyError(message) {
  const error = new Error(message);
  error.code = "ER_NO_REFERENCED_ROW_2";
  return error;
}

function createBudgetConflictError(message) {
  const error = new Error(message);
  error.code = "BUDGET_EXISTS";
  return error;
}

function ensureUserExists(data, userId) {
  const user = data.users.find((entry) => entry.id === userId) || null;

  if (!user) {
    throw createForeignKeyError("User account no longer exists.");
  }

  return user;
}

function ensureUniqueUserEmail(data, email, currentUserId = "") {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const existingUser =
    data.users.find(
      (entry) => entry.email === normalizedEmail && entry.id !== currentUserId,
    ) || null;

  if (existingUser) {
    throw createDuplicateEntryError("That email is already registered.");
  }

  return normalizedEmail;
}

function createUserScopedSnapshot(data, userId) {
  const user = data.users.find((entry) => entry.id === userId) || null;

  return normalizeStoreData({
    users: user ? [user] : [],
    transactions: data.transactions.filter((entry) => entry.userId === userId),
    budgets: data.budgets.filter((entry) => entry.userId === userId),
    recurringTemplates: data.recurringTemplates.filter((entry) => entry.userId === userId),
  });
}

function getMonthDateRange(month) {
  if (!month) {
    return {
      startDate: "",
      endDate: "",
    };
  }

  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();

  return {
    startDate: `${month}-01`,
    endDate: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

function getMonthLabel(month) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
  });
}

function getReportMonths(month, count) {
  const months = [];

  for (let index = count - 1; index >= 0; index -= 1) {
    const cursor = new Date(`${month}-01T00:00:00`);
    cursor.setMonth(cursor.getMonth() - index);
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
  }

  return months;
}

function buildMonthlySummary(month, totals = {}, budgetInfo = {}) {
  const roundedIncome = roundCurrency(totals.totalIncome);
  const roundedExpenses = roundCurrency(totals.totalExpenses);
  const budget =
    budgetInfo.amount === null || budgetInfo.amount === undefined
      ? null
      : roundCurrency(budgetInfo.amount);
  const summary = {
    month,
    totalExpenses: roundedExpenses,
    totalIncome: roundedIncome,
    netBalance: roundCurrency(roundedIncome - roundedExpenses),
    budget,
    budgetSource: budgetInfo.source || "unset",
    transactionCount: Number(totals.transactionCount || 0),
    statusType: "unset",
    statusAmount: null,
  };

  if (budget !== null) {
    const statusAmount = roundCurrency(budget - roundedExpenses);
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

function normalizeReportEntryFromRow(row) {
  if (!row) {
    return null;
  }

  const entry = {
    id: String(row.id || ""),
    userId: String(row.userId || ""),
    title: String(row.title || "").trim(),
    notes: String(row.notes || ""),
    amount: roundCurrency(row.amount),
    type: row.type === "income" ? "income" : "expense",
    category: String(row.category || "Other").trim() || "Other",
    transactionDate: String(row.transactionDate || "").slice(0, 10),
    createdAt: toIsoDateTime(row.createdAt),
    updatedAt: toIsoDateTime(row.updatedAt),
  };

  if (row.sourceId) {
    entry.sourceId = String(row.sourceId);
  }

  if (Number(row.isRecurring || 0) === 1 || row.isRecurring === true) {
    entry.isRecurring = true;
    entry.repeat = "monthly";
  }

  return entry;
}

function normalizeTransactionFilters(filters = {}) {
  const month = filters.month ? normalizeMonth(filters.month) : "";
  const type = filters.type ? normalizeTransactionType(filters.type) : "";
  const category = filters.category ? normalizeCategory(filters.category) : "";
  const query = String(filters.query || "").trim();
  const startDate = filters.startDate ? normalizeDate(filters.startDate) : "";
  const endDate = filters.endDate ? normalizeDate(filters.endDate) : "";
  const sortBy = String(filters.sortBy || "date").trim().toLowerCase() || "date";
  const sortOrder = normalizeSortOrder(filters.sortOrder || "desc");
  const includeRecurring = filters.includeRecurring !== false;

  return {
    month,
    type,
    category,
    query,
    startDate,
    endDate,
    sortBy,
    sortOrder,
    includeRecurring,
  };
}

function toIsoDateTime(value) {
  if (!value) {
    return "";
  }

  const normalized = String(value).trim().replace(" ", "T");

  if (normalized.endsWith("Z")) {
    if (/\.\d{6}Z$/.test(normalized)) {
      return `${normalized.slice(0, -4)}Z`;
    }

    if (/\.\d{3}Z$/.test(normalized)) {
      return normalized;
    }

    return normalized.replace("Z", ".000Z");
  }

  if (/\.\d{6}$/.test(normalized)) {
    return `${normalized.slice(0, -3)}Z`;
  }

  if (/\.\d{3}$/.test(normalized)) {
    return `${normalized}Z`;
  }

  return `${normalized}.000Z`;
}

function toMySqlDateTime(value) {
  if (!value) {
    return null;
  }

  return String(value).trim().replace("T", " ").replace(/Z$/, "");
}

function normalizeUser(user) {
  return {
    id: String(user?.id || ""),
    name: String(user?.name || "").trim(),
    email: String(user?.email || "").trim().toLowerCase(),
    passwordHash: String(user?.passwordHash || ""),
    createdAt: toIsoDateTime(user?.createdAt),
    preferences: {
      preferredTheme: user?.preferences?.preferredTheme === "dark" ? "dark" : "light",
      defaultBudget: toNumberOrNull(user?.preferences?.defaultBudget),
      currency: String(user?.preferences?.currency || "PHP").trim() || "PHP",
    },
  };
}

function normalizeTransaction(transaction) {
  return {
    id: String(transaction?.id || ""),
    userId: String(transaction?.userId || ""),
    title: String(transaction?.title || "").trim(),
    notes: String(transaction?.notes || ""),
    amount: Number(transaction?.amount || 0),
    transactionDate: String(transaction?.transactionDate || "").slice(0, 10),
    createdAt: toIsoDateTime(transaction?.createdAt),
    updatedAt: toIsoDateTime(transaction?.updatedAt),
    type: transaction?.type === "income" ? "income" : "expense",
    category: String(transaction?.category || "Other").trim() || "Other",
  };
}

function normalizeBudget(budget) {
  return {
    id: String(budget?.id || ""),
    userId: String(budget?.userId || ""),
    month: String(budget?.month || "").slice(0, 7),
    amount: Number(budget?.amount || 0),
    createdAt: toIsoDateTime(budget?.createdAt),
    updatedAt: toIsoDateTime(budget?.updatedAt),
  };
}

function normalizeRecurringTemplate(template) {
  return {
    id: String(template?.id || ""),
    userId: String(template?.userId || ""),
    title: String(template?.title || "").trim(),
    notes: String(template?.notes || ""),
    amount: Number(template?.amount || 0),
    startDate: String(template?.startDate || "").slice(0, 10),
    type: template?.type === "income" ? "income" : "expense",
    category: String(template?.category || "Other").trim() || "Other",
    repeat: "monthly",
    createdAt: toIsoDateTime(template?.createdAt),
    updatedAt: toIsoDateTime(template?.updatedAt),
  };
}

export function normalizeStoreData(data = {}) {
  return {
    users: Array.isArray(data.users) ? data.users.map(normalizeUser) : [],
    transactions: Array.isArray(data.transactions)
      ? data.transactions.map(normalizeTransaction)
      : [],
    budgets: Array.isArray(data.budgets) ? data.budgets.map(normalizeBudget) : [],
    recurringTemplates: Array.isArray(data.recurringTemplates)
      ? data.recurringTemplates.map(normalizeRecurringTemplate)
      : [],
  };
}

function createSnapshot(data) {
  return normalizeStoreData(clone(data));
}

function normalizeUserFromRow(row) {
  if (!row) {
    return null;
  }

  return normalizeUser({
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt,
    preferences: {
      preferredTheme: row.preferredTheme,
      defaultBudget: row.defaultBudget,
      currency: row.currency,
    },
  });
}

function normalizeTransactionFromRow(row) {
  return normalizeTransaction(row);
}

function normalizeBudgetFromRow(row) {
  return normalizeBudget(row);
}

function normalizeRecurringTemplateFromRow(row) {
  return normalizeRecurringTemplate(row);
}

function normalizeUserOverviewFromRow(row) {
  const user = normalizeUserFromRow(row);

  if (!user) {
    return null;
  }

  return {
    user,
    stats: {
      transactionCount: Number(row.transactionCount || 0),
      budgetCount: Number(row.budgetCount || 0),
      recurringCount: Number(row.recurringCount || 0),
    },
  };
}

function getConnectionOptions(env = process.env) {
  const url = env.MYSQL_URL || env.DATABASE_URL || "";

  if (url) {
    return {
      uri: url,
    };
  }

  const host = env.MYSQL_HOST || "";
  const user = env.MYSQL_USER || "";
  const database = env.MYSQL_DATABASE || "";

  if (!host || !user || !database) {
    throw new Error(
      "MySQL configuration is missing. Set MYSQL_URL or MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DATABASE.",
    );
  }

  return {
    host,
    port: Number(env.MYSQL_PORT || 3306),
    user,
    password: env.MYSQL_PASSWORD || "",
    database,
  };
}

export function createMemoryStore(seedData = {}) {
  let data = normalizeStoreData({
    ...DEFAULT_DATA,
    ...seedData,
  });

  return {
    async init() {},
    async close() {},
    async runInTransaction(work) {
      const snapshot = clone(data);

      try {
        return await work();
      } catch (error) {
        data = normalizeStoreData(snapshot);
        throw error;
      }
    },
    async getSnapshot() {
      return createSnapshot(data);
    },
    async getUserById(id) {
      const user = data.users.find((entry) => entry.id === id) || null;
      return user ? normalizeUser(clone(user)) : null;
    },
    async getUserByEmail(email) {
      const normalizedEmail = String(email || "").trim().toLowerCase();
      const user = data.users.find((entry) => entry.email === normalizedEmail) || null;
      return user ? normalizeUser(clone(user)) : null;
    },
    async createUser(user) {
      const nextUser = normalizeUser(user);

      ensureUniqueUserEmail(data, nextUser.email);
      data.users.push(nextUser);
      return normalizeUser(clone(nextUser));
    },
    async updateUserProfile(id, profile) {
      const user = data.users.find((entry) => entry.id === id) || null;

      if (!user) {
        return null;
      }

      const nextEmail = ensureUniqueUserEmail(data, profile.email, id);
      user.name = String(profile.name || "").trim();
      user.email = nextEmail;
      return normalizeUser(clone(user));
    },
    async updateUserPreferences(id, preferences) {
      const user = data.users.find((entry) => entry.id === id) || null;

      if (!user) {
        return null;
      }

      user.preferences = {
        preferredTheme: preferences.preferredTheme === "dark" ? "dark" : "light",
        defaultBudget: toNumberOrNull(preferences.defaultBudget),
        currency: String(preferences.currency || "PHP").trim() || "PHP",
      };

      return normalizeUser(clone(user));
    },
    async updateUserPassword(id, passwordHash) {
      const user = data.users.find((entry) => entry.id === id) || null;

      if (!user) {
        return false;
      }

      user.passwordHash = String(passwordHash || "");
      return true;
    },
    async createTransaction(transaction) {
      const nextTransaction = normalizeTransaction(transaction);

      ensureUserExists(data, nextTransaction.userId);
      data.transactions.push(nextTransaction);
      return normalizeTransaction(clone(nextTransaction));
    },
    async findTransaction(userId, id) {
      const transaction =
        data.transactions.find((entry) => entry.userId === userId && entry.id === id) || null;
      return transaction ? normalizeTransaction(clone(transaction)) : null;
    },
    async updateTransaction(userId, id, payload) {
      const transaction =
        data.transactions.find((entry) => entry.userId === userId && entry.id === id) || null;

      if (!transaction) {
        return null;
      }

      Object.assign(transaction, normalizeTransaction({ ...transaction, ...payload }));
      return normalizeTransaction(clone(transaction));
    },
    async deleteTransaction(userId, id) {
      const index = data.transactions.findIndex(
        (entry) => entry.userId === userId && entry.id === id,
      );

      if (index === -1) {
        return false;
      }

      data.transactions.splice(index, 1);
      return true;
    },
    async upsertBudget(budget) {
      const existing =
        data.budgets.find(
          (entry) => entry.userId === budget.userId && entry.month === budget.month,
        ) || null;

      ensureUserExists(data, budget.userId);

      if (existing) {
        existing.amount = Number(budget.amount);
        existing.updatedAt = toIsoDateTime(budget.updatedAt);
        return normalizeBudget(clone(existing));
      }

      const nextBudget = normalizeBudget(budget);
      data.budgets.push(nextBudget);
      return normalizeBudget(clone(nextBudget));
    },
    async getUserStats(userId) {
      return {
        transactionCount: data.transactions.filter((entry) => entry.userId === userId).length,
        budgetCount: data.budgets.filter((entry) => entry.userId === userId).length,
        recurringCount: data.recurringTemplates.filter((entry) => entry.userId === userId).length,
      };
    },
    async clearUserData(userId) {
      data.transactions = data.transactions.filter((entry) => entry.userId !== userId);
      data.budgets = data.budgets.filter((entry) => entry.userId !== userId);
      data.recurringTemplates = data.recurringTemplates.filter((entry) => entry.userId !== userId);
    },
    async createRecurringTemplate(template) {
      const nextTemplate = normalizeRecurringTemplate(template);

      ensureUserExists(data, nextTemplate.userId);
      data.recurringTemplates.push(nextTemplate);
      return normalizeRecurringTemplate(clone(nextTemplate));
    },
    async findRecurringTemplate(userId, id) {
      const template =
        data.recurringTemplates.find((entry) => entry.userId === userId && entry.id === id) ||
        null;
      return template ? normalizeRecurringTemplate(clone(template)) : null;
    },
    async updateRecurringTemplate(userId, id, payload) {
      const template =
        data.recurringTemplates.find((entry) => entry.userId === userId && entry.id === id) ||
        null;

      if (!template) {
        return null;
      }

      Object.assign(template, normalizeRecurringTemplate({ ...template, ...payload }));
      return normalizeRecurringTemplate(clone(template));
    },
    async deleteRecurringTemplate(userId, id) {
      const index = data.recurringTemplates.findIndex(
        (entry) => entry.userId === userId && entry.id === id,
      );

      if (index === -1) {
        return false;
      }

      data.recurringTemplates.splice(index, 1);
      return true;
    },
    async getUserOverview(userId) {
      const user = data.users.find((entry) => entry.id === userId) || null;

      if (!user) {
        return null;
      }

      return {
        user: normalizeUser(clone(user)),
        stats: {
          transactionCount: data.transactions.filter((entry) => entry.userId === userId).length,
          budgetCount: data.budgets.filter((entry) => entry.userId === userId).length,
          recurringCount: data.recurringTemplates.filter((entry) => entry.userId === userId).length,
        },
      };
    },
    async getUserFinanceSnapshot(userId) {
      return createUserScopedSnapshot(data, userId);
    },
    async listUserTransactions(userId, filters = {}) {
      const snapshot = createUserScopedSnapshot(data, userId);
      return getComputedUserTransactions(userId, normalizeTransactionFilters(filters), snapshot);
    },
    async getUserRecurringTemplates(userId) {
      const snapshot = createUserScopedSnapshot(data, userId);
      return getComputedRecurringTemplates(userId, snapshot);
    },
    async getMonthlySummary(userId, month) {
      const snapshot = createUserScopedSnapshot(data, userId);
      return getComputedMonthlySummary(userId, month, snapshot);
    },
    async getReports(userId, month, months = 6) {
      const snapshot = createUserScopedSnapshot(data, userId);
      return getComputedReports(userId, month, snapshot, months);
    },
    async saveBudget({ id, userId, month, amount, mode, createdAt, updatedAt }) {
      const user = ensureUserExists(data, userId);
      const normalizedAmount = roundCurrency(amount);
      const existing =
        data.budgets.find((entry) => entry.userId === userId && entry.month === month) || null;

      if (mode === "set" && existing) {
        throw createBudgetConflictError(
          "This month's budget is already set. Use Edit budget to change it or Add to budget to increase it.",
        );
      }

      if (mode === "add") {
        const defaultBudget = toNumberOrNull(user.preferences?.defaultBudget);
        const baseAmount = existing ? Number(existing.amount) : Number(defaultBudget || 0);
        const nextAmount = roundCurrency(baseAmount + normalizedAmount);

        if (existing) {
          existing.amount = nextAmount;
          existing.updatedAt = toIsoDateTime(updatedAt);
          return normalizeBudget(clone(existing));
        }

        const nextBudget = normalizeBudget({
          id,
          userId,
          month,
          amount: nextAmount,
          createdAt,
          updatedAt,
        });
        data.budgets.push(nextBudget);
        return normalizeBudget(clone(nextBudget));
      }

      if (existing) {
        existing.amount = normalizedAmount;
        existing.updatedAt = toIsoDateTime(updatedAt);
        return normalizeBudget(clone(existing));
      }

      const nextBudget = normalizeBudget({
        id,
        userId,
        month,
        amount: normalizedAmount,
        createdAt,
        updatedAt,
      });
      data.budgets.push(nextBudget);
      return normalizeBudget(clone(nextBudget));
    },
  };
}

export function createMySqlStore(env = process.env) {
  const options = getConnectionOptions(env);
  let poolPromise = null;

  async function getPool() {
    if (!poolPromise) {
      poolPromise = import("mysql2/promise").then(({ default: mysql }) =>
        options.uri
          ? mysql.createPool({
              uri: options.uri,
              waitForConnections: true,
              connectionLimit: Number(env.MYSQL_CONNECTION_LIMIT || 10),
              queueLimit: 0,
              connectTimeout: Number(env.MYSQL_CONNECT_TIMEOUT || 5000),
              timezone: "Z",
              dateStrings: true,
            })
          : mysql.createPool({
              ...options,
              waitForConnections: true,
              connectionLimit: Number(env.MYSQL_CONNECTION_LIMIT || 10),
              queueLimit: 0,
              connectTimeout: Number(env.MYSQL_CONNECT_TIMEOUT || 5000),
              timezone: "Z",
              dateStrings: true,
            }),
      );
    }

    return poolPromise;
  }

  async function getOne(sql, values = [], mapper = (row) => row) {
    const pool = await getPool();
    const [rows] = await pool.execute(sql, values);
    return rows[0] ? mapper(rows[0]) : null;
  }

  async function getOneWithExecutor(executor, sql, values = [], mapper = (row) => row) {
    const [rows] = await executor.execute(sql, values);
    return rows[0] ? mapper(rows[0]) : null;
  }

  async function runInTransaction(work) {
    const pool = await getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async function getSnapshot() {
    const pool = await getPool();
    const [users, transactions, budgets, recurringTemplates] = await Promise.all([
      pool.query(
        `SELECT id, name, email, password_hash AS passwordHash, preferred_theme AS preferredTheme,
                default_budget AS defaultBudget, currency, created_at AS createdAt
         FROM users
         ORDER BY created_at ASC, id ASC`,
      ),
      pool.query(
        `SELECT id, user_id AS userId, title, notes, amount, transaction_date AS transactionDate,
                created_at AS createdAt, updated_at AS updatedAt, type, category
         FROM transactions
         ORDER BY transaction_date DESC, updated_at DESC, id DESC`,
      ),
      pool.query(
        `SELECT id, user_id AS userId, month_key AS month, amount, created_at AS createdAt,
                updated_at AS updatedAt
         FROM budgets
         ORDER BY month_key DESC, id DESC`,
      ),
      pool.query(
        `SELECT id, user_id AS userId, title, notes, amount, start_date AS startDate,
                type, category, created_at AS createdAt,
                updated_at AS updatedAt
         FROM recurring_templates
         ORDER BY start_date ASC, id ASC`,
      ),
    ]);

    return normalizeStoreData({
      users: users[0].map(normalizeUserFromRow),
      transactions: transactions[0].map(normalizeTransactionFromRow),
      budgets: budgets[0].map(normalizeBudgetFromRow),
      recurringTemplates: recurringTemplates[0].map(normalizeRecurringTemplateFromRow),
    });
  }

  async function getUserFinanceSnapshot(userId) {
    const pool = await getPool();
    const [users, transactions, budgets, recurringTemplates] = await Promise.all([
      pool.query(
        `SELECT id, name, email, password_hash AS passwordHash, preferred_theme AS preferredTheme,
                default_budget AS defaultBudget, currency, created_at AS createdAt
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [userId],
      ),
      pool.query(
        `SELECT id, user_id AS userId, title, notes, amount, transaction_date AS transactionDate,
                created_at AS createdAt, updated_at AS updatedAt, type, category
         FROM transactions
         WHERE user_id = ?
         ORDER BY transaction_date DESC, updated_at DESC, id DESC`,
        [userId],
      ),
      pool.query(
        `SELECT id, user_id AS userId, month_key AS month, amount, created_at AS createdAt,
                updated_at AS updatedAt
         FROM budgets
         WHERE user_id = ?
         ORDER BY month_key DESC, id DESC`,
        [userId],
      ),
      pool.query(
        `SELECT id, user_id AS userId, title, notes, amount, start_date AS startDate,
                type, category, created_at AS createdAt,
                updated_at AS updatedAt
         FROM recurring_templates
         WHERE user_id = ?
         ORDER BY start_date ASC, id ASC`,
        [userId],
      ),
    ]);

    return normalizeStoreData({
      users: users[0].map(normalizeUserFromRow),
      transactions: transactions[0].map(normalizeTransactionFromRow),
      budgets: budgets[0].map(normalizeBudgetFromRow),
      recurringTemplates: recurringTemplates[0].map(normalizeRecurringTemplateFromRow),
    });
  }

  async function listUserTransactions(userId, filters = {}) {
    const normalizedFilters = normalizeTransactionFilters(filters);
    const rangeFromMonth = getMonthDateRange(normalizedFilters.month);
    const startDateCandidates = [
      normalizedFilters.startDate,
      rangeFromMonth.startDate,
    ].filter(Boolean);
    const endDateCandidates = [
      normalizedFilters.endDate,
      rangeFromMonth.endDate,
    ].filter(Boolean);
    const effectiveStartDate = startDateCandidates.length
      ? startDateCandidates.sort()[startDateCandidates.length - 1]
      : "";
    const effectiveEndDate = endDateCandidates.length ? endDateCandidates.sort()[0] : "";
    const conditions = ["user_id = ?"];
    const values = [userId];

    if (effectiveStartDate) {
      conditions.push("transaction_date >= ?");
      values.push(effectiveStartDate);
    }

    if (effectiveEndDate) {
      conditions.push("transaction_date <= ?");
      values.push(effectiveEndDate);
    }

    if (normalizedFilters.type) {
      conditions.push("type = ?");
      values.push(normalizedFilters.type);
    }

    if (normalizedFilters.category) {
      conditions.push("category = ?");
      values.push(normalizedFilters.category);
    }

    if (normalizedFilters.query) {
      conditions.push("LOWER(CONCAT_WS(' ', title, notes, category, type)) LIKE ?");
      values.push(`%${normalizedFilters.query.toLowerCase()}%`);
    }

    const sortColumns = {
      amount: "amount",
      title: "title",
      date: "transaction_date",
    };
    const sortBy = sortColumns[normalizedFilters.sortBy] || "transaction_date";
    const sortDirection = normalizedFilters.sortOrder === "asc" ? "ASC" : "DESC";
    const pool = await getPool();
    const [transactions, recurringTemplates] = await Promise.all([
      pool.query(
        `SELECT id, user_id AS userId, title, notes, amount, transaction_date AS transactionDate,
                created_at AS createdAt, updated_at AS updatedAt, type, category
         FROM transactions
         WHERE ${conditions.join(" AND ")}
         ORDER BY ${sortBy} ${sortDirection}, updated_at ${sortDirection}, id ${sortDirection}`,
        values,
      ),
      normalizedFilters.includeRecurring && normalizedFilters.month
        ? pool.query(
            `SELECT id, user_id AS userId, title, notes, amount, start_date AS startDate,
                    type, category, created_at AS createdAt, updated_at AS updatedAt
             FROM recurring_templates
             WHERE user_id = ?
               AND start_date <= LAST_DAY(CONCAT(?, '-01'))
             ORDER BY start_date ASC, id ASC`,
            [userId, normalizedFilters.month],
          )
        : Promise.resolve([[]]),
    ]);

    return getComputedUserTransactions(userId, normalizedFilters, {
      users: [],
      transactions: transactions[0].map(normalizeTransactionFromRow),
      budgets: [],
      recurringTemplates: recurringTemplates[0].map(normalizeRecurringTemplateFromRow),
    });
  }

  async function getUserRecurringTemplates(userId) {
    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT id, user_id AS userId, title, notes, amount, start_date AS startDate,
              type, category, created_at AS createdAt, updated_at AS updatedAt
       FROM recurring_templates
       WHERE user_id = ?
       ORDER BY start_date ASC, id ASC`,
      [userId],
    );

    return getComputedRecurringTemplates(userId, {
      users: [],
      transactions: [],
      budgets: [],
      recurringTemplates: rows.map(normalizeRecurringTemplateFromRow),
    });
  }

  async function getBudgetForMonth(userId, month, executor = null) {
    const db = executor || (await getPool());
    const row = await getOneWithExecutor(
      db,
      `SELECT
         b.amount AS monthBudget,
         u.default_budget AS defaultBudget
       FROM users u
       LEFT JOIN budgets b
         ON b.user_id = u.id
        AND b.month_key = ?
       WHERE u.id = ?
       LIMIT 1`,
      [month, userId],
    );

    if (row?.monthBudget !== null && row?.monthBudget !== undefined) {
      return {
        amount: roundCurrency(row.monthBudget),
        source: "month",
      };
    }

    if (row?.defaultBudget !== null && row?.defaultBudget !== undefined) {
      return {
        amount: roundCurrency(row.defaultBudget),
        source: "default",
      };
    }

    return {
      amount: null,
      source: "unset",
    };
  }

  async function getMonthlyTotals(userId, month, executor = null) {
    const db = executor || (await getPool());
    const { startDate, endDate } = getMonthDateRange(month);
    const row = await getOneWithExecutor(
      db,
      `SELECT
         COALESCE(SUM(CASE WHEN activity.type = 'income' THEN activity.amount ELSE 0 END), 0) AS totalIncome,
         COALESCE(SUM(CASE WHEN activity.type = 'expense' THEN activity.amount ELSE 0 END), 0) AS totalExpenses,
         COUNT(*) AS transactionCount
       FROM (
         SELECT amount, type
         FROM transactions
         WHERE user_id = ?
           AND transaction_date >= ?
           AND transaction_date <= ?
         UNION ALL
         SELECT amount, type
         FROM recurring_templates
         WHERE user_id = ?
           AND start_date <= LAST_DAY(CONCAT(?, '-01'))
       ) activity`,
      [userId, startDate, endDate, userId, month],
    );

    return {
      totalIncome: roundCurrency(row?.totalIncome),
      totalExpenses: roundCurrency(row?.totalExpenses),
      transactionCount: Number(row?.transactionCount || 0),
    };
  }

  async function getMonthlySummary(userId, month, executor = null) {
    const normalizedMonth = normalizeMonth(month);
    const [totals, budgetInfo] = await Promise.all([
      getMonthlyTotals(userId, normalizedMonth, executor),
      getBudgetForMonth(userId, normalizedMonth, executor),
    ]);

    return buildMonthlySummary(normalizedMonth, totals, budgetInfo);
  }

  async function getCategoryBreakdown(userId, month) {
    const pool = await getPool();
    const { startDate, endDate } = getMonthDateRange(month);
    const [rows] = await pool.execute(
      `SELECT
         activity.type AS type,
         activity.category AS category,
         ROUND(SUM(activity.amount), 2) AS amount
       FROM (
         SELECT amount, type, category
         FROM transactions
         WHERE user_id = ?
           AND transaction_date >= ?
           AND transaction_date <= ?
         UNION ALL
         SELECT amount, type, category
         FROM recurring_templates
         WHERE user_id = ?
           AND start_date <= LAST_DAY(CONCAT(?, '-01'))
       ) activity
       GROUP BY activity.type, activity.category
       ORDER BY amount DESC, activity.type ASC, activity.category ASC`,
      [userId, startDate, endDate, userId, month],
    );

    return rows.map((row) => ({
      type: row.type === "income" ? "income" : "expense",
      category: String(row.category || "Other").trim() || "Other",
      amount: roundCurrency(row.amount),
    }));
  }

  async function getLargestReportEntry(userId, month, type) {
    const pool = await getPool();
    const { startDate, endDate } = getMonthDateRange(month);

    return getOneWithExecutor(
      pool,
      `SELECT
         activity.id,
         activity.sourceId,
         activity.userId,
         activity.title,
         activity.notes,
         activity.amount,
         activity.type,
         activity.category,
         activity.transactionDate,
         activity.createdAt,
         activity.updatedAt,
         activity.isRecurring
       FROM (
         SELECT
           t.id AS id,
           NULL AS sourceId,
           t.user_id AS userId,
           t.title AS title,
           t.notes AS notes,
           t.amount AS amount,
           t.type AS type,
           t.category AS category,
           t.transaction_date AS transactionDate,
           t.created_at AS createdAt,
           t.updated_at AS updatedAt,
           0 AS isRecurring
         FROM transactions t
         WHERE t.user_id = ?
           AND t.transaction_date >= ?
           AND t.transaction_date <= ?
         UNION ALL
         SELECT
           CONCAT('recurring:', rt.id, ':', ?) AS id,
           rt.id AS sourceId,
           rt.user_id AS userId,
           rt.title AS title,
           rt.notes AS notes,
           rt.amount AS amount,
           rt.type AS type,
           rt.category AS category,
           CONCAT(
             ?,
             '-',
             LPAD(LEAST(DAY(rt.start_date), DAY(LAST_DAY(CONCAT(?, '-01')))), 2, '0')
           ) AS transactionDate,
           rt.created_at AS createdAt,
           rt.updated_at AS updatedAt,
           1 AS isRecurring
         FROM recurring_templates rt
         WHERE rt.user_id = ?
           AND rt.start_date <= LAST_DAY(CONCAT(?, '-01'))
       ) activity
       WHERE activity.type = ?
       ORDER BY activity.amount DESC, activity.transactionDate DESC, activity.updatedAt DESC, activity.id DESC
       LIMIT 1`,
      [userId, startDate, endDate, month, month, month, userId, month, type],
      normalizeReportEntryFromRow,
    );
  }

  async function getRecurringTemplateCount(userId) {
    const pool = await getPool();
    const row = await getOneWithExecutor(
      pool,
      `SELECT COUNT(*) AS recurringTemplateCount
       FROM recurring_templates
       WHERE user_id = ?`,
      [userId],
    );

    return Number(row?.recurringTemplateCount || 0);
  }

  async function getReports(userId, month, months = 6) {
    const normalizedMonth = normalizeMonth(month);
    const safeMonths = Math.max(3, Math.min(Number(months) || 6, 12));
    const trendMonths = getReportMonths(normalizedMonth, safeMonths);
    const summaryPromise = getMonthlySummary(userId, normalizedMonth);
    const [summary, categoryBreakdown, largestExpense, largestIncome, recurringTemplateCount] =
      await Promise.all([
        summaryPromise,
        getCategoryBreakdown(userId, normalizedMonth),
        getLargestReportEntry(userId, normalizedMonth, "expense"),
        getLargestReportEntry(userId, normalizedMonth, "income"),
        getRecurringTemplateCount(userId),
      ]);
    const monthlyTrend = await Promise.all(
      trendMonths.map(async (trendMonth) => {
        const trendSummary =
          trendMonth === normalizedMonth
            ? summary
            : await getMonthlySummary(userId, trendMonth);

        return {
          month: trendMonth,
          label: getMonthLabel(trendMonth),
          totalExpenses: trendSummary.totalExpenses,
          totalIncome: trendSummary.totalIncome,
          netBalance: trendSummary.netBalance,
          budget: trendSummary.budget,
        };
      }),
    );

    return {
      summary,
      monthlyTrend,
      categoryBreakdown,
      highlights: {
        largestExpense,
        largestIncome,
        topExpenseCategory: categoryBreakdown.find((item) => item.type === "expense") || null,
        recurringTemplateCount,
      },
    };
  }

  return {
    async init() {
      const pool = await getPool();
      const connection = await pool.getConnection();
      connection.release();
    },
    async close() {
      if (!poolPromise) {
        return;
      }

      const pool = await poolPromise;
      await pool.end();
    },
    runInTransaction,
    getSnapshot,
    getUserFinanceSnapshot,
    listUserTransactions,
    getUserRecurringTemplates,
    getMonthlySummary,
    getReports,
    async getUserById(id) {
      return getOne(
        `SELECT id, name, email, password_hash AS passwordHash, preferred_theme AS preferredTheme,
                default_budget AS defaultBudget, currency, created_at AS createdAt
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [id],
        normalizeUserFromRow,
      );
    },
    async getUserByEmail(email) {
      return getOne(
        `SELECT id, name, email, password_hash AS passwordHash, preferred_theme AS preferredTheme,
                default_budget AS defaultBudget, currency, created_at AS createdAt
         FROM users
         WHERE email = ?
         LIMIT 1`,
        [String(email || "").trim().toLowerCase()],
        normalizeUserFromRow,
      );
    },
    async getUserOverview(id) {
      return getOne(
        `SELECT
           u.id,
           u.name,
           u.email,
           u.password_hash AS passwordHash,
           u.preferred_theme AS preferredTheme,
           u.default_budget AS defaultBudget,
           u.currency,
           u.created_at AS createdAt,
           COALESCE(t.transactionCount, 0) AS transactionCount,
           COALESCE(b.budgetCount, 0) AS budgetCount,
           COALESCE(r.recurringCount, 0) AS recurringCount
         FROM users u
         LEFT JOIN (
           SELECT user_id, COUNT(*) AS transactionCount
           FROM transactions
           GROUP BY user_id
         ) t ON t.user_id = u.id
         LEFT JOIN (
           SELECT user_id, COUNT(*) AS budgetCount
           FROM budgets
           GROUP BY user_id
         ) b ON b.user_id = u.id
         LEFT JOIN (
           SELECT user_id, COUNT(*) AS recurringCount
           FROM recurring_templates
           GROUP BY user_id
         ) r ON r.user_id = u.id
         WHERE u.id = ?
         LIMIT 1`,
        [id],
        normalizeUserOverviewFromRow,
      );
    },
    async createUser(user, connection = null) {
      const db = connection || (await getPool());
      const normalizedUser = normalizeUser(user);

      await db.execute(
        `INSERT INTO users (
           id, name, email, password_hash, preferred_theme, default_budget, currency, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          normalizedUser.id,
          normalizedUser.name,
          normalizedUser.email,
          normalizedUser.passwordHash,
          normalizedUser.preferences.preferredTheme,
          normalizedUser.preferences.defaultBudget,
          normalizedUser.preferences.currency,
          toMySqlDateTime(normalizedUser.createdAt),
        ],
      );

      return getOneWithExecutor(
        db,
        `SELECT id, name, email, password_hash AS passwordHash, preferred_theme AS preferredTheme,
                default_budget AS defaultBudget, currency, created_at AS createdAt
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [normalizedUser.id],
        normalizeUserFromRow,
      );
    },
    async updateUserProfile(id, profile) {
      const pool = await getPool();
      const result = await pool.execute(
        `UPDATE users
         SET name = ?, email = ?
         WHERE id = ?`,
        [String(profile.name || "").trim(), String(profile.email || "").trim().toLowerCase(), id],
      );

      if (result[0].affectedRows === 0) {
        return null;
      }

      return this.getUserById(id);
    },
    async updateUserPreferences(id, preferences) {
      const pool = await getPool();
      const result = await pool.execute(
        `UPDATE users
         SET preferred_theme = ?, default_budget = ?, currency = ?
         WHERE id = ?`,
        [
          preferences.preferredTheme === "dark" ? "dark" : "light",
          toNumberOrNull(preferences.defaultBudget),
          String(preferences.currency || "PHP").trim() || "PHP",
          id,
        ],
      );

      if (result[0].affectedRows === 0) {
        return null;
      }

      return this.getUserById(id);
    },
    async updateUserPassword(id, passwordHash) {
      const pool = await getPool();
      const [result] = await pool.execute(
        `UPDATE users
         SET password_hash = ?
         WHERE id = ?`,
        [String(passwordHash || ""), id],
      );

      return result.affectedRows > 0;
    },
    async createTransaction(transaction, connection = null) {
      const db = connection || (await getPool());
      const normalizedTransaction = normalizeTransaction(transaction);

      await db.execute(
        `INSERT INTO transactions (
           id, user_id, title, notes, amount, transaction_date, type, category, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          normalizedTransaction.id,
          normalizedTransaction.userId,
          normalizedTransaction.title,
          normalizedTransaction.notes,
          normalizedTransaction.amount,
          normalizedTransaction.transactionDate,
          normalizedTransaction.type,
          normalizedTransaction.category,
          toMySqlDateTime(normalizedTransaction.createdAt),
          toMySqlDateTime(normalizedTransaction.updatedAt),
        ],
      );

      return getOneWithExecutor(
        db,
        `SELECT id, user_id AS userId, title, notes, amount, transaction_date AS transactionDate,
                created_at AS createdAt, updated_at AS updatedAt, type, category
         FROM transactions
         WHERE user_id = ? AND id = ?
         LIMIT 1`,
        [normalizedTransaction.userId, normalizedTransaction.id],
        normalizeTransactionFromRow,
      );
    },
    async findTransaction(userId, id) {
      return getOne(
        `SELECT id, user_id AS userId, title, notes, amount, transaction_date AS transactionDate,
                created_at AS createdAt, updated_at AS updatedAt, type, category
         FROM transactions
         WHERE user_id = ? AND id = ?
         LIMIT 1`,
        [userId, id],
        normalizeTransactionFromRow,
      );
    },
    async updateTransaction(userId, id, payload) {
      const pool = await getPool();
      const normalizedTransaction = normalizeTransaction({
        id,
        userId,
        ...payload,
      });

      const [result] = await pool.execute(
        `UPDATE transactions
         SET title = ?, notes = ?, amount = ?, transaction_date = ?, type = ?, category = ?, updated_at = ?
         WHERE user_id = ? AND id = ?`,
        [
          normalizedTransaction.title,
          normalizedTransaction.notes,
          normalizedTransaction.amount,
          normalizedTransaction.transactionDate,
          normalizedTransaction.type,
          normalizedTransaction.category,
          toMySqlDateTime(normalizedTransaction.updatedAt),
          userId,
          id,
        ],
      );

      if (result.affectedRows === 0) {
        return null;
      }

      return this.findTransaction(userId, id);
    },
    async deleteTransaction(userId, id) {
      const pool = await getPool();
      const [result] = await pool.execute(
        `DELETE FROM transactions
         WHERE user_id = ? AND id = ?`,
        [userId, id],
      );

      return result.affectedRows > 0;
    },
    async upsertBudget(budget, connection = null) {
      const db = connection || (await getPool());
      const normalizedBudget = normalizeBudget(budget);
      await db.execute(
        `INSERT INTO budgets (id, user_id, month_key, amount, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           amount = VALUES(amount),
           updated_at = VALUES(updated_at)`,
        [
          normalizedBudget.id,
          normalizedBudget.userId,
          normalizedBudget.month,
          normalizedBudget.amount,
          toMySqlDateTime(normalizedBudget.createdAt),
          toMySqlDateTime(normalizedBudget.updatedAt),
         ],
      );

      return getOneWithExecutor(
        db,
        `SELECT id, user_id AS userId, month_key AS month, amount, created_at AS createdAt,
                updated_at AS updatedAt
         FROM budgets
         WHERE user_id = ? AND month_key = ?
         LIMIT 1`,
        [normalizedBudget.userId, normalizedBudget.month],
        normalizeBudgetFromRow,
      );
    },
    async saveBudget({ id, userId, month, amount, mode, createdAt, updatedAt }) {
      const normalizedAmount = roundCurrency(amount);

      return runInTransaction(async (connection) => {
        const user = await getOneWithExecutor(
          connection,
          `SELECT id, default_budget AS defaultBudget
           FROM users
           WHERE id = ?
           LIMIT 1`,
          [userId],
          (row) => ({
            id: row.id,
            defaultBudget: toNumberOrNull(row.defaultBudget),
          }),
        );

        if (!user) {
          throw createForeignKeyError("User account no longer exists.");
        }

        const existing = await getOneWithExecutor(
          connection,
          `SELECT id, user_id AS userId, month_key AS month, amount, created_at AS createdAt,
                  updated_at AS updatedAt
           FROM budgets
           WHERE user_id = ? AND month_key = ?
           LIMIT 1
           FOR UPDATE`,
          [userId, month],
          normalizeBudgetFromRow,
        );

        if (mode === "set" && existing) {
          throw createBudgetConflictError(
            "This month's budget is already set. Use Edit budget to change it or Add to budget to increase it.",
          );
        }

        if (mode === "add") {
          const nextAmount = roundCurrency(
            Number(existing?.amount ?? user.defaultBudget ?? 0) + normalizedAmount,
          );

          if (existing) {
            await connection.execute(
              `UPDATE budgets
               SET amount = ?, updated_at = ?
               WHERE user_id = ? AND month_key = ?`,
              [nextAmount, toMySqlDateTime(updatedAt), userId, month],
            );

            return getOneWithExecutor(
              connection,
              `SELECT id, user_id AS userId, month_key AS month, amount, created_at AS createdAt,
                      updated_at AS updatedAt
               FROM budgets
               WHERE user_id = ? AND month_key = ?
               LIMIT 1`,
              [userId, month],
              normalizeBudgetFromRow,
            );
          }

          await connection.execute(
            `INSERT INTO budgets (id, user_id, month_key, amount, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, userId, month, nextAmount, toMySqlDateTime(createdAt), toMySqlDateTime(updatedAt)],
          );

          return getOneWithExecutor(
            connection,
            `SELECT id, user_id AS userId, month_key AS month, amount, created_at AS createdAt,
                    updated_at AS updatedAt
             FROM budgets
             WHERE user_id = ? AND month_key = ?
             LIMIT 1`,
            [userId, month],
            normalizeBudgetFromRow,
          );
        }

        const normalizedBudget = normalizeBudget({
          id,
          userId,
          month,
          amount: normalizedAmount,
          createdAt,
          updatedAt,
        });

        await connection.execute(
          `INSERT INTO budgets (id, user_id, month_key, amount, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             amount = VALUES(amount),
             updated_at = VALUES(updated_at)`,
          [
            normalizedBudget.id,
            normalizedBudget.userId,
            normalizedBudget.month,
            normalizedBudget.amount,
            toMySqlDateTime(normalizedBudget.createdAt),
            toMySqlDateTime(normalizedBudget.updatedAt),
          ],
        );

        return getOneWithExecutor(
          connection,
          `SELECT id, user_id AS userId, month_key AS month, amount, created_at AS createdAt,
                  updated_at AS updatedAt
           FROM budgets
           WHERE user_id = ? AND month_key = ?
           LIMIT 1`,
          [normalizedBudget.userId, normalizedBudget.month],
          normalizeBudgetFromRow,
        );
      });
    },
    async getUserStats(userId) {
      const pool = await getPool();
      const [transactionRows, budgetRows, recurringRows] = await Promise.all([
        pool.query(`SELECT COUNT(*) AS count FROM transactions WHERE user_id = ?`, [userId]),
        pool.query(`SELECT COUNT(*) AS count FROM budgets WHERE user_id = ?`, [userId]),
        pool.query(`SELECT COUNT(*) AS count FROM recurring_templates WHERE user_id = ?`, [userId]),
      ]);

      return {
        transactionCount: Number(transactionRows[0][0].count || 0),
        budgetCount: Number(budgetRows[0][0].count || 0),
        recurringCount: Number(recurringRows[0][0].count || 0),
      };
    },
    async clearUserData(userId) {
      const pool = await getPool();
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();
        await connection.execute(`DELETE FROM transactions WHERE user_id = ?`, [userId]);
        await connection.execute(`DELETE FROM budgets WHERE user_id = ?`, [userId]);
        await connection.execute(`DELETE FROM recurring_templates WHERE user_id = ?`, [userId]);
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
    async createRecurringTemplate(template, connection = null) {
      const db = connection || (await getPool());
      const normalizedTemplate = normalizeRecurringTemplate(template);

      await db.execute(
        `INSERT INTO recurring_templates (
           id, user_id, title, notes, amount, start_date, type, category, repeat_cycle, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          normalizedTemplate.id,
          normalizedTemplate.userId,
          normalizedTemplate.title,
          normalizedTemplate.notes,
          normalizedTemplate.amount,
          normalizedTemplate.startDate,
          normalizedTemplate.type,
          normalizedTemplate.category,
          normalizedTemplate.repeat,
          toMySqlDateTime(normalizedTemplate.createdAt),
          toMySqlDateTime(normalizedTemplate.updatedAt),
        ],
      );

      return getOneWithExecutor(
        db,
        `SELECT id, user_id AS userId, title, notes, amount, start_date AS startDate,
                type, category, created_at AS createdAt,
                updated_at AS updatedAt
         FROM recurring_templates
         WHERE user_id = ? AND id = ?
         LIMIT 1`,
        [normalizedTemplate.userId, normalizedTemplate.id],
        normalizeRecurringTemplateFromRow,
      );
    },
    async findRecurringTemplate(userId, id) {
      return getOne(
        `SELECT id, user_id AS userId, title, notes, amount, start_date AS startDate,
                type, category, created_at AS createdAt,
                updated_at AS updatedAt
         FROM recurring_templates
         WHERE user_id = ? AND id = ?
         LIMIT 1`,
        [userId, id],
        normalizeRecurringTemplateFromRow,
      );
    },
    async updateRecurringTemplate(userId, id, payload) {
      const pool = await getPool();
      const normalizedTemplate = normalizeRecurringTemplate({
        id,
        userId,
        ...payload,
      });

      const [result] = await pool.execute(
        `UPDATE recurring_templates
         SET title = ?, notes = ?, amount = ?, start_date = ?, type = ?, category = ?, repeat_cycle = ?, updated_at = ?
         WHERE user_id = ? AND id = ?`,
        [
          normalizedTemplate.title,
          normalizedTemplate.notes,
          normalizedTemplate.amount,
          normalizedTemplate.startDate,
          normalizedTemplate.type,
          normalizedTemplate.category,
          normalizedTemplate.repeat,
          toMySqlDateTime(normalizedTemplate.updatedAt),
          userId,
          id,
        ],
      );

      if (result.affectedRows === 0) {
        return null;
      }

      return this.findRecurringTemplate(userId, id);
    },
    async deleteRecurringTemplate(userId, id) {
      const pool = await getPool();
      const [result] = await pool.execute(
        `DELETE FROM recurring_templates
         WHERE user_id = ? AND id = ?`,
        [userId, id],
      );

      return result.affectedRows > 0;
    },
  };
}

export function createStoreFromEnv(env = process.env) {
  return createMySqlStore(env);
}
