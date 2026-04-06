import { useEffect, useRef, useState } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import { api } from "./api";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PieChart,
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  LogOut,
  Sun,
  Moon,
  Target,
  Activity,
  Clock,
  Hash,
  ShieldCheck,
  BarChart3,
  Zap,
  FileText,
  Inbox,
  AlertCircle,
  X,
} from "lucide-react";

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "Not set";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value));
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMonthLabel(value) {
  return new Date(`${value}-01T00:00:00`).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
  });
}

function getFirstName(name) {
  return name?.trim().split(/\s+/)[0] || "there";
}

function getStatusMeta(summary) {
  if (!summary || summary.budget === null) {
    return {
      tone: "neutral",
      label: "Budget not set",
      description: "Define a monthly budget to unlock your allowance snapshot.",
      icon: Target,
    };
  }

  if (summary.statusType === "remaining") {
    return {
      tone: "positive",
      label: "On track",
      description: "Your current spending pace is still within your limit.",
      icon: ShieldCheck,
    };
  }

  if (summary.statusType === "exact") {
    return {
      tone: "balanced",
      label: "Budget used",
      description: "You have matched your full monthly budget.",
      icon: Activity,
    };
  }

  return {
    tone: "warning",
    label: "Over budget",
    description: "Your expenses have already moved beyond the monthly target.",
    icon: AlertCircle,
  };
}

function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pesotrace-theme") || "light";
    }
    return "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pesotrace-theme", theme);
  }, [theme]);

  function toggle() {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }

  return { theme, toggle };
}

function AppShell() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="app-shell">
        <section className="panel loading-panel">
          <div>
            <p className="eyebrow"><Zap size={14} /> PesoTrace</p>
            <h2>Loading your finance workspace...</h2>
          </div>
        </section>
      </main>
    );
  }

  return user ? <Dashboard /> : <AuthScreen />;
}

function AuthScreen() {
  const { login, register } = useAuth();
  const { theme, toggle } = useTheme();
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const highlights = [
    {
      icon: PieChart,
      title: "Clear monthly snapshots",
      description:
        "Review budget, expenses, and remaining allowance in one focused workspace.",
    },
    {
      icon: Zap,
      title: "Fast daily logging",
      description:
        "Add transactions quickly with dates, notes, and precise peso amounts.",
    },
    {
      icon: BarChart3,
      title: "Built for routine tracking",
      description:
        "Keep a clean record every month and spot overspending before it grows.",
    },
  ];

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (mode === "register") {
        await register(form);
      } else {
        await login({
          email: form.email,
          password: form.password,
        });
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app-shell auth-shell">
      <section className="auth-showcase">
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="brand-mark">₱T</div>
          <p className="eyebrow" style={{ marginTop: "1.5rem" }}>
            <Wallet size={14} /> Professional personal finance tracking
          </p>
          <h1>See where every peso goes with clarity.</h1>
          <p className="hero-text">
            PesoTrace gives you a cleaner way to manage monthly budgets, record
            expenses, and understand whether your spending is still under control.
          </p>

          <div className="showcase-grid">
            <article className="showcase-card showcase-card-featured">
              <p className="card-kicker">This month at a glance</p>
              <h2>Budget, spending, and transaction history in one view.</h2>
              <p>
                Reduce friction in daily logging and keep a reliable monthly
                picture without jumping between screens.
              </p>
            </article>

            {highlights.map((item) => (
              <article className="showcase-card" key={item.title}>
                <item.icon size={20} style={{ opacity: 0.8, marginBottom: "0.5rem" }} />
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="panel auth-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div className="auth-panel-header">
            <p className="eyebrow">Welcome</p>
            <h2>{mode === "register" ? "Create your account" : "Sign in"}</h2>
            <p className="auth-helper">
              {mode === "register"
                ? "Start your finance workspace in a few steps."
                : "Continue managing your monthly expenses."}
            </p>
          </div>
          <button
            className="theme-toggle"
            type="button"
            onClick={toggle}
            aria-label="Toggle theme"
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>

        <div className="mode-toggle" role="tablist" aria-label="Authentication mode">
          <button
            className={mode === "login" ? "active" : ""}
            type="button"
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            className={mode === "register" ? "active" : ""}
            type="button"
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <label>
              <div className="field-label">
                <span>Full name</span>
                <small>Use the name you want displayed in the dashboard.</small>
              </div>
              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Juan Dela Cruz"
                required
              />
            </label>
          )}

          <label>
            <div className="field-label">
              <span>Email</span>
              <small>Used for login and account recovery.</small>
            </div>
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            <div className="field-label">
              <span>Password</span>
              <small>Minimum of 6 characters.</small>
            </div>
            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              minLength={6}
              placeholder="At least 6 characters"
              required
            />
          </label>

          {error && (
            <p className="form-error" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <AlertCircle size={15} /> {error}
            </p>
          )}

          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting
              ? "Please wait..."
              : mode === "register"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Dashboard() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [dashboard, setDashboard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");
  const loadRequestRef = useRef(0);
  const [transactionForm, setTransactionForm] = useState({
    id: "",
    title: "",
    amount: "",
    transactionDate: `${getCurrentMonth()}-01`,
    notes: "",
  });
  const [savingTransaction, setSavingTransaction] = useState(false);

  async function loadMonthData(month) {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setError("");

    try {
      const [dashboardResponse, transactionsResponse] = await Promise.all([
        api.getDashboard(month),
        api.getTransactions(month),
      ]);

      if (loadRequestRef.current !== requestId) {
        return;
      }

      setDashboard(dashboardResponse.summary);
      setTransactions(transactionsResponse.transactions);
      setBudgetAmount(
        dashboardResponse.summary.budget === null
          ? ""
          : String(dashboardResponse.summary.budget),
      );
    } catch (loadError) {
      if (loadRequestRef.current !== requestId) {
        return;
      }

      setError(loadError.message);
    } finally {
      if (loadRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadMonthData(selectedMonth);
  }, [selectedMonth]);

  function handleMonthChange(month) {
    setSelectedMonth(month);
    setTransactionForm((current) => ({
      ...current,
      transactionDate:
        current.id && current.transactionDate
          ? current.transactionDate
          : `${month}-01`,
    }));
  }

  const monthLabel = formatMonthLabel(selectedMonth);
  const statusMeta = getStatusMeta(dashboard);
  const StatusIcon = statusMeta.icon;
  const totalExpenses = Number(dashboard?.totalExpenses || 0);
  const budgetValue =
    dashboard?.budget === null || dashboard?.budget === undefined
      ? null
      : Number(dashboard.budget);
  const progress =
    budgetValue && budgetValue > 0
      ? Math.min((totalExpenses / budgetValue) * 100, 100)
      : 0;

  const transactionInsights = !transactions.length
    ? {
        largestAmount: null,
        latestTransactionDate: null,
      }
    : transactions.reduce(
        (insights, transaction) => {
          const amount = Number(transaction.amount);
          const isLater =
            !insights.latestTransactionDate ||
            new Date(`${transaction.transactionDate}T00:00:00`) >
              new Date(`${insights.latestTransactionDate}T00:00:00`);

          return {
            largestAmount:
              insights.largestAmount === null || amount > insights.largestAmount
                ? amount
                : insights.largestAmount,
            latestTransactionDate: isLater
              ? transaction.transactionDate
              : insights.latestTransactionDate,
          };
        },
        {
          largestAmount: null,
          latestTransactionDate: null,
        },
      );

  const averageExpense =
    dashboard?.transactionCount && dashboard.transactionCount > 0
      ? totalExpenses / dashboard.transactionCount
      : null;

  let statusText = "";

  if (dashboard) {
    if (dashboard.statusType === "remaining") {
      statusText = `${formatCurrency(dashboard.statusAmount)} still available this month.`;
    } else if (dashboard.statusType === "exact") {
      statusText = "You have fully used this month's budget.";
    } else if (dashboard.statusType === "deficit") {
      statusText = `${formatCurrency(Math.abs(dashboard.statusAmount))} over budget.`;
    } else {
      statusText = "Set this month's budget to unlock allowance tracking.";
    }
  }

  async function handleBudgetSubmit(event) {
    event.preventDefault();
    setSavingBudget(true);
    setError("");

    try {
      await api.saveBudget(selectedMonth, budgetAmount);
      await loadMonthData(selectedMonth);
    } catch (budgetError) {
      setError(budgetError.message);
    } finally {
      setSavingBudget(false);
    }
  }

  function resetTransactionForm() {
    setTransactionForm({
      id: "",
      title: "",
      amount: "",
      transactionDate: `${selectedMonth}-01`,
      notes: "",
    });
  }

  async function handleTransactionSubmit(event) {
    event.preventDefault();
    setSavingTransaction(true);
    setError("");

    const payload = {
      title: transactionForm.title,
      amount: transactionForm.amount,
      transactionDate: transactionForm.transactionDate,
      notes: transactionForm.notes,
    };

    try {
      if (transactionForm.id) {
        await api.updateTransaction(transactionForm.id, payload);
      } else {
        await api.createTransaction(payload);
      }

      resetTransactionForm();
      await loadMonthData(selectedMonth);
    } catch (transactionError) {
      setError(transactionError.message);
    } finally {
      setSavingTransaction(false);
    }
  }

  async function handleDeleteTransaction(id) {
    setError("");

    try {
      await api.deleteTransaction(id);
      if (transactionForm.id === id) {
        resetTransactionForm();
      }
      await loadMonthData(selectedMonth);
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  function handleEditTransaction(transaction) {
    setTransactionForm({
      id: transaction.id,
      title: transaction.title,
      amount: String(transaction.amount),
      transactionDate: transaction.transactionDate,
      notes: transaction.notes || "",
    });
  }

  const metricCards = [
    {
      icon: Wallet,
      label: "Monthly budget",
      value: formatCurrency(dashboard?.budget),
      detail: `Planned spending limit for ${monthLabel}.`,
    },
    {
      icon: TrendingDown,
      label: "Total expenses",
      value: formatCurrency(dashboard?.totalExpenses),
      detail: "Combined amount of all logged expenses.",
    },
    {
      icon: dashboard?.statusType === "deficit" ? TrendingDown : TrendingUp,
      label:
        dashboard?.statusType === "deficit"
          ? "Budget exceeded"
          : "Remaining balance",
      value:
        dashboard?.statusType === "deficit"
          ? formatCurrency(Math.abs(dashboard?.statusAmount || 0))
          : dashboard?.statusType === "remaining"
            ? formatCurrency(dashboard?.statusAmount || 0)
            : dashboard?.statusType === "exact"
              ? formatCurrency(0)
              : "Not available",
      detail: statusText,
    },
    {
      icon: PieChart,
      label: "Average expense",
      value:
        averageExpense === null ? "No data yet" : formatCurrency(averageExpense),
      detail: dashboard?.transactionCount
        ? `Based on ${dashboard.transactionCount} logged transactions.`
        : "Add transactions to see spending patterns.",
    },
  ];

  return (
    <main className="app-shell dashboard-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark small">₱T</div>
          <div>
            <p className="eyebrow"><Activity size={12} /> PesoTrace workspace</p>
            <h2>{monthLabel} overview</h2>
          </div>
        </div>

        <div className="topbar-actions">
          <label className="month-picker">
            <span className="month-picker-label">Active month</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => handleMonthChange(event.target.value)}
            />
          </label>

          <div className="user-chip">
            <strong>{getFirstName(user.name)}</strong>
            <span>{user.email}</span>
          </div>

          <button
            className="theme-toggle"
            type="button"
            onClick={toggle}
            aria-label="Toggle theme"
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <button className="secondary-button" type="button" onClick={logout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {error && (
        <p className="banner-error">
          <AlertCircle size={16} /> {error}
        </p>
      )}

      {loading ? (
        <section className="panel loading-panel">
          <h2>Refreshing your monthly finance summary...</h2>
        </section>
      ) : (
        <>
          <section className="summary-hero panel">
            <div className="summary-copy">
              <p className="eyebrow">
                <CalendarDays size={14} /> Monthly finance workspace
              </p>
              <h1>Welcome back, {getFirstName(user.name)}.</h1>
              <p className="summary-text">
                Track your spending activity for {monthLabel}, review your
                available budget, and keep your expense records organized in a
                cleaner, more focused workspace.
              </p>

              <div className="summary-tags">
                <span>
                  <Hash size={13} /> {dashboard?.transactionCount || 0} entries
                </span>
                <span>
                  <Clock size={13} />{" "}
                  {transactionInsights.latestTransactionDate
                    ? `Latest: ${formatDate(transactionInsights.latestTransactionDate)}`
                    : "No recent entries"}
                </span>
                <span>
                  <StatusIcon size={13} /> {statusMeta.description}
                </span>
              </div>
            </div>

            <article className={`summary-card ${statusMeta.tone}`}>
              <div className="status-pill">
                <StatusIcon size={13} /> {statusMeta.label}
              </div>
              <p className="summary-card-label">Spending progress</p>
              <h2>{formatCurrency(totalExpenses)}</h2>
              <p className="summary-card-copy">
                {budgetValue !== null
                  ? `Spent out of ${formatCurrency(budgetValue)} budgeted for this month.`
                  : "Set a monthly budget to start tracking remaining allowance."}
              </p>

              <div className="progress-track" aria-hidden="true">
                <span style={{ width: `${progress}%` }} />
              </div>
              <p className="progress-caption">{statusText}</p>
            </article>
          </section>

          <section className="metric-grid">
            {metricCards.map((card) => (
              <article className="panel metric-card" key={card.label}>
                <div>
                  <div className="metric-icon">
                    <card.icon size={18} />
                  </div>
                  <p className="metric-label">{card.label}</p>
                  <h3>{card.value}</h3>
                </div>
                <p className="metric-detail">{card.detail}</p>
              </article>
            ))}
          </section>

          <section className="workspace-grid">
            <div className="workspace-main">
              <article className="panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">
                      <Plus size={12} /> Expense entry
                    </p>
                    <h2>
                      {transactionForm.id ? "Edit transaction" : "Add transaction"}
                    </h2>
                  </div>
                  {transactionForm.id && (
                    <button
                      className="secondary-button compact-button"
                      type="button"
                      onClick={resetTransactionForm}
                    >
                      <X size={14} /> Cancel edit
                    </button>
                  )}
                </div>

                <form className="stack-form" onSubmit={handleTransactionSubmit}>
                  <label>
                    <div className="field-label">
                      <span>Title</span>
                      <small>Use a short label you can scan later.</small>
                    </div>
                    <input
                      type="text"
                      value={transactionForm.title}
                      onChange={(event) =>
                        setTransactionForm((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      placeholder="Ex. Lunch, fare, school supplies"
                      required
                    />
                  </label>

                  <div className="form-row">
                    <label>
                      <div className="field-label">
                        <span>Amount</span>
                        <small>Exact peso amount.</small>
                      </div>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={transactionForm.amount}
                        onChange={(event) =>
                          setTransactionForm((current) => ({
                            ...current,
                            amount: event.target.value,
                          }))
                        }
                        placeholder="0.00"
                        required
                      />
                    </label>

                    <label>
                      <div className="field-label">
                        <span>Date</span>
                        <small>When did this happen?</small>
                      </div>
                      <input
                        type="date"
                        value={transactionForm.transactionDate}
                        onChange={(event) =>
                          setTransactionForm((current) => ({
                            ...current,
                            transactionDate: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                  </div>

                  <label>
                    <div className="field-label">
                      <span>Notes</span>
                      <small>Optional details for context or reminders.</small>
                    </div>
                    <textarea
                      rows="3"
                      value={transactionForm.notes}
                      onChange={(event) =>
                        setTransactionForm((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      placeholder="Optional details"
                    />
                  </label>

                  <button
                    className="primary-button"
                    type="submit"
                    disabled={savingTransaction}
                  >
                    {savingTransaction
                      ? "Saving..."
                      : transactionForm.id
                        ? "Update transaction"
                        : "Add transaction"}
                  </button>
                </form>
              </article>

              <article className="panel history-panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">
                      <FileText size={12} /> Transaction history
                    </p>
                    <h2>Expenses for {monthLabel}</h2>
                  </div>
                  <p className="section-caption">
                    Review entries, adjust mistakes, and keep your records clean.
                  </p>
                </div>

                {transactions.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <Inbox size={22} />
                    </div>
                    <h3>No transactions for this month yet.</h3>
                    <p>Add an expense to start building your monthly summary.</p>
                  </div>
                ) : (
                  <>
                    <div className="table-wrap desktop-history">
                      <table className="transaction-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Title</th>
                            <th>Notes</th>
                            <th>Amount</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map((transaction) => (
                            <tr key={transaction.id}>
                              <td>{formatDate(transaction.transactionDate)}</td>
                              <td>
                                <div className="transaction-primary">
                                  <strong>{transaction.title}</strong>
                                </div>
                              </td>
                              <td className="notes-cell">
                                {transaction.notes || "—"}
                              </td>
                              <td className="amount-cell">
                                {formatCurrency(transaction.amount)}
                              </td>
                              <td className="action-cell">
                                <button
                                  className="icon-btn"
                                  type="button"
                                  onClick={() => handleEditTransaction(transaction)}
                                  title="Edit"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  className="icon-btn danger"
                                  type="button"
                                  onClick={() =>
                                    handleDeleteTransaction(transaction.id)
                                  }
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mobile-history">
                      {transactions.map((transaction) => (
                        <article
                          className="mobile-transaction-card"
                          key={transaction.id}
                        >
                          <div className="mobile-transaction-head">
                            <div>
                              <p className="mobile-transaction-title">
                                {transaction.title}
                              </p>
                              <span>{formatDate(transaction.transactionDate)}</span>
                            </div>
                            <strong className="amount-cell">
                              {formatCurrency(transaction.amount)}
                            </strong>
                          </div>
                          <p className="mobile-transaction-notes">
                            {transaction.notes || "No notes added"}
                          </p>
                          <div className="mobile-transaction-actions">
                            <button
                              className="action-button"
                              type="button"
                              onClick={() => handleEditTransaction(transaction)}
                            >
                              <Pencil size={13} /> Edit
                            </button>
                            <button
                              className="action-button danger"
                              type="button"
                              onClick={() =>
                                handleDeleteTransaction(transaction.id)
                              }
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </article>
            </div>

            <div className="workspace-side">
              <article className="panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">
                      <Target size={12} /> Budget tracking
                    </p>
                    <h2>Set allowance for {monthLabel}</h2>
                  </div>
                </div>

                <form className="stack-form" onSubmit={handleBudgetSubmit}>
                  <label>
                    <div className="field-label">
                      <span>Monthly budget</span>
                      <small>Update this whenever your allowance changes.</small>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={budgetAmount}
                      onChange={(event) => setBudgetAmount(event.target.value)}
                      placeholder="Enter your budget"
                      required
                    />
                  </label>
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={savingBudget}
                  >
                    <Wallet size={16} />{" "}
                    {savingBudget ? "Saving..." : "Save budget"}
                  </button>
                </form>
              </article>

              <article className="panel insight-panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">
                      <BarChart3 size={12} /> Quick insights
                    </p>
                    <h2>Spending signals</h2>
                  </div>
                </div>

                <div className="insight-list">
                  <div className="insight-item">
                    <span>
                      <TrendingUp
                        size={14}
                        style={{ verticalAlign: "middle", marginRight: "0.4rem" }}
                      />
                      Largest expense
                    </span>
                    <strong>
                      {transactionInsights.largestAmount === null
                        ? "No data yet"
                        : formatCurrency(transactionInsights.largestAmount)}
                    </strong>
                  </div>
                  <div className="insight-item">
                    <span>
                      <Clock
                        size={14}
                        style={{ verticalAlign: "middle", marginRight: "0.4rem" }}
                      />
                      Latest transaction
                    </span>
                    <strong>
                      {transactionInsights.latestTransactionDate
                        ? formatDate(transactionInsights.latestTransactionDate)
                        : "No data yet"}
                    </strong>
                  </div>
                  <div className="insight-item">
                    <span>
                      <Hash
                        size={14}
                        style={{ verticalAlign: "middle", marginRight: "0.4rem" }}
                      />
                      Transaction count
                    </span>
                    <strong>{dashboard?.transactionCount || 0}</strong>
                  </div>
                  <div className="insight-item">
                    <span>
                      <ShieldCheck
                        size={14}
                        style={{ verticalAlign: "middle", marginRight: "0.4rem" }}
                      />
                      Budget status
                    </span>
                    <strong>{statusMeta.label}</strong>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
