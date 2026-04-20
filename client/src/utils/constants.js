import { Wallet, FileText, BarChart3, Settings } from "lucide-react";

export const FALLBACK_CATEGORIES = [
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

export const TABS = [
  { id: "dashboard", label: "Dashboard", icon: Wallet },
  { id: "transactions", label: "Transactions", icon: FileText },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

export const TRANSACTION_FILTERS_STORAGE_KEY = "pesotrace-transaction-filters";
export const ONBOARDING_DISMISS_STORAGE_KEY = "pesotrace-onboarding-dismissed";
export const LAST_EXPORT_STORAGE_KEY = "pesotrace-last-exported-at";
export const THEME_STORAGE_KEY = "pesotrace-theme";

export const DEFAULT_TRANSACTION_FILTERS = {
  type: "",
  category: "",
  query: "",
  startDate: "",
  endDate: "",
  sortBy: "date",
  sortOrder: "desc",
};
