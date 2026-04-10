const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export const AUTH_EXPIRED_EVENT = "pesotrace:auth-expired";

let authToken = localStorage.getItem("pesotrace-token");

function setToken(token) {
  authToken = token;

  if (token) {
    localStorage.setItem("pesotrace-token", token);
    return;
  }

  localStorage.removeItem("pesotrace-token");
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (
    response.status === 401 &&
    authToken &&
    !path.startsWith("/auth/login") &&
    !path.startsWith("/auth/register")
  ) {
    setToken(null);
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

function toQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === "" || value === null || value === undefined) {
      continue;
    }

    searchParams.set(key, value);
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export const api = {
  setToken,
  getStoredToken() {
    return authToken;
  },
  getMeta() {
    return request("/meta");
  },
  register(payload) {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  login(payload) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  me() {
    return request("/auth/me");
  },
  getDashboard(month) {
    return request(`/dashboard?month=${encodeURIComponent(month)}`);
  },
  getReports(month, months = 6) {
    return request(
      `/reports${toQueryString({
        month,
        months,
      })}`,
    );
  },
  getTransactions(params = {}) {
    return request(`/transactions${toQueryString(params)}`);
  },
  saveBudget(month, amount) {
    return request(`/budgets/${encodeURIComponent(month)}`, {
      method: "PUT",
      body: JSON.stringify({ amount }),
    });
  },
  createTransaction(payload) {
    return request("/transactions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateTransaction(id, payload) {
    return request(`/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  deleteTransaction(id) {
    return request(`/transactions/${id}`, {
      method: "DELETE",
    });
  },
  getSettings() {
    return request("/settings");
  },
  updateProfile(payload) {
    return request("/settings/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  updatePreferences(payload) {
    return request("/settings/preferences", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  updatePassword(payload) {
    return request("/settings/password", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  exportData() {
    return request("/settings/export");
  },
  clearData() {
    return request("/settings/data", {
      method: "DELETE",
    });
  },
  getRecurringTemplates() {
    return request("/recurring-templates");
  },
  createRecurringTemplate(payload) {
    return request("/recurring-templates", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateRecurringTemplate(id, payload) {
    return request(`/recurring-templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  deleteRecurringTemplate(id) {
    return request(`/recurring-templates/${id}`, {
      method: "DELETE",
    });
  },
};
