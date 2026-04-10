import { useEffect, useMemo, useRef, useState } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import { api } from "./api";
import {
  Activity,
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Filter,
  Hash,
  Inbox,
  Lock,
  LogOut,
  Moon,
  Pencil,
  PieChart,
  Plus,
  Repeat,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
  X,
  Zap,
} from "lucide-react";

const FALLBACK_CATEGORIES = [
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

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: Wallet },
  { id: "transactions", label: "Transactions", icon: FileText },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
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
  if (!value) {
    return "No date";
  }

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

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

function getStatusMeta(summary) {
  if (!summary || summary.budget === null) {
    return {
      tone: "neutral",
      label: "Budget not set",
      description: "Set a monthly or default budget to unlock allowance tracking.",
      icon: Target,
    };
  }

  if (summary.statusType === "remaining") {
    return {
      tone: "positive",
      label: "On track",
      description: "Current expense pace is still within your budget.",
      icon: ShieldCheck,
    };
  }

  if (summary.statusType === "exact") {
    return {
      tone: "balanced",
      label: "Budget matched",
      description: "This month has used the full planned budget.",
      icon: Activity,
    };
  }

  return {
    tone: "warning",
    label: "Over budget",
    description: "Expenses have moved beyond the planned limit.",
    icon: AlertCircle,
  };
}

function useTheme(user) {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pesotrace-theme") || "light";
    }

    return "light";
  });

  useEffect(() => {
    const preferredTheme = user?.preferences?.preferredTheme;

    if (preferredTheme && preferredTheme !== theme) {
      setTheme(preferredTheme);
    }
  }, [user?.preferences?.preferredTheme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pesotrace-theme", theme);
  }, [theme]);

  return {
    theme,
    setTheme,
  };
}

function AppShell() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="app-shell">
        <section className="panel loading-panel">
          <div>
            <p className="eyebrow">
              <Zap size={14} /> PesoTrace
            </p>
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
  const { theme, setTheme } = useTheme(null);
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
      <section className="auth-showcase">
        <div className="hero-copy">
          <div className="brand-mark">PT</div>
          <p className="eyebrow">
            <Wallet size={14} /> Personal finance tracker
          </p>
          <h1>Track every peso with clearer monthly control.</h1>
          <p className="hero-text">
            PesoTrace now combines budgeting, typed transactions, recurring
            entries, reports, and account settings in one focused workspace.
          </p>
        </div>

        <div className="showcase-grid">
          <article className="showcase-card showcase-card-featured">
            <p className="card-kicker">Upgraded workspace</p>
            <h2>Dashboard, transactions, reports, and settings.</h2>
            <p>
              Keep monthly budgets, cash flow, categories, and recurring entries
              in one application instead of scattered notes.
            </p>
          </article>

          <article className="showcase-card">
            <BarChart3 size={20} />
            <h3>Readable reports</h3>
            <p>See category totals and month-to-month patterns without extra tools.</p>
          </article>

          <article className="showcase-card">
            <Repeat size={20} />
            <h3>Recurring tracking</h3>
            <p>Reuse monthly allowance or bill entries instead of typing them again.</p>
          </article>
        </div>
      </section>

      <section className="panel auth-panel">
        <div className="auth-panel-top">
          <div>
            <p className="eyebrow">Welcome</p>
            <h2>{mode === "register" ? "Create your account" : "Sign in"}</h2>
            <p className="auth-helper">
              {mode === "register"
                ? "Start your upgraded finance workspace."
                : "Continue managing your monthly finances."}
            </p>
          </div>

          <button
            className="theme-toggle"
            type="button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label="Toggle theme"
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
          {mode === "register" ? (
            <label>
              <div className="field-label">
                <span>Full name</span>
                <small>Shown across your workspace.</small>
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
          ) : null}

          <label>
            <div className="field-label">
              <span>Email</span>
              <small>Used for sign in.</small>
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

          {error ? (
            <p className="form-error">
              <AlertCircle size={15} /> {error}
            </p>
          ) : null}

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
  const { user, logout, setCurrentUser } = useAuth();
  const { theme, setTheme } = useTheme(user);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [dashboard, setDashboard] = useState(null);
  const [reports, setReports] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [settingsData, setSettingsData] = useState(null);
  const [recurringTemplates, setRecurringTemplates] = useState([]);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [savingBudget, setSavingBudget] = useState(false);
  const [savingTransaction, setSavingTransaction] = useState(false);
  const [savingRecurring, setSavingRecurring] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [filters, setFilters] = useState({
    type: "",
    category: "",
    query: "",
  });
  const [budgetAmount, setBudgetAmount] = useState("");
  const [transactionForm, setTransactionForm] = useState({
    id: "",
    title: "",
    amount: "",
    transactionDate: `${getCurrentMonth()}-01`,
    type: "expense",
    category: "Other",
    notes: "",
  });
  const [recurringForm, setRecurringForm] = useState({
    id: "",
    title: "",
    amount: "",
    startDate: `${getCurrentMonth()}-01`,
    type: "expense",
    category: "Other",
    notes: "",
  });
  const [profileForm, setProfileForm] = useState({
    name: user.name,
    email: user.email,
  });
  const [preferencesForm, setPreferencesForm] = useState({
    preferredTheme: user.preferences?.preferredTheme || "light",
    defaultBudget:
      user.preferences?.defaultBudget === null ||
        user.preferences?.defaultBudget === undefined
        ? ""
        : String(user.preferences.defaultBudget),
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const loadIdRef = useRef(0);

  function pushFlash(type, message) {
    setFlash({ type, message });
  }

  function clearMessages() {
    setError("");
    setFlash(null);
  }

  async function loadMeta() {
    try {
      const response = await api.getMeta();
      setCategories(response.categories || FALLBACK_CATEGORIES);
    } catch {
      setCategories(FALLBACK_CATEGORIES);
    }
  }

  async function loadSettingsData() {
    const response = await api.getSettings();
    setSettingsData(response);
    setCurrentUser(response.user);
    setProfileForm({
      name: response.user.name,
      email: response.user.email,
    });
    setPreferencesForm({
      preferredTheme: response.user.preferences?.preferredTheme || "light",
      defaultBudget:
        response.user.preferences?.defaultBudget === null ||
          response.user.preferences?.defaultBudget === undefined
          ? ""
          : String(response.user.preferences.defaultBudget),
    });
  }

  async function loadRecurringTemplates() {
    const response = await api.getRecurringTemplates();
    setRecurringTemplates(response.templates || []);
  }

  async function loadWorkspaceData(month) {
    const requestId = ++loadIdRef.current;
    setLoadingWorkspace(true);
    setError("");

    try {
      const [dashboardResponse, reportResponse] = await Promise.all([
        api.getDashboard(month),
        api.getReports(month),
      ]);

      if (loadIdRef.current !== requestId) {
        return;
      }

      setDashboard(dashboardResponse.summary);
      setReports(reportResponse);
      setBudgetAmount(
        dashboardResponse.summary.budget === null
          ? ""
          : String(dashboardResponse.summary.budget),
      );
    } catch (loadError) {
      if (loadIdRef.current === requestId) {
        setError(loadError.message);
      }
    } finally {
      if (loadIdRef.current === requestId) {
        setLoadingWorkspace(false);
      }
    }
  }

  async function loadFilteredTransactions(month, nextFilters = filters) {
    setLoadingTransactions(true);

    try {
      const response = await api.getTransactions({
        month,
        type: nextFilters.type,
        category: nextFilters.category,
        query: nextFilters.query,
        includeRecurring: "true",
      });
      setTransactions(response.transactions || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoadingTransactions(false);
    }
  }

  useEffect(() => {
    loadMeta();
    loadSettingsData().catch((loadError) => setError(loadError.message));
    loadRecurringTemplates().catch((loadError) => setError(loadError.message));
  }, []);

  useEffect(() => {
    loadWorkspaceData(selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    loadFilteredTransactions(selectedMonth, filters);
  }, [selectedMonth, filters.type, filters.category, filters.query]);

  useEffect(() => {
    if (!flash) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setFlash(null);
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [flash]);

  const monthLabel = formatMonthLabel(selectedMonth);
  const statusMeta = getStatusMeta(dashboard);
  const StatusIcon = statusMeta.icon;
  const totalExpenses = Number(dashboard?.totalExpenses || 0);
  const totalIncome = Number(dashboard?.totalIncome || 0);
  const budgetValue =
    dashboard?.budget === null || dashboard?.budget === undefined
      ? null
      : Number(dashboard.budget);
  const progress =
    budgetValue && budgetValue > 0
      ? Math.min((totalExpenses / budgetValue) * 100, 100)
      : 0;
  const averageExpense =
    reports?.summary?.transactionCount && totalExpenses > 0
      ? totalExpenses / Math.max(reports.summary.transactionCount, 1)
      : null;
  const trendMaxExpense = Math.max(
    ...(reports?.monthlyTrend?.map((item) => Number(item.totalExpenses || 0)) || [1]),
    1,
  );
  const latestTransactions = transactions.slice(0, 5);

  const transactionInsights = useMemo(() => {
    if (!transactions.length) {
      return {
        latestTransactionDate: null,
        largestExpense: null,
        incomeCount: 0,
        recurringCount: 0,
      };
    }

    return transactions.reduce(
      (insights, transaction) => {
        const amount = Number(transaction.amount);
        const isLater =
          !insights.latestTransactionDate ||
          new Date(`${transaction.transactionDate}T00:00:00`) >
          new Date(`${insights.latestTransactionDate}T00:00:00`);

        return {
          latestTransactionDate: isLater
            ? transaction.transactionDate
            : insights.latestTransactionDate,
          largestExpense:
            transaction.type === "expense" &&
              (insights.largestExpense === null || amount > insights.largestExpense)
              ? amount
              : insights.largestExpense,
          incomeCount:
            insights.incomeCount + (transaction.type === "income" ? 1 : 0),
          recurringCount:
            insights.recurringCount + (transaction.isRecurring ? 1 : 0),
        };
      },
      {
        latestTransactionDate: null,
        largestExpense: null,
        incomeCount: 0,
        recurringCount: 0,
      },
    );
  }, [transactions]);

  function resetTransactionForm() {
    setTransactionForm({
      id: "",
      title: "",
      amount: "",
      transactionDate: `${selectedMonth}-01`,
      type: "expense",
      category: "Other",
      notes: "",
    });
  }

  function resetRecurringForm() {
    setRecurringForm({
      id: "",
      title: "",
      amount: "",
      startDate: `${selectedMonth}-01`,
      type: "expense",
      category: "Other",
      notes: "",
    });
  }

  async function reloadAfterMutation(message) {
    await Promise.all([
      loadWorkspaceData(selectedMonth),
      loadFilteredTransactions(selectedMonth, filters),
      loadRecurringTemplates(),
      loadSettingsData(),
    ]);
    pushFlash("success", message);
  }

  async function handleBudgetSubmit(event) {
    event.preventDefault();
    clearMessages();
    setSavingBudget(true);

    try {
      await api.saveBudget(selectedMonth, budgetAmount);
      await loadWorkspaceData(selectedMonth);
      pushFlash("success", `Budget saved for ${monthLabel}.`);
    } catch (budgetError) {
      setError(budgetError.message);
    } finally {
      setSavingBudget(false);
    }
  }

  async function handleTransactionSubmit(event) {
    event.preventDefault();
    clearMessages();
    setSavingTransaction(true);

    const payload = {
      title: transactionForm.title,
      amount: transactionForm.amount,
      transactionDate: transactionForm.transactionDate,
      type: transactionForm.type,
      category: transactionForm.category,
      notes: transactionForm.notes,
    };

    try {
      if (transactionForm.id) {
        await api.updateTransaction(transactionForm.id, payload);
      } else {
        await api.createTransaction(payload);
      }

      resetTransactionForm();
      await Promise.all([
        loadWorkspaceData(selectedMonth),
        loadFilteredTransactions(selectedMonth, filters),
      ]);
      pushFlash(
        "success",
        transactionForm.id ? "Transaction updated." : "Transaction added.",
      );
    } catch (transactionError) {
      setError(transactionError.message);
    } finally {
      setSavingTransaction(false);
    }
  }

  function handleEditTransaction(transaction) {
    if (transaction.isRecurring) {
      pushFlash("info", "Recurring entries are managed in the recurring templates panel.");
      setActiveView("transactions");
      return;
    }

    setTransactionForm({
      id: transaction.id,
      title: transaction.title,
      amount: String(transaction.amount),
      transactionDate: transaction.transactionDate,
      type: transaction.type || "expense",
      category: transaction.category || "Other",
      notes: transaction.notes || "",
    });
    setActiveView("transactions");
  }

  async function handleDeleteTransaction(id) {
    clearMessages();

    if (!window.confirm("Delete this transaction?")) {
      return;
    }

    try {
      await api.deleteTransaction(id);

      if (transactionForm.id === id) {
        resetTransactionForm();
      }

      await Promise.all([
        loadWorkspaceData(selectedMonth),
        loadFilteredTransactions(selectedMonth, filters),
      ]);
      pushFlash("success", "Transaction deleted.");
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function handleRecurringSubmit(event) {
    event.preventDefault();
    clearMessages();
    setSavingRecurring(true);

    const payload = {
      title: recurringForm.title,
      amount: recurringForm.amount,
      startDate: recurringForm.startDate,
      type: recurringForm.type,
      category: recurringForm.category,
      notes: recurringForm.notes,
    };

    try {
      if (recurringForm.id) {
        await api.updateRecurringTemplate(recurringForm.id, payload);
      } else {
        await api.createRecurringTemplate(payload);
      }

      resetRecurringForm();
      await Promise.all([
        loadRecurringTemplates(),
        loadWorkspaceData(selectedMonth),
        loadFilteredTransactions(selectedMonth, filters),
        loadSettingsData(),
      ]);
      pushFlash(
        "success",
        recurringForm.id ? "Recurring template updated." : "Recurring template created.",
      );
    } catch (recurringError) {
      setError(recurringError.message);
    } finally {
      setSavingRecurring(false);
    }
  }

  function handleEditRecurring(template) {
    setRecurringForm({
      id: template.id,
      title: template.title,
      amount: String(template.amount),
      startDate: template.startDate,
      type: template.type || "expense",
      category: template.category || "Other",
      notes: template.notes || "",
    });
  }

  async function handleDeleteRecurring(id) {
    clearMessages();

    if (!window.confirm("Delete this recurring template? Future generated entries will disappear.")) {
      return;
    }

    try {
      await api.deleteRecurringTemplate(id);
      if (recurringForm.id === id) {
        resetRecurringForm();
      }
      await Promise.all([
        loadRecurringTemplates(),
        loadWorkspaceData(selectedMonth),
        loadFilteredTransactions(selectedMonth, filters),
        loadSettingsData(),
      ]);
      pushFlash("success", "Recurring template deleted.");
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    clearMessages();
    setSavingProfile(true);

    try {
      const response = await api.updateProfile(profileForm);
      setCurrentUser(response.user);
      setSettingsData((current) => ({
        ...(current || {}),
        user: response.user,
      }));
      pushFlash("success", "Profile updated.");
    } catch (profileError) {
      setError(profileError.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePreferencesSubmit(event) {
    event.preventDefault();
    clearMessages();
    setSavingPreferences(true);

    try {
      const response = await api.updatePreferences({
        preferredTheme: preferencesForm.preferredTheme,
        defaultBudget: preferencesForm.defaultBudget,
      });
      setCurrentUser(response.user);
      setTheme(response.user.preferences.preferredTheme);
      setSettingsData((current) => ({
        ...(current || {}),
        user: response.user,
      }));
      await loadWorkspaceData(selectedMonth);
      pushFlash("success", "Preferences saved.");
    } catch (preferenceError) {
      setError(preferenceError.message);
    } finally {
      setSavingPreferences(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    clearMessages();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSavingPassword(true);

    try {
      await api.updatePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      pushFlash("success", "Password updated.");
    } catch (passwordError) {
      setError(passwordError.message);
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleThemeToggle() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);

    try {
      const response = await api.updatePreferences({
        preferredTheme: nextTheme,
      });
      setCurrentUser(response.user);
      setSettingsData((current) => ({
        ...(current || {}),
        user: response.user,
      }));
      setPreferencesForm((current) => ({
        ...current,
        preferredTheme: response.user.preferences.preferredTheme,
      }));
    } catch (toggleError) {
      setTheme(theme);
      setError(toggleError.message);
    }
  }

  async function handleExportData() {
    clearMessages();

    try {
      const payload = await api.exportData();
      downloadJson(`pesotrace-export-${selectedMonth}.json`, payload);
      pushFlash("success", "Data export downloaded.");
    } catch (exportError) {
      setError(exportError.message);
    }
  }

  async function handleClearData() {
    clearMessages();

    if (!window.confirm("Clear all of your transactions, budgets, and recurring templates?")) {
      return;
    }

    try {
      await api.clearData();
      resetTransactionForm();
      resetRecurringForm();
      await reloadAfterMutation("All finance data cleared.");
    } catch (clearError) {
      setError(clearError.message);
    }
  }

  function handleLogout() {
    if (!window.confirm("Log out of PesoTrace?")) {
      return;
    }

    logout();
  }

  const metricCards = [
    {
      icon: Wallet,
      label: "Monthly budget",
      value: formatCurrency(dashboard?.budget),
      detail:
        dashboard?.budgetSource === "default"
          ? "Using your default budget from Settings."
          : `Budget applied for ${monthLabel}.`,
    },
    {
      icon: TrendingDown,
      label: "Total expenses",
      value: formatCurrency(dashboard?.totalExpenses),
      detail: "All expense entries for the selected month.",
    },
    {
      icon: TrendingUp,
      label: "Total income",
      value: formatCurrency(dashboard?.totalIncome),
      detail: "Allowance and other income logged this month.",
    },
    {
      icon: PieChart,
      label: "Net balance",
      value: formatCurrency(dashboard?.netBalance),
      detail:
        dashboard?.netBalance >= 0
          ? "Income still covers this month's expenses."
          : "Expenses are higher than logged income.",
    },
  ];

  function renderDashboardView() {
    return (
      <>
        <section className="summary-hero panel panel-hero">
          <div className="summary-copy">
            <p className="eyebrow">
              <CalendarDays size={14} /> Monthly finance workspace
            </p>
            <h1>Welcome back, {getFirstName(user.name)}.</h1>
            <p className="summary-text">
              Review your budget, income, expenses, and recurring activity for{" "}
              {monthLabel} in one place.
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
                <StatusIcon size={13} /> {statusMeta.label}
              </span>
            </div>
          </div>

          <article className={`summary-card ${statusMeta.tone}`}>
            <div className="status-pill">
              <StatusIcon size={13} /> {statusMeta.label}
            </div>
            <p className="summary-card-label">Expense budget progress</p>
            <h2>{formatCurrency(totalExpenses)}</h2>
            <p className="summary-card-copy">
              {budgetValue !== null
                ? `Expenses tracked against ${formatCurrency(budgetValue)} for ${monthLabel}.`
                : "Set a budget in this month or use a default budget in Settings."}
            </p>
            <div className="progress-track" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>
            <p className="progress-caption">{statusMeta.description}</p>
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

        <section className="content-grid">
          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  <FileText size={12} /> Latest entries
                </p>
                <h2>Recent activity</h2>
              </div>
              <button
                className="secondary-button compact-button"
                type="button"
                onClick={() => setActiveView("transactions")}
              >
                Open transactions
              </button>
            </div>

            {latestTransactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Inbox size={22} />
                </div>
                <h3>No entries yet.</h3>
                <p>Add a transaction or recurring template to start building your summary.</p>
              </div>
            ) : (
              <div className="list-stack">
                {latestTransactions.map((transaction) => (
                  <div className="list-row" key={transaction.id}>
                    <div>
                      <strong>{transaction.title}</strong>
                      <p>
                        {formatDate(transaction.transactionDate)} - {transaction.category} -{" "}
                        {transaction.type}
                        {transaction.isRecurring ? " - recurring" : ""}
                      </p>
                    </div>
                    <strong
                      className={
                        transaction.type === "income" ? "amount-positive" : "amount-negative"
                      }
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  <BarChart3 size={12} /> Quick signals
                </p>
                <h2>At a glance</h2>
              </div>
            </div>
            <div className="insight-list">
              <div className="insight-item">
                <span>Largest expense</span>
                <strong>
                  {transactionInsights.largestExpense === null
                    ? "No data yet"
                    : formatCurrency(transactionInsights.largestExpense)}
                </strong>
              </div>
              <div className="insight-item">
                <span>Income entries</span>
                <strong>{transactionInsights.incomeCount}</strong>
              </div>
              <div className="insight-item">
                <span>Recurring entries this month</span>
                <strong>{transactionInsights.recurringCount}</strong>
              </div>
              <div className="insight-item">
                <span>Average expense</span>
                <strong>
                  {averageExpense === null ? "No data yet" : formatCurrency(averageExpense)}
                </strong>
              </div>
            </div>
          </article>
        </section>
      </>
    );
  }

  function renderTransactionsView() {
    return (
      <section className="workspace-grid">
        <div className="workspace-main">
          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  <Plus size={12} /> Entry form
                </p>
                <h2>{transactionForm.id ? "Edit transaction" : "Add transaction"}</h2>
              </div>
              {transactionForm.id ? (
                <button
                  className="secondary-button compact-button"
                  type="button"
                  onClick={resetTransactionForm}
                >
                  <X size={14} /> Cancel edit
                </button>
              ) : null}
            </div>

            <form className="stack-form" onSubmit={handleTransactionSubmit}>
              <label>
                <div className="field-label">
                  <span>Title</span>
                  <small>Use a clear label you can scan later.</small>
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
                  placeholder="Lunch, fare, school allowance"
                  required
                />
              </label>

              <div className="form-row">
                <label>
                  <div className="field-label">
                    <span>Type</span>
                    <small>Income or expense.</small>
                  </div>
                  <select
                    value={transactionForm.type}
                    onChange={(event) =>
                      setTransactionForm((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </label>

                <label>
                  <div className="field-label">
                    <span>Category</span>
                    <small>Group entries for reports.</small>
                  </div>
                  <select
                    value={transactionForm.category}
                    onChange={(event) =>
                      setTransactionForm((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

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
                  <small>Optional context or reminder.</small>
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
                  <Filter size={12} /> Filters and history
                </p>
                <h2>Transactions for {monthLabel}</h2>
              </div>
            </div>

            <div className="filter-grid">
              <label className="filter-field">
                <span>Search</span>
                <div className="input-with-icon">
                  <Search size={15} />
                  <input
                    type="search"
                    value={filters.query}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        query: event.target.value,
                      }))
                    }
                    placeholder="Title, note, category"
                  />
                </div>
              </label>

              <label className="filter-field">
                <span>Type</span>
                <select
                  value={filters.type}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                >
                  <option value="">All</option>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </label>

              <label className="filter-field">
                <span>Category</span>
                <select
                  value={filters.category}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                >
                  <option value="">All</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {loadingTransactions ? (
              <div className="empty-state">
                <h3>Loading transactions...</h3>
              </div>
            ) : transactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Inbox size={22} />
                </div>
                <h3>No matching transactions.</h3>
                <p>Try adjusting the filters or add your first entry for this month.</p>
              </div>
            ) : (
              <>
                <div className="table-wrap desktop-history">
                  <table className="transaction-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Title</th>
                        <th>Type</th>
                        <th>Category</th>
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
                              {transaction.isRecurring ? (
                                <span className="mini-badge">Recurring</span>
                              ) : null}
                            </div>
                          </td>
                          <td>{transaction.type}</td>
                          <td>{transaction.category}</td>
                          <td className="notes-cell">{transaction.notes || "-"}</td>
                          <td
                            className={
                              transaction.type === "income"
                                ? "amount-cell amount-positive"
                                : "amount-cell amount-negative"
                            }
                          >
                            {transaction.type === "income" ? "+" : "-"}
                            {formatCurrency(transaction.amount)}
                          </td>
                          <td className="action-cell">
                            <button
                              className="icon-btn"
                              type="button"
                              onClick={() => handleEditTransaction(transaction)}
                              title={transaction.isRecurring ? "Managed in recurring templates" : "Edit"}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="icon-btn danger"
                              type="button"
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              title="Delete"
                              disabled={transaction.isRecurring}
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
                    <article className="mobile-transaction-card" key={transaction.id}>
                      <div className="mobile-transaction-head">
                        <div>
                          <p className="mobile-transaction-title">{transaction.title}</p>
                          <span>
                            {formatDate(transaction.transactionDate)} - {transaction.category}
                          </span>
                        </div>
                        <strong
                          className={
                            transaction.type === "income"
                              ? "amount-cell amount-positive"
                              : "amount-cell amount-negative"
                          }
                        >
                          {transaction.type === "income" ? "+" : "-"}
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
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          disabled={transaction.isRecurring}
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
                  <Target size={12} /> Budget
                </p>
                <h2>Budget for {monthLabel}</h2>
              </div>
            </div>

            <form className="stack-form" onSubmit={handleBudgetSubmit}>
              <label>
                <div className="field-label">
                  <span>Monthly budget</span>
                  <small>
                    {dashboard?.budgetSource === "default"
                      ? "This month currently uses your default budget."
                      : "Override or set a budget for this month."}
                  </small>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetAmount}
                  onChange={(event) => setBudgetAmount(event.target.value)}
                  placeholder="Enter budget"
                  required
                />
              </label>
              <button className="primary-button" type="submit" disabled={savingBudget}>
                {savingBudget ? "Saving..." : "Save budget"}
              </button>
            </form>
          </article>

          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  <Repeat size={12} /> Recurring
                </p>
                <h2>{recurringForm.id ? "Edit recurring entry" : "Recurring templates"}</h2>
              </div>
              {recurringForm.id ? (
                <button
                  className="secondary-button compact-button"
                  type="button"
                  onClick={resetRecurringForm}
                >
                  <X size={14} /> Cancel edit
                </button>
              ) : null}
            </div>

            <form className="stack-form" onSubmit={handleRecurringSubmit}>
              <label>
                <div className="field-label">
                  <span>Title</span>
                  <small>Auto-generated monthly from the start date.</small>
                </div>
                <input
                  type="text"
                  value={recurringForm.title}
                  onChange={(event) =>
                    setRecurringForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Allowance, rent, internet"
                  required
                />
              </label>

              <div className="form-row">
                <label>
                  <div className="field-label">
                    <span>Type</span>
                    <small>Income or expense.</small>
                  </div>
                  <select
                    value={recurringForm.type}
                    onChange={(event) =>
                      setRecurringForm((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </label>
                <label>
                  <div className="field-label">
                    <span>Category</span>
                    <small>Used in reports.</small>
                  </div>
                  <select
                    value={recurringForm.category}
                    onChange={(event) =>
                      setRecurringForm((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label>
                  <div className="field-label">
                    <span>Amount</span>
                    <small>Peso amount every month.</small>
                  </div>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={recurringForm.amount}
                    onChange={(event) =>
                      setRecurringForm((current) => ({
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
                    <span>Start date</span>
                    <small>First month this applies.</small>
                  </div>
                  <input
                    type="date"
                    value={recurringForm.startDate}
                    onChange={(event) =>
                      setRecurringForm((current) => ({
                        ...current,
                        startDate: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
              </div>

              <label>
                <div className="field-label">
                  <span>Notes</span>
                  <small>Optional reminder or explanation.</small>
                </div>
                <textarea
                  rows="2"
                  value={recurringForm.notes}
                  onChange={(event) =>
                    setRecurringForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Optional details"
                />
              </label>

              <button className="primary-button" type="submit" disabled={savingRecurring}>
                {savingRecurring
                  ? "Saving..."
                  : recurringForm.id
                    ? "Update recurring template"
                    : "Create recurring template"}
              </button>
            </form>

            <div className="list-stack recurring-list">
              {recurringTemplates.length === 0 ? (
                <div className="empty-inline">No recurring templates yet.</div>
              ) : (
                recurringTemplates.map((template) => (
                  <div className="list-row list-row-compact" key={template.id}>
                    <div>
                      <strong>{template.title}</strong>
                      <p>
                        Starts {formatDate(template.startDate)} - {template.type} -{" "}
                        {template.category}
                      </p>
                    </div>
                    <div className="row-actions">
                      <strong
                        className={
                          template.type === "income" ? "amount-positive" : "amount-negative"
                        }
                      >
                        {template.type === "income" ? "+" : "-"}
                        {formatCurrency(template.amount)}
                      </strong>
                      <button
                        className="icon-btn"
                        type="button"
                        onClick={() => handleEditRecurring(template)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="icon-btn danger"
                        type="button"
                        onClick={() => handleDeleteRecurring(template.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>
      </section>
    );
  }

  function renderReportsView() {
    return (
      <section className="content-grid reports-grid">
        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <BarChart3 size={12} /> Trend
              </p>
              <h2>Monthly flow</h2>
            </div>
          </div>

          <div className="chart-list">
            {(reports?.monthlyTrend || []).map((item) => (
              <div className="chart-row" key={item.month}>
                <div className="chart-row-head">
                  <strong>{item.label}</strong>
                  <span>
                    Expense {formatCurrency(item.totalExpenses)} - Income{" "}
                    {formatCurrency(item.totalIncome)}
                  </span>
                </div>
                <div className="chart-bar-track">
                  <span
                    className="chart-bar-expense"
                    style={{
                      width: `${Math.max(
                        12,
                        (Number(item.totalExpenses || 0) / trendMaxExpense) * 100,
                      )}%`,
                    }}
                  />
                </div>
                <div className="chart-row-foot">
                  <span>Net {formatCurrency(item.netBalance)}</span>
                  <span>Budget {formatCurrency(item.budget)}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <PieChart size={12} /> Categories
              </p>
              <h2>Category breakdown</h2>
            </div>
          </div>

          {(reports?.categoryBreakdown || []).length === 0 ? (
            <div className="empty-inline">No category data for this month yet.</div>
          ) : (
            <div className="list-stack">
              {reports.categoryBreakdown.map((item) => (
                <div className="list-row list-row-compact" key={`${item.type}-${item.category}`}>
                  <div>
                    <strong>{item.category}</strong>
                    <p>{item.type}</p>
                  </div>
                  <strong
                    className={
                      item.type === "income" ? "amount-positive" : "amount-negative"
                    }
                  >
                    {item.type === "income" ? "+" : "-"}
                    {formatCurrency(item.amount)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <Activity size={12} /> Highlights
              </p>
              <h2>Monthly highlights</h2>
            </div>
          </div>
          <div className="insight-list">
            <div className="insight-item">
              <span>Largest expense</span>
              <strong>
                {reports?.highlights?.largestExpense
                  ? `${reports.highlights.largestExpense.title} - ${formatCurrency(
                    reports.highlights.largestExpense.amount,
                  )}`
                  : "No expense yet"}
              </strong>
            </div>
            <div className="insight-item">
              <span>Largest income</span>
              <strong>
                {reports?.highlights?.largestIncome
                  ? `${reports.highlights.largestIncome.title} - ${formatCurrency(
                    reports.highlights.largestIncome.amount,
                  )}`
                  : "No income yet"}
              </strong>
            </div>
            <div className="insight-item">
              <span>Top expense category</span>
              <strong>
                {reports?.highlights?.topExpenseCategory
                  ? `${reports.highlights.topExpenseCategory.category} - ${formatCurrency(
                    reports.highlights.topExpenseCategory.amount,
                  )}`
                  : "No expense category yet"}
              </strong>
            </div>
            <div className="insight-item">
              <span>Recurring templates</span>
              <strong>{reports?.highlights?.recurringTemplateCount || 0}</strong>
            </div>
          </div>
        </article>
      </section>
    );
  }

  function renderSettingsView() {
    return (
      <section className="content-grid settings-grid">
        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <User size={12} /> Profile
              </p>
              <h2>Account details</h2>
            </div>
          </div>
          <form className="stack-form" onSubmit={handleProfileSubmit}>
            <label>
              <div className="field-label">
                <span>Full name</span>
                <small>Displayed in the dashboard.</small>
              </div>
              <input
                type="text"
                value={profileForm.name}
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label>
              <div className="field-label">
                <span>Email</span>
                <small>Used for login.</small>
              </div>
              <input
                type="email"
                value={profileForm.email}
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                required
              />
            </label>
            <button className="primary-button" type="submit" disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save profile"}
            </button>
          </form>
        </article>

        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <Settings size={12} /> Preferences
              </p>
              <h2>Workspace defaults</h2>
            </div>
          </div>
          <form className="stack-form" onSubmit={handlePreferencesSubmit}>
            <label>
              <div className="field-label">
                <span>Preferred theme</span>
                <small>Applied across the app.</small>
              </div>
              <select
                value={preferencesForm.preferredTheme}
                onChange={(event) =>
                  setPreferencesForm((current) => ({
                    ...current,
                    preferredTheme: event.target.value,
                  }))
                }
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label>
              <div className="field-label">
                <span>Default monthly budget</span>
                <small>Used when a month has no custom budget.</small>
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={preferencesForm.defaultBudget}
                onChange={(event) =>
                  setPreferencesForm((current) => ({
                    ...current,
                    defaultBudget: event.target.value,
                  }))
                }
                placeholder="Leave blank to disable"
              />
            </label>
            <button
              className="primary-button"
              type="submit"
              disabled={savingPreferences}
            >
              {savingPreferences ? "Saving..." : "Save preferences"}
            </button>
          </form>
        </article>

        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <Lock size={12} /> Security
              </p>
              <h2>Change password</h2>
            </div>
          </div>
          <form className="stack-form" onSubmit={handlePasswordSubmit}>
            <label>
              <div className="field-label">
                <span>Current password</span>
              </div>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    currentPassword: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label>
              <div className="field-label">
                <span>New password</span>
              </div>
              <input
                type="password"
                minLength={6}
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    newPassword: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label>
              <div className="field-label">
                <span>Confirm new password</span>
              </div>
              <input
                type="password"
                minLength={6}
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
                required
              />
            </label>
            <button className="primary-button" type="submit" disabled={savingPassword}>
              {savingPassword ? "Saving..." : "Update password"}
            </button>
          </form>
        </article>

        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <Download size={12} /> Data tools
              </p>
              <h2>Export and reset</h2>
            </div>
          </div>

          <div className="list-stack">
            <div className="list-row list-row-compact">
              <div>
                <strong>Tracked transactions</strong>
                <p>{settingsData?.stats?.transactionCount || 0} saved entries</p>
              </div>
              <strong>{settingsData?.stats?.transactionCount || 0}</strong>
            </div>
            <div className="list-row list-row-compact">
              <div>
                <strong>Monthly budgets</strong>
                <p>{settingsData?.stats?.budgetCount || 0} configured months</p>
              </div>
              <strong>{settingsData?.stats?.budgetCount || 0}</strong>
            </div>
            <div className="list-row list-row-compact">
              <div>
                <strong>Recurring templates</strong>
                <p>{settingsData?.stats?.recurringCount || 0} active templates</p>
              </div>
              <strong>{settingsData?.stats?.recurringCount || 0}</strong>
            </div>
          </div>

          <div className="button-row">
            <button className="secondary-button" type="button" onClick={handleExportData}>
              <Download size={16} /> Export JSON
            </button>
            <button className="danger-button" type="button" onClick={handleClearData}>
              <Trash2 size={16} /> Clear finance data
            </button>
          </div>
        </article>
      </section>
    );
  }

  return (
    <main className="app-shell dashboard-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark small">PT</div>
          <div>
            <p className="eyebrow">
              <Activity size={12} /> PesoTrace workspace
            </p>
            <h2>{monthLabel} overview</h2>
          </div>
        </div>

        <div className="topbar-actions">
          <label className="month-picker">
            <span className="month-picker-label">Active month</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => {
                setSelectedMonth(event.target.value);
                setTransactionForm((current) => ({
                  ...current,
                  transactionDate: current.id ? current.transactionDate : `${event.target.value}-01`,
                }));
                setRecurringForm((current) => ({
                  ...current,
                  startDate: current.id ? current.startDate : `${event.target.value}-01`,
                }));
              }}
            />
          </label>

          <div className="user-chip">
            <strong>{getFirstName(user.name)}</strong>
            <span>{user.email}</span>
          </div>

          <button
            className="theme-toggle"
            type="button"
            onClick={handleThemeToggle}
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <button className="secondary-button" type="button" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <nav className="tab-nav" aria-label="Workspace sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeView === tab.id ? "active" : ""}`}
            type="button"
            onClick={() => setActiveView(tab.id)}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </nav>

      {flash ? (
        <p className={`banner banner-${flash.type}`}>
          <CheckCircle2 size={16} /> {flash.message}
        </p>
      ) : null}

      {error ? (
        <p className="banner-error">
          <AlertCircle size={16} /> {error}
        </p>
      ) : null}

      {loadingWorkspace ? (
        <section className="panel loading-panel">
          <h2>Refreshing your finance summary...</h2>
        </section>
      ) : (
        <>
          {activeView === "dashboard" ? renderDashboardView() : null}
          {activeView === "transactions" ? renderTransactionsView() : null}
          {activeView === "reports" ? renderReportsView() : null}
          {activeView === "settings" ? renderSettingsView() : null}
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
