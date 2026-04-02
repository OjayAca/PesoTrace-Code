import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import { api } from "./api";

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

function AppShell() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="app-shell">
        <section className="panel loading-panel">
          <p className="eyebrow">PesoTrace</p>
          <h1>Loading your finance workspace...</h1>
        </section>
      </main>
    );
  }

  return user ? <Dashboard /> : <AuthScreen />;
}

function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

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
      <section className="hero-copy">
        <p className="eyebrow">Final Project Build</p>
        <h1>PesoTrace</h1>
        <p className="hero-text">
          Track spending, review monthly expenses, and see whether your budget
          still has room or has already gone into deficit.
        </p>
        <div className="feature-list">
          <span>Multi-user access</span>
          <span>Expense history</span>
          <span>Monthly budget status</span>
        </div>
      </section>

      <section className="panel auth-panel">
        <div className="mode-toggle">
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
              Full name
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
            Email
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
            Password
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

          {error && <p className="form-error">{error}</p>}

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
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [dashboard, setDashboard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [transactionForm, setTransactionForm] = useState({
    id: "",
    title: "",
    amount: "",
    transactionDate: `${getCurrentMonth()}-01`,
    notes: "",
  });
  const [savingTransaction, setSavingTransaction] = useState(false);

  async function loadMonthData(month) {
    setLoading(true);
    setError("");

    try {
      const [dashboardResponse, transactionsResponse] = await Promise.all([
        api.getDashboard(month),
        api.getTransactions(month),
      ]);

      setDashboard(dashboardResponse.summary);
      setTransactions(transactionsResponse.transactions);
      setBudgetAmount(
        dashboardResponse.summary.budget === null
          ? ""
          : String(dashboardResponse.summary.budget),
      );
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMonthData(selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    setTransactionForm((current) => ({
      ...current,
      transactionDate:
        current.id && current.transactionDate
          ? current.transactionDate
          : `${selectedMonth}-01`,
    }));
  }, [selectedMonth]);

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

  return (
    <main className="app-shell dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Personal Finance Tracker</p>
          <h1>Welcome back, {user.name.split(" ")[0]}</h1>
        </div>
        <div className="topbar-actions">
          <label className="month-picker">
            Active month
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            />
          </label>
          <button className="secondary-button" type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {error && <p className="banner-error">{error}</p>}

      {loading ? (
        <section className="panel loading-panel">
          <h2>Refreshing your monthly finance summary...</h2>
        </section>
      ) : (
        <>
          <section className="metric-grid">
            <article className="panel metric-card">
              <p className="metric-label">Monthly budget</p>
              <h2>{formatCurrency(dashboard?.budget)}</h2>
            </article>
            <article className="panel metric-card">
              <p className="metric-label">Total expenses</p>
              <h2>{formatCurrency(dashboard?.totalExpenses)}</h2>
            </article>
            <article className="panel metric-card status-card">
              <p className="metric-label">Budget status</p>
              <h2>{statusText}</h2>
            </article>
            <article className="panel metric-card">
              <p className="metric-label">Transactions</p>
              <h2>{dashboard?.transactionCount || 0}</h2>
            </article>
          </section>

          <section className="content-grid">
            <article className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Budget Tracking</p>
                  <h2>Set allowance for {selectedMonth}</h2>
                </div>
              </div>

              <form className="stack-form" onSubmit={handleBudgetSubmit}>
                <label>
                  Monthly budget
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
                  {savingBudget ? "Saving..." : "Save budget"}
                </button>
              </form>
            </article>

            <article className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Expense Entry</p>
                  <h2>
                    {transactionForm.id ? "Edit transaction" : "Add transaction"}
                  </h2>
                </div>
                {transactionForm.id && (
                  <button
                    className="text-button"
                    type="button"
                    onClick={resetTransactionForm}
                  >
                    Cancel edit
                  </button>
                )}
              </div>

              <form className="stack-form" onSubmit={handleTransactionSubmit}>
                <label>
                  Title
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
                    Amount
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
                    Date
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
                  Notes
                  <textarea
                    rows="4"
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
          </section>

          <section className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Transaction History</p>
                <h2>Expenses for {selectedMonth}</h2>
              </div>
            </div>

            {transactions.length === 0 ? (
              <div className="empty-state">
                <h3>No transactions for this month yet.</h3>
                <p>Add an expense to start building your monthly summary.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
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
                        <td>{transaction.title}</td>
                        <td>{transaction.notes || "No notes"}</td>
                        <td>{formatCurrency(transaction.amount)}</td>
                        <td className="action-cell">
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => handleEditTransaction(transaction)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-button danger-text"
                            type="button"
                            onClick={() => handleDeleteTransaction(transaction.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
