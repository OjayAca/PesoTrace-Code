import bcrypt from "bcryptjs";
import { getRecurringTemplates } from "../finance.js";
import { sanitizeUser, isValidEmail, isDuplicateEntryError, buildUserPreferences } from "../utils/helpers.js";

export function getSettings(store) {
  return async (req, res) => {
    const [user, stats] = await Promise.all([
      store.getUserById(req.auth.userId),
      store.getUserStats(req.auth.userId),
    ]);

    if (!user) {
      return res.status(404).json({ message: "User account no longer exists." });
    }

    return res.json({
      user: sanitizeUser(user),
      stats,
    });
  };
}

export function updateProfile(store) {
  return async (req, res) => {
    try {
      const user = await store.getUserById(req.auth.userId);

      if (!user) {
        return res.status(404).json({ message: "User account no longer exists." });
      }

      const name = String(req.body.name || "").trim();
      const email = String(req.body.email || "").trim().toLowerCase();

      if (!name || !email) {
        return res.status(400).json({ message: "Name and email are required." });
      }

      if (!isValidEmail(email)) {
        return res.status(400).json({ message: "Email must be a valid email address." });
      }

      const existingUser = await store.getUserByEmail(email);

      if (existingUser && existingUser.id !== req.auth.userId) {
        return res.status(409).json({ message: "That email is already registered." });
      }

      const updatedUser = await store.updateUserProfile(req.auth.userId, {
        name,
        email,
      });

      return res.json({ user: sanitizeUser(updatedUser) });
    } catch (error) {
      if (isDuplicateEntryError(error)) {
        return res.status(409).json({ message: "That email is already registered." });
      }

      return res.status(400).json({ message: error.message });
    }
  };
}

export function updatePreferences(store) {
  return async (req, res) => {
    try {
      const user = await store.getUserById(req.auth.userId);

      if (!user) {
        return res.status(404).json({ message: "User account no longer exists." });
      }

      const updatedUser = await store.updateUserPreferences(
        req.auth.userId,
        buildUserPreferences(user, req.body),
      );

      return res.json({ user: sanitizeUser(updatedUser) });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  };
}

export function updatePassword(store) {
  return async (req, res) => {
    try {
      const user = await store.getUserById(req.auth.userId);

      if (!user) {
        return res.status(404).json({ message: "User account no longer exists." });
      }

      const currentPassword = String(req.body.currentPassword || "");
      const newPassword = String(req.body.newPassword || "");

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required." });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters." });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);

      if (!isMatch) {
        return res.status(401).json({ message: "Current password is incorrect." });
      }

      await store.updateUserPassword(req.auth.userId, await bcrypt.hash(newPassword, 10));

      return res.json({ success: true });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  };
}

export function exportData(store) {
  return async (req, res) => {
    const [user, snapshot] = await Promise.all([
      store.getUserById(req.auth.userId),
      store.getSnapshot(),
    ]);

    if (!user) {
      return res.status(404).json({ message: "User account no longer exists." });
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
    await store.clearUserData(req.auth.userId);
    return res.json({ success: true });
  };
}
