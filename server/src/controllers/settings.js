import bcrypt from "bcryptjs";
import { getRecurringTemplates } from "../finance.js";
import { checkPasswordChangeAllowed, getPasswordFailureLockout } from "./auth.js";
import { ClientError } from "../utils/errors.js";
import { getBcryptRounds } from "../utils/bcryptConfig.js";
import { sanitizeUser, isValidEmail, isDuplicateEntryError, buildUserPreferences } from "../utils/helpers.js";

function getClientPayload(readPayload) {
  try {
    return readPayload();
  } catch (error) {
    throw new ClientError(error.message);
  }
}

export function getSettings(store) {
  return async (req, res) => {
    const overview = await store.getUserOverview(req.auth.userId);

    if (!overview) {
      throw new ClientError("User account no longer exists.", 404);
    }

    return res.json({
      user: sanitizeUser(overview.user),
      stats: overview.stats,
    });
  };
}

export function updateProfile(store) {
  return async (req, res) => {
    const user = await store.getUserById(req.auth.userId);

    if (!user) {
      throw new ClientError("User account no longer exists.", 404);
    }

    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!name || !email) {
      throw new ClientError("Name and email are required.");
    }

    if (!isValidEmail(email)) {
      throw new ClientError("Email must be a valid email address.");
    }

    const existingUser = await store.getUserByEmail(email);

    if (existingUser && existingUser.id !== req.auth.userId) {
      throw new ClientError("That email is already registered.", 409);
    }

    let updatedUser;
    try {
      updatedUser = await store.updateUserProfile(req.auth.userId, {
        name,
        email,
      });
    } catch (error) {
      if (isDuplicateEntryError(error)) {
        throw new ClientError("That email is already registered.", 409);
      }

      throw error;
    }

    return res.json({ user: sanitizeUser(updatedUser) });
  };
}

export function updatePreferences(store) {
  return async (req, res) => {
    const user = await store.getUserById(req.auth.userId);

    if (!user) {
      throw new ClientError("User account no longer exists.", 404);
    }

    const preferences = getClientPayload(() => buildUserPreferences(user, req.body));
    const updatedUser = await store.updateUserPreferences(req.auth.userId, preferences);

    return res.json({ user: sanitizeUser(updatedUser) });
  };
}

export function updatePassword(store) {
  return async (req, res) => {
    const user = await store.getUserById(req.auth.userId);

    if (!user) {
      throw new ClientError("User account no longer exists.", 404);
    }

    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");

    if (!currentPassword || !newPassword) {
      throw new ClientError("Current password and new password are required.");
    }

    if (newPassword.length < 6) {
      throw new ClientError("New password must be at least 6 characters.");
    }

    checkPasswordChangeAllowed(user);

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isMatch) {
      const updatedUser = await store.incrementUserPasswordFailure(
        req.auth.userId,
        getPasswordFailureLockout(),
      );

      checkPasswordChangeAllowed(updatedUser || user);
      throw new ClientError("Current password is incorrect.", 401);
    }

    await store.updateUserPassword(
      req.auth.userId,
      await bcrypt.hash(newPassword, getBcryptRounds()),
    );
    await store.resetUserPasswordFailures(req.auth.userId);

    return res.json({ success: true });
  };
}

export function exportData(store) {
  return async (req, res) => {
    const [user, snapshot] = await Promise.all([
      store.getUserById(req.auth.userId),
      store.getUserFinanceSnapshot(req.auth.userId),
    ]);

    if (!user) {
      throw new ClientError("User account no longer exists.", 404);
    }

    return res.json({
      exportedAt: new Date().toISOString(),
      user: sanitizeUser(user),
      budgets: snapshot.budgets.filter((entry) => entry.userId === req.auth.userId),
      transactions: snapshot.transactions.filter((entry) => entry.userId === req.auth.userId),
      recurringTemplates: getRecurringTemplates(req.auth.userId, snapshot),
    });
  };
}

export function clearData(store) {
  return async (req, res) => {
    const user = await store.getUserById(req.auth.userId);

    if (!user) {
      throw new ClientError("User account no longer exists.", 404);
    }

    const currentPassword = String(req.body.currentPassword || "");

    if (!currentPassword) {
      throw new ClientError("Current password is required to clear finance data.");
    }

    checkPasswordChangeAllowed(user);

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isMatch) {
      const updatedUser = await store.incrementUserPasswordFailure(
        req.auth.userId,
        getPasswordFailureLockout(),
      );

      checkPasswordChangeAllowed(updatedUser || user);
      throw new ClientError("Current password is incorrect.", 401);
    }

    await store.clearUserData(req.auth.userId);
    await store.resetUserPasswordFailures(req.auth.userId);
    return res.json({ success: true });
  };
}
