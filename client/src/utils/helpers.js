import { TRANSACTION_FILTERS_STORAGE_KEY, DEFAULT_TRANSACTION_FILTERS } from "./constants";
import { Target, ShieldCheck, Activity, AlertCircle } from "lucide-react";
import { roundMoney } from "./formatters";

export function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function loadStoredTransactionFilters() {
  if (typeof window === "undefined") {
    return DEFAULT_TRANSACTION_FILTERS;
  }

  try {
    const stored = JSON.parse(localStorage.getItem(TRANSACTION_FILTERS_STORAGE_KEY) || "null");
    if (!stored || typeof stored !== "object") {
      return DEFAULT_TRANSACTION_FILTERS;
    }

    return {
      ...DEFAULT_TRANSACTION_FILTERS,
      type: String(stored.type || ""),
      category: String(stored.category || ""),
      query: String(stored.query || ""),
      startDate: String(stored.startDate || ""),
      endDate: String(stored.endDate || ""),
      sortBy: String(stored.sortBy || "date"),
      sortOrder: String(stored.sortOrder || "desc"),
    };
  } catch {
    return DEFAULT_TRANSACTION_FILTERS;
  }
}

export function buildMonthDate(month, sourceDate = "") {
  const day = String(sourceDate || "").slice(8, 10) || "01";
  return `${month}-${day}`;
}

export function buildTransactionFormFromSource(source, month = getCurrentMonth()) {
  if (!source) {
    return null;
  }

  return {
    id: "",
    title: source.title || "",
    amount: String(source.amount ?? ""),
    transactionDate:
      source.transactionDate && source.transactionDate.startsWith(month)
        ? source.transactionDate
        : buildMonthDate(month, source.transactionDate || source.startDate || ""),
    type: source.type || "expense",
    category: source.category || "Other",
    notes: source.notes || "",
  };
}

export function getStatusMeta(summary) {
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
