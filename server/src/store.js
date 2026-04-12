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
      data.users.push(nextUser);
      return normalizeUser(clone(nextUser));
    },
    async updateUserProfile(id, profile) {
      const user = data.users.find((entry) => entry.id === id) || null;

      if (!user) {
        return null;
      }

      user.name = String(profile.name || "").trim();
      user.email = String(profile.email || "").trim().toLowerCase();
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
              timezone: "Z",
              dateStrings: true,
            })
          : mysql.createPool({
              ...options,
              waitForConnections: true,
              connectionLimit: Number(env.MYSQL_CONNECTION_LIMIT || 10),
              queueLimit: 0,
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
    getSnapshot,
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
    async createUser(user) {
      const pool = await getPool();
      const normalizedUser = normalizeUser(user);

      await pool.execute(
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

      return this.getUserById(normalizedUser.id);
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
    async createTransaction(transaction) {
      const pool = await getPool();
      const normalizedTransaction = normalizeTransaction(transaction);

      await pool.execute(
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

      return this.findTransaction(normalizedTransaction.userId, normalizedTransaction.id);
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
    async upsertBudget(budget) {
      const pool = await getPool();
      const normalizedBudget = normalizeBudget(budget);
      const existing = await getOne(
        `SELECT id
         FROM budgets
         WHERE user_id = ? AND month_key = ?
         LIMIT 1`,
        [normalizedBudget.userId, normalizedBudget.month],
      );

      if (existing) {
        await pool.execute(
          `UPDATE budgets
           SET amount = ?, updated_at = ?
           WHERE user_id = ? AND month_key = ?`,
          [
            normalizedBudget.amount,
            toMySqlDateTime(normalizedBudget.updatedAt),
            normalizedBudget.userId,
            normalizedBudget.month,
          ],
        );
      } else {
        await pool.execute(
          `INSERT INTO budgets (id, user_id, month_key, amount, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            normalizedBudget.id,
            normalizedBudget.userId,
            normalizedBudget.month,
            normalizedBudget.amount,
            toMySqlDateTime(normalizedBudget.createdAt),
            toMySqlDateTime(normalizedBudget.updatedAt),
          ],
        );
      }

      return getOne(
        `SELECT id, user_id AS userId, month_key AS month, amount, created_at AS createdAt,
                updated_at AS updatedAt
         FROM budgets
         WHERE user_id = ? AND month_key = ?
         LIMIT 1`,
        [normalizedBudget.userId, normalizedBudget.month],
        normalizeBudgetFromRow,
      );
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
    async createRecurringTemplate(template) {
      const pool = await getPool();
      const normalizedTemplate = normalizeRecurringTemplate(template);

      await pool.execute(
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

      return this.findRecurringTemplate(normalizedTemplate.userId, normalizedTemplate.id);
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
