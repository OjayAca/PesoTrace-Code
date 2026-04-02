const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

export const api = {
  setToken,
  getStoredToken() {
    return authToken;
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
  getTransactions(month) {
    const suffix = month ? `?month=${encodeURIComponent(month)}` : "";
    return request(`/transactions${suffix}`);
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
};

