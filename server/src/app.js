import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { requireAuth, requireTrustedOrigin, requireTrustedRequestOrigin } from "./auth.js";
import { DEFAULT_CATEGORIES } from "./finance.js";
import { isAllowedOrigin } from "./utils/helpers.js";
import { safeErrorResponse } from "./utils/errors.js";
import { asyncHandler } from "./middleware/asyncHandler.js";
import { createEmailService } from "./email.js";
import * as authController from "./controllers/auth.js";
import * as financeController from "./controllers/finance.js";
import * as settingsController from "./controllers/settings.js";

function createLimiter(options = {}) {
  return rateLimit({
    windowMs: options.windowMs ?? 15 * 60 * 1000,
    max: options.max ?? 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: options.message ?? "Too many requests. Please try again later.",
    },
  });
}

export function createApp({
  store,
  clientOrigin = "http://localhost:5173",
  env = process.env,
  rateLimits = {},
  emailService = createEmailService(env),
} = {}) {
  if (!store) {
    throw new Error("A store is required.");
  }

  const requiredMethods = [
    "getSnapshot",
    "getUserById",
    "getUserByEmail",
    "getUserByPasswordResetTokenHash",
    "createUser",
    "updateUserProfile",
    "updateUserPreferences",
    "updateUserPassword",
    "setPasswordResetToken",
    "clearPasswordResetToken",
    "incrementUserLoginFailure",
    "resetUserLoginFailures",
    "incrementUserPasswordFailure",
    "resetUserPasswordFailures",
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
  const requireTrustedAuthOrigin = requireTrustedRequestOrigin(clientOrigin);
  const registerRateLimit = createLimiter(rateLimits.auth);
  const loginRateLimit = createLimiter(rateLimits.auth);
  const passwordRateLimit = createLimiter({
    max: 5,
    ...rateLimits.password,
  });
  const passwordResetRateLimit = createLimiter({
    max: 5,
    ...rateLimits.passwordReset,
  });
  const settingsRateLimit = createLimiter({
    max: 30,
    ...rateLimits.settings,
  });

  if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(helmet());
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        callback(null, isAllowedOrigin(origin, clientOrigin));
      },
    }),
  );
  app.use(express.json({ limit: "100kb" }));

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
  app.post("/api/auth/register", requireTrustedAuthOrigin, registerRateLimit, asyncHandler(authController.register(store)));
  app.post("/api/auth/login", requireTrustedAuthOrigin, loginRateLimit, asyncHandler(authController.login(store)));
  app.post("/api/auth/password-reset/request", requireTrustedAuthOrigin, passwordResetRateLimit, asyncHandler(authController.requestPasswordReset(store, emailService)));
  app.post("/api/auth/password-reset/confirm", requireTrustedAuthOrigin, passwordResetRateLimit, asyncHandler(authController.confirmPasswordReset(store)));
  app.post("/api/auth/logout", requireAuth, requireTrustedSessionOrigin, asyncHandler(authController.logout()));
  app.get("/api/auth/me", requireAuth, asyncHandler(authController.me(store)));

  // Finance
  app.get("/api/dashboard", requireAuth, asyncHandler(financeController.getDashboard(store)));
  app.get("/api/reports", requireAuth, asyncHandler(financeController.getReportsView(store)));
  app.get("/api/transactions", requireAuth, asyncHandler(financeController.getTransactions(store)));
  app.post("/api/transactions", requireAuth, requireTrustedSessionOrigin, asyncHandler(financeController.createTransaction(store)));
  app.put("/api/transactions/:id", requireAuth, requireTrustedSessionOrigin, asyncHandler(financeController.updateTransaction(store)));
  app.delete("/api/transactions/:id", requireAuth, requireTrustedSessionOrigin, asyncHandler(financeController.deleteTransaction(store)));
  app.put("/api/budgets/:month", requireAuth, requireTrustedSessionOrigin, asyncHandler(financeController.upsertBudget(store)));
  app.get("/api/recurring-templates", requireAuth, asyncHandler(financeController.getRecurringTemplatesList(store)));
  app.post("/api/recurring-templates", requireAuth, requireTrustedSessionOrigin, asyncHandler(financeController.createRecurringTemplate(store)));
  app.put("/api/recurring-templates/:id", requireAuth, requireTrustedSessionOrigin, asyncHandler(financeController.updateRecurringTemplate(store)));
  app.delete("/api/recurring-templates/:id", requireAuth, requireTrustedSessionOrigin, asyncHandler(financeController.deleteRecurringTemplate(store)));

  // Settings
  app.get("/api/settings", requireAuth, settingsRateLimit, asyncHandler(settingsController.getSettings(store)));
  app.put("/api/settings/profile", requireAuth, requireTrustedSessionOrigin, settingsRateLimit, asyncHandler(settingsController.updateProfile(store)));
  app.put("/api/settings/preferences", requireAuth, requireTrustedSessionOrigin, settingsRateLimit, asyncHandler(settingsController.updatePreferences(store)));
  app.put("/api/settings/password", requireAuth, requireTrustedSessionOrigin, passwordRateLimit, asyncHandler(settingsController.updatePassword(store)));
  app.get("/api/settings/export", requireAuth, settingsRateLimit, asyncHandler(settingsController.exportData(store)));
  app.delete("/api/settings/data", requireAuth, requireTrustedSessionOrigin, settingsRateLimit, asyncHandler(settingsController.clearData(store)));

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    const { status, message } = safeErrorResponse(error, req, env);
    return res.status(status).json({ message });
  });

  return app;
}
