import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../AuthContext";
import { api } from "../../api";
import { LogOut, Moon, Sun, Wallet, TrendingDown, TrendingUp, PieChart } from "lucide-react";
import { Routes, Route, useNavigate, useLocation, NavLink, Navigate } from "react-router-dom";

import { FALLBACK_CATEGORIES, TABS, TRANSACTION_FILTERS_STORAGE_KEY, ONBOARDING_DISMISS_STORAGE_KEY, LAST_EXPORT_STORAGE_KEY, DEFAULT_TRANSACTION_FILTERS } from "../../utils/constants";
import { formatCurrency, formatDate, formatMonthLabel, roundMoney, downloadJson, downloadText, escapeCsv, formatDateTime } from "../../utils/formatters";
import { getCurrentMonth, loadStoredTransactionFilters, buildTransactionFormFromSource, getStatusMeta } from "../../utils/helpers";
import { useTheme } from "../../hooks/useTheme";

import { ConfirmationModal } from "../../components/Common/ConfirmationModal";
import { MainDashboard } from "./views/MainDashboard";
import { TransactionsView } from "./views/TransactionsView";
import { ReportsView } from "./views/ReportsView";
import { SettingsView } from "./views/SettingsView";

function readStorageValue(key, fallback = "") {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function writeStorageValue(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures.
  }
}

function removeStorageValue(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

export function Dashboard() {
  const { user, logout, setCurrentUser } = useAuth();
  const { theme, setTheme } = useTheme(user);
  const navigate = useNavigate();
  const location = useLocation();
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
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
  const [filters, setFilters] = useState(loadStoredTransactionFilters);
  const [lastExportedAt, setLastExportedAt] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return readStorageValue(LAST_EXPORT_STORAGE_KEY);
  });
  const [checklistDismissed, setChecklistDismissed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return readStorageValue(ONBOARDING_DISMISS_STORAGE_KEY) === "true";
  });
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetTopUpAmount, setBudgetTopUpAmount] = useState("");
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
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [confirmingAction, setConfirmingAction] = useState(false);
  const loadIdRef = useRef(0);
  const monthPickerRef = useRef(null);

  function pushFlash(type, message) {
    setFlash({ type, message });
  }

  function clearMessages() {
    setError("");
    setFlash(null);
  }

  function openMonthPicker() {
    const monthInput = monthPickerRef.current;

    if (!monthInput) {
      return;
    }

    if (typeof monthInput.showPicker === "function") {
      try {
        monthInput.showPicker();
        return;
      } catch {
        // Ignore
      }
    }

    monthInput.focus();
    monthInput.click();
  }

  function openConfirmDialog(dialog) {
    setConfirmDialog(dialog);
  }

  function closeConfirmDialog() {
    if (confirmingAction) {
      return;
    }

    setConfirmDialog(null);
  }

  async function handleConfirmDialog() {
    if (!confirmDialog?.onConfirm) {
      return;
    }

    setConfirmingAction(true);

    try {
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } finally {
      setConfirmingAction(false);
    }
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
      setBudgetTopUpAmount("");
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
        startDate: nextFilters.startDate,
        endDate: nextFilters.endDate,
        sortBy: nextFilters.sortBy,
        sortOrder: nextFilters.sortOrder,
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
  }, [
    selectedMonth,
    filters.type,
    filters.category,
    filters.query,
    filters.startDate,
    filters.endDate,
    filters.sortBy,
    filters.sortOrder,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    writeStorageValue(TRANSACTION_FILTERS_STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    if (!flash) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setFlash(null);
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [flash]);

  useEffect(() => {
    if (!confirmDialog) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event) {
      if (event.key === "Escape" && !confirmingAction) {
        setConfirmDialog(null);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [confirmDialog, confirmingAction]);

  useEffect(() => {
    function handleWorkspaceShortcut(event) {
      if (confirmDialog) {
        return;
      }

      if (!(event.metaKey || event.ctrlKey) || !event.altKey || event.shiftKey) {
        return;
      }

      const target = event.target;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }

      const key = String(event.key || "").toLowerCase();

      if (key === "n") {
        event.preventDefault();
        handleStartNewTransaction();
      } else if (key === "r") {
        event.preventDefault();
        navigate("/dashboard/reports");
      } else if (key === "s") {
        event.preventDefault();
        navigate("/dashboard/settings");
      } else if (key === "d") {
        event.preventDefault();
        navigate("/dashboard");
      }
    }

    window.addEventListener("keydown", handleWorkspaceShortcut);
    return () => window.removeEventListener("keydown", handleWorkspaceShortcut);
  }, [confirmDialog, selectedMonth]);

  const monthLabel = formatMonthLabel(selectedMonth);
  const statusMeta = getStatusMeta(dashboard);
  const totalExpenses = Number(dashboard?.totalExpenses || 0);
  const totalIncome = Number(dashboard?.totalIncome || 0);
  const budgetValue =
    dashboard?.budget === null || dashboard?.budget === undefined
      ? null
      : Number(dashboard.budget);
  const monthlyBudgetLocked = dashboard?.budgetSource === "month";
  const budgetRemaining =
    budgetValue === null ? null : roundMoney(budgetValue - totalExpenses);
  const isOverBudget = budgetRemaining !== null && budgetRemaining < 0;
  let progress = 0;

  if (budgetValue !== null && budgetValue > 0) {
    progress = Math.min((totalExpenses / budgetValue) * 100, 100);
  } else if (budgetValue === 0 && totalExpenses > 0) {
    progress = 100;
  }
  const averageExpense =
    reports?.summary?.transactionCount && totalExpenses > 0
      ? totalExpenses / Math.max(reports.summary.transactionCount, 1)
      : null;
  const trendMaxExpense = Math.max(
    ...(reports?.monthlyTrend?.map((item) => Number(item.totalExpenses || 0)) || [1]),
    1,
  );
  const latestTransactions = transactions.slice(0, 5);
  const latestManualTransaction =
    transactions.find((transaction) => !transaction.isRecurring) || transactions[0] || null;
  const budgetCardLabel =
    budgetValue === null
      ? "Expense budget progress"
      : isOverBudget
        ? "Over budget"
        : "Remaining budget";
  const budgetCardHeadline =
    budgetValue === null
      ? formatCurrency(totalExpenses)
      : isOverBudget
        ? `Over by ${formatCurrency(Math.abs(budgetRemaining))}`
        : formatCurrency(budgetRemaining);
  const budgetCardCopy =
    budgetValue !== null
      ? isOverBudget
        ? `${formatCurrency(totalExpenses)} spent against ${formatCurrency(budgetValue)} for ${monthLabel}.`
        : `${formatCurrency(totalExpenses)} spent of ${formatCurrency(budgetValue)} for ${monthLabel}.`
      : "Set a budget in this month or use a default budget in Settings.";
  const selectedMonthDate = new Date(`${selectedMonth}-01T00:00:00`);
  const monthDays = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0).getDate();
  const currentMonthKey = getCurrentMonth();
  const monthProgressDays =
    selectedMonth === currentMonthKey ? new Date().getDate() : monthDays;
  const budgetPace =
    budgetValue === null
      ? null
      : roundMoney((budgetValue / monthDays) * monthProgressDays);
  const budgetPaceDelta = budgetPace === null ? null : roundMoney(budgetPace - totalExpenses);
  const budgetPaceCopy =
    budgetPaceDelta === null
      ? "Set a budget to see whether this month is ahead or behind pace."
      : budgetPaceDelta >= 0
        ? `${formatCurrency(budgetPaceDelta)} under the expected pace for ${monthLabel}.`
        : `${formatCurrency(Math.abs(budgetPaceDelta))} over the expected pace for ${monthLabel}.`;
  const recurringTotal = transactions.reduce((sum, transaction) => {
    if (!transaction.isRecurring) {
      return sum;
    }

    return sum + Number(transaction.amount || 0);
  }, 0);
  const monthlyTrend = reports?.monthlyTrend || [];
  const currentTrend = monthlyTrend[monthlyTrend.length - 1] || null;
  const previousTrend = monthlyTrend[monthlyTrend.length - 2] || null;
  const reportComparisons = currentTrend && previousTrend
    ? {
      expenseDelta: roundMoney(Number(currentTrend.totalExpenses || 0) - Number(previousTrend.totalExpenses || 0)),
      incomeDelta: roundMoney(Number(currentTrend.totalIncome || 0) - Number(previousTrend.totalIncome || 0)),
      budgetDelta: roundMoney(
        Number(currentTrend.budget || 0) - Number(previousTrend.budget || 0),
      ),
    }
    : null;
  const onboardingChecklist = useMemo(() => {
    const profileComplete = Boolean(
      settingsData?.user?.name?.trim() && settingsData?.user?.email?.trim(),
    );
    const budgetReady = budgetValue !== null;
    const transactionReady = (settingsData?.stats?.transactionCount || 0) > 0;
    const recurringReady = (settingsData?.stats?.recurringCount || 0) > 0;

    return [
      {
        id: "profile",
        label: "Profile details saved",
        complete: profileComplete,
      },
      {
        id: "budget",
        label: "Budget added for this month",
        complete: budgetReady,
      },
      {
        id: "transactions",
        label: "First transaction recorded",
        complete: transactionReady,
      },
      {
        id: "recurring",
        label: "Recurring template created",
        complete: recurringReady,
      },
    ];
  }, [budgetValue, settingsData?.stats?.recurringCount, settingsData?.stats?.transactionCount, settingsData?.user?.email, settingsData?.user?.name]);
  const onboardingComplete = onboardingChecklist.every((item) => item.complete);
  const onboardingProgress = onboardingChecklist.filter((item) => item.complete).length;

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

  function handleStartNewTransaction(source = null) {
    clearMessages();
    setTransactionForm(
      source ? buildTransactionFormFromSource(source, selectedMonth) : {
        id: "",
        title: "",
        amount: "",
        transactionDate: `${selectedMonth}-01`,
        type: "expense",
        category: "Other",
        notes: "",
      },
    );
    navigate("/dashboard/transactions");
  }

  function handleDuplicateTransaction(transaction) {
    handleStartNewTransaction(transaction);
    pushFlash("info", "Transaction duplicated into the entry form.");
  }

  function handleUseRecurringTemplate(template) {
    handleStartNewTransaction({
      ...template,
      transactionDate: template.startDate,
    });
    pushFlash("info", "Recurring template copied into the entry form.");
  }

  function clearTransactionFilters() {
    setFilters(DEFAULT_TRANSACTION_FILTERS);
  }

  function dismissOnboardingChecklist() {
    setChecklistDismissed(true);
    if (typeof window !== "undefined") {
      writeStorageValue(ONBOARDING_DISMISS_STORAGE_KEY, "true");
    }
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

  async function submitBudgetChange(mode, amount, successMessage) {
    clearMessages();
    setSavingBudget(true);

    try {
      await api.saveBudget(selectedMonth, amount, mode);
      await loadWorkspaceData(selectedMonth);

      if (mode === "add") {
        setBudgetTopUpAmount("");
      }

      pushFlash("success", successMessage);
    } catch (budgetError) {
      setError(budgetError.message);
    } finally {
      setSavingBudget(false);
    }
  }

  async function handleBudgetSubmit(event) {
    event.preventDefault();
    await submitBudgetChange("set", budgetAmount, `Budget saved for ${monthLabel}.`);
  }

  async function handleBudgetTopUp(event) {
    event.preventDefault();
    await submitBudgetChange("add", budgetTopUpAmount, `Budget topped up for ${monthLabel}.`);
  }

  async function handleReportOutput() {
    clearMessages();
    navigate("/dashboard/reports");

    const previousTitle = document.title;
    document.title = `PesoTrace - ${monthLabel} report`;

    window.addEventListener(
      "afterprint",
      () => {
        document.title = previousTitle;
      },
      { once: true },
    );

    window.requestAnimationFrame(() => {
      window.print();
    });
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
      navigate("/dashboard/transactions");
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
    navigate("/dashboard/transactions");
  }

  async function handleDeleteTransaction(id) {
    clearMessages();

    openConfirmDialog({
      eyebrow: "Delete transaction",
      title: "Remove this transaction?",
      description: "This entry will be removed from the current month summary and transaction history.",
      note: "This action cannot be undone.",
      confirmLabel: "Delete transaction",
      pendingLabel: "Deleting...",
      tone: "danger",
      icon: null,
      onConfirm: async () => {
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
      },
    });
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

    openConfirmDialog({
      eyebrow: "Delete recurring template",
      title: "Delete this recurring template?",
      description: "Future generated monthly entries from this template will stop appearing in your workspace.",
      note: "Previously saved manual transactions will stay untouched.",
      confirmLabel: "Delete template",
      pendingLabel: "Deleting...",
      tone: "danger",
      icon: null,
      onConfirm: async () => {
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
      },
    });
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
      const exportedAt = payload.exportedAt || new Date().toISOString();
      setLastExportedAt(exportedAt);
      if (typeof window !== "undefined") {
        writeStorageValue(LAST_EXPORT_STORAGE_KEY, exportedAt);
      }
      pushFlash("success", "Data export downloaded.");
    } catch (exportError) {
      setError(exportError.message);
    }
  }

  async function handleExportCsv() {
    clearMessages();

    try {
      const payload = await api.exportData();
      const headers = [
        "date",
        "title",
        "type",
        "category",
        "amount",
        "notes",
        "recurring",
      ];
      const rows = (payload.transactions || []).map((transaction) => [
        transaction.transactionDate,
        transaction.title,
        transaction.type,
        transaction.category,
        transaction.amount,
        transaction.notes || "",
        transaction.isRecurring ? "yes" : "no",
      ]);
      const csv = [headers.join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join(
        "\n",
      );

      downloadText(`pesotrace-transactions-${selectedMonth}.csv`, csv, "text/csv;charset=utf-8");
      pushFlash("success", "Transactions CSV downloaded.");
    } catch (exportError) {
      setError(exportError.message);
    }
  }

  async function handleClearData() {
    clearMessages();

    openConfirmDialog({
      eyebrow: "Clear finance data",
      title: "Clear all tracked finance data?",
      description: "This will remove all saved transactions, monthly budgets, and recurring templates from your account.",
      note: "Your account profile, password, and display preferences will remain.",
      confirmLabel: "Clear all data",
      pendingLabel: "Clearing...",
      tone: "danger",
      icon: null,
      onConfirm: async () => {
        try {
          await api.clearData();
          resetTransactionForm();
          resetRecurringForm();
          clearTransactionFilters();
          setBudgetAmount("");
          setBudgetTopUpAmount("");
          setLastExportedAt("");
          setChecklistDismissed(false);
          if (typeof window !== "undefined") {
            removeStorageValue(TRANSACTION_FILTERS_STORAGE_KEY);
            removeStorageValue(LAST_EXPORT_STORAGE_KEY);
            removeStorageValue(ONBOARDING_DISMISS_STORAGE_KEY);
          }
          await reloadAfterMutation("All finance data cleared.");
        } catch (clearError) {
          setError(clearError.message);
        }
      },
    });
  }

  function handleLogout() {
    openConfirmDialog({
      eyebrow: "End session",
      title: "Log out of PesoTrace?",
      description: "You will be signed out of this workspace and will need to log in again to continue.",
      confirmLabel: "Log out",
      pendingLabel: "Logging out...",
      tone: "accent",
      icon: LogOut,
      onConfirm: async () => {
        logout();
      },
    });
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

  if (loadingWorkspace) {
    return (
      <main className="app-shell">
        <section className="panel loading-panel">
          <div>
            <p className="eyebrow">PesoTrace</p>
            <h2>Loading your workspace...</h2>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell workspace-shell">
      <header className="workspace-header">
        <nav className="workspace-nav">
          <div className="nav-brand">
            <div className="brand-mark">PT</div>
            <span>PesoTrace</span>
          </div>

          <div className="nav-group">
            {TABS.map((tab) => (
              <NavLink
                key={tab.id}
                to={tab.id === "dashboard" ? "/dashboard" : `/dashboard/${tab.id}`}
                end={tab.id === "dashboard"}
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="nav-group nav-group-end">
            <div className="month-selector">
              <input
                type="month"
                ref={monthPickerRef}
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                aria-label="Select month"
              />
              <button type="button" className="month-display" onClick={openMonthPicker}>
                {monthLabel}
              </button>
            </div>

            <button
              className="icon-btn"
              onClick={handleThemeToggle}
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <button
              className="icon-btn danger"
              onClick={handleLogout}
              aria-label="Log out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </nav>
      </header>

      <div className="workspace-body">
        <Routes>
          <Route
            index
            element={
              <MainDashboard
                user={user}
                monthLabel={monthLabel}
                dashboard={dashboard}
                transactionInsights={transactionInsights}
                statusMeta={statusMeta}
                budgetCardLabel={budgetCardLabel}
                budgetCardHeadline={budgetCardHeadline}
                budgetCardCopy={budgetCardCopy}
                progress={progress}
                budgetPaceCopy={budgetPaceCopy}
                metricCards={metricCards}
                latestTransactions={latestTransactions}
                setActiveView={(view) => navigate(`/dashboard/${view}`)}
                averageExpense={averageExpense}
                onboardingComplete={onboardingComplete}
                checklistDismissed={checklistDismissed}
                dismissOnboardingChecklist={dismissOnboardingChecklist}
                onboardingChecklist={onboardingChecklist}
                onboardingProgress={onboardingProgress}
                handleStartNewTransaction={handleStartNewTransaction}
              />
            }
          />
          <Route
            path="transactions"
            element={
              <TransactionsView
                monthLabel={monthLabel}
                transactionForm={transactionForm}
                latestManualTransaction={latestManualTransaction}
                handleStartNewTransaction={handleStartNewTransaction}
                resetTransactionForm={resetTransactionForm}
                handleTransactionSubmit={handleTransactionSubmit}
                setTransactionForm={setTransactionForm}
                savingTransaction={savingTransaction}
                categories={categories}
                handleEditTransaction={handleEditTransaction}
                handleDeleteTransaction={handleDeleteTransaction}
                handleDuplicateTransaction={handleDuplicateTransaction}
                clearTransactionFilters={clearTransactionFilters}
                filters={filters}
                setFilters={setFilters}
                loadingTransactions={loadingTransactions}
                transactions={transactions}
                budgetAmount={budgetAmount}
                setBudgetAmount={setBudgetAmount}
                handleBudgetSubmit={handleBudgetSubmit}
                savingBudget={savingBudget}
                monthlyBudgetLocked={monthlyBudgetLocked}
                budgetTopUpAmount={budgetTopUpAmount}
                setBudgetTopUpAmount={setBudgetTopUpAmount}
                handleBudgetTopUp={handleBudgetTopUp}
                recurringForm={recurringForm}
                resetRecurringForm={resetRecurringForm}
                handleRecurringSubmit={handleRecurringSubmit}
                setRecurringForm={setRecurringForm}
                savingRecurring={savingRecurring}
                recurringTemplates={recurringTemplates}
                handleUseRecurringTemplate={handleUseRecurringTemplate}
                handleEditRecurring={handleEditRecurring}
                handleDeleteRecurring={handleDeleteRecurring}
              />
            }
          />
          <Route
            path="reports"
            element={
              <ReportsView
                monthLabel={monthLabel}
                handleReportOutput={handleReportOutput}
                reports={reports}
                trendMaxExpense={trendMaxExpense}
                reportComparisons={reportComparisons}
                transactions={transactions}
                recurringTotal={recurringTotal}
              />
            }
          />
          <Route
            path="settings"
            element={
              <SettingsView
                handleProfileSubmit={handleProfileSubmit}
                profileForm={profileForm}
                setProfileForm={setProfileForm}
                savingProfile={savingProfile}
                handlePreferencesSubmit={handlePreferencesSubmit}
                preferencesForm={preferencesForm}
                setPreferencesForm={setPreferencesForm}
                savingPreferences={savingPreferences}
                handlePasswordSubmit={handlePasswordSubmit}
                passwordForm={passwordForm}
                setPasswordForm={setPasswordForm}
                savingPassword={savingPassword}
                settingsData={settingsData}
                lastExportedAt={lastExportedAt}
                formatDateTime={formatDateTime}
                handleExportData={handleExportData}
                handleExportCsv={handleExportCsv}
                handleClearData={handleClearData}
              />
            }
          />
          {/* Redirect to main dashboard if unknown subpath */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>

      {flash ? (
        <div className={`flash flash-${flash.type}`} role="status">
          {flash.message}
        </div>
      ) : null}

      {error ? (
        <div className="flash flash-danger" role="alert">
          {error}
        </div>
      ) : null}

      <ConfirmationModal
        dialog={confirmDialog}
        submitting={confirmingAction}
        onCancel={closeConfirmDialog}
        onConfirm={handleConfirmDialog}
      />
    </main>
  );
}
