import cors from "cors";
import express from "express";
import { requireAuth, requireTrustedOrigin } from "./auth.js";
import { DEFAULT_CATEGORIES } from "./finance.js";
import { isAllowedOrigin } from "./utils/helpers.js";
import * as authController from "./controllers/auth.js";
import * as financeController from "./controllers/finance.js";
import * as settingsController from "./controllers/settings.js";

export function createApp({ store, clientOrigin = "http://localhost:5173" } = {}) {
  if (!store) {
    throw new Error("A store is required.");
  }

  const requiredMethods = [
    "getSnapshot",
    "getUserById",
    "getUserByEmail",
    "createUser",
    "updateUserProfile",
    "updateUserPreferences",
    "updateUserPassword",
    "getUserOverview",
    "getUserFinanceSnapshot",
    "getMonthlySummary",
    "getReports",
    "listUserTransactions",
    "getUserRecurringTemplates",
    "createTransaction",
    "findTransaction",
    "updateTransaction",
    "deleteTransaction",
    "upsertBudget",
    "saveBudget",
    "getUserStats",
    "clearUserData",
    "createRecurringTemplate",
    "findRecurringTemplate",
    "updateRecurringTemplate",
    "deleteRecurringTemplate",
  ];

  for (const methodName of requiredMethods) {
    if (typeof store[methodName] !== "function") {
      throw new Error(`Store method ${methodName} is required.`);
    }
  }

  const app = express();
  const requireTrustedSessionOrigin = requireTrustedOrigin(clientOrigin);

  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        callback(null, isAllowedOrigin(origin, clientOrigin));
      },
    }),
  );
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/meta", (_req, res) => {
    res.json({
      categories: DEFAULT_CATEGORIES,
      transactionTypes: ["expense", "income"],
    });
  });

  // Auth
  app.post("/api/auth/register", authController.register(store));
  app.post("/api/auth/login", authController.login(store));
  app.post("/api/auth/logout", requireAuth, requireTrustedSessionOrigin, authController.logout());
  app.get("/api/auth/me", requireAuth, authController.me(store));

  // Finance
  app.get("/api/dashboard", requireAuth, financeController.getDashboard(store));
  app.get("/api/reports", requireAuth, financeController.getReportsView(store));
  app.get("/api/transactions", requireAuth, financeController.getTransactions(store));
  app.post("/api/transactions", requireAuth, requireTrustedSessionOrigin, financeController.createTransaction(store));
  app.put("/api/transactions/:id", requireAuth, requireTrustedSessionOrigin, financeController.updateTransaction(store));
  app.delete("/api/transactions/:id", requireAuth, requireTrustedSessionOrigin, financeController.deleteTransaction(store));
  app.put("/api/budgets/:month", requireAuth, requireTrustedSessionOrigin, financeController.upsertBudget(store));
  app.get("/api/recurring-templates", requireAuth, financeController.getRecurringTemplatesList(store));
  app.post("/api/recurring-templates", requireAuth, requireTrustedSessionOrigin, financeController.createRecurringTemplate(store));
  app.put("/api/recurring-templates/:id", requireAuth, requireTrustedSessionOrigin, financeController.updateRecurringTemplate(store));
  app.delete("/api/recurring-templates/:id", requireAuth, requireTrustedSessionOrigin, financeController.deleteRecurringTemplate(store));

  // Settings
  app.get("/api/settings", requireAuth, settingsController.getSettings(store));
  app.put("/api/settings/profile", requireAuth, requireTrustedSessionOrigin, settingsController.updateProfile(store));
  app.put("/api/settings/preferences", requireAuth, requireTrustedSessionOrigin, settingsController.updatePreferences(store));
  app.put("/api/settings/password", requireAuth, requireTrustedSessionOrigin, settingsController.updatePassword(store));
  app.get("/api/settings/export", requireAuth, settingsController.exportData(store));
  app.delete("/api/settings/data", requireAuth, requireTrustedSessionOrigin, settingsController.clearData(store));

  return app;
}
