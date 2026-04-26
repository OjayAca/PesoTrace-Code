import { User, Settings, Lock, Download, AlertCircle } from "lucide-react";

export function SettingsView({
  handleProfileSubmit,
  profileForm,
  setProfileForm,
  savingProfile,
  handlePreferencesSubmit,
  preferencesForm,
  setPreferencesForm,
  savingPreferences,
  handlePasswordSubmit,
  passwordForm,
  setPasswordForm,
  savingPassword,
  settingsData,
  lastExportedAt,
  formatDateTime,
  handleExportData,
  handleExportCsv,
  handleClearData
}) {
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
            <h2>Workspace preferences</h2>
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

        <p className="section-caption">
          Last exported at: {formatDateTime(lastExportedAt)}
        </p>

        <div className="button-row">
          <button
            className="secondary-button"
            type="button"
            onClick={handleExportData}
          >
            Export JSON
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={handleExportCsv}
          >
            Export CSV
          </button>
          <button
            className="danger-button"
            type="button"
            onClick={handleClearData}
          >
            Clear all data
          </button>
        </div>
        <p className="section-caption section-danger-caption">
          <AlertCircle size={13} /> Clearing data will remove all transactions, budgets,
          and templates from your account. This cannot be undone.
        </p>
      </article>
    </section>
  );
}
