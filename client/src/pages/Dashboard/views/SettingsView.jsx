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
    <div className="bento-grid animate-fade-in">
      <article className="bento-card span-6 animate-fade-up">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <User size={12} /> Personal
            </p>
            <h3>Account Profile</h3>
          </div>
        </div>
        <form className="stack-form" onSubmit={handleProfileSubmit}>
          <label>
            <div className="field-label">
              <span>Full Name</span>
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
              <span>Email Address</span>
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
            {savingProfile ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </article>

      <article className="bento-card span-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <Settings size={12} /> Appearance
            </p>
            <h3>Preferences</h3>
          </div>
        </div>
        <form className="stack-form" onSubmit={handlePreferencesSubmit}>
          <label>
            <div className="field-label">
              <span>Preferred Theme</span>
              <small>Choose between Light and Dark mode for your workspace.</small>
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
              <option value="light">Light Mode</option>
              <option value="dark">Dark Mode</option>
            </select>
          </label>
          <button
            className="primary-button"
            type="submit"
            disabled={savingPreferences}
          >
            {savingPreferences ? "Saving..." : "Save Preferences"}
          </button>
        </form>
      </article>

      <article className="bento-card span-6 animate-fade-up" style={{ animationDelay: '0.15s' }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <Lock size={12} /> Safety
            </p>
            <h3>Security</h3>
          </div>
        </div>
        <form className="stack-form" onSubmit={handlePasswordSubmit}>
          <label>
            <div className="field-label">
              <span>Current Password</span>
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
              autoComplete="current-password"
            />
          </label>
          <div className="form-row">
            <label>
              <div className="field-label">
                <span>New Password</span>
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
                autoComplete="new-password"
              />
            </label>
            <label>
              <div className="field-label">
                <span>Confirm</span>
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
                autoComplete="new-password"
              />
            </label>
          </div>
          <button className="primary-button" type="submit" disabled={savingPassword}>
            {savingPassword ? "Updating..." : "Update Password"}
          </button>
        </form>
      </article>

      <article className="bento-card span-6 animate-fade-up" style={{ animationDelay: '0.2s' }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <Download size={12} /> Maintenance
            </p>
            <h3>Data Management</h3>
          </div>
        </div>

        <div className="bento-list">
          <div className="bento-list-item animate-scale-in" style={{ animationDelay: '0.3s' }}>
            <div className="item-info">
              <span className="item-title">Total Transactions</span>
              <span className="item-meta">Recorded since account creation</span>
            </div>
            <strong className="mono">{settingsData?.stats?.transactionCount || 0}</strong>
          </div>
          <div className="bento-list-item animate-scale-in" style={{ animationDelay: '0.35s' }}>
            <div className="item-info">
              <span className="item-title">Monthly Budgets</span>
              <span className="item-meta">Historical budget configurations</span>
            </div>
            <strong className="mono">{settingsData?.stats?.budgetCount || 0}</strong>
          </div>
        </div>

        <p className="metric-detail" style={{ marginTop: '1.25rem', fontSize: '0.75rem', opacity: 0.7 }}>
          Last exported: {formatDateTime(lastExportedAt)}
        </p>

        <div className="button-row" style={{ marginTop: '1rem' }}>
          <button
            className="secondary-button compact-button"
            type="button"
            onClick={handleExportData}
            title="Export as JSON"
          >
            Export JSON
          </button>
          <button
            className="secondary-button compact-button"
            type="button"
            onClick={handleExportCsv}
            title="Export as CSV"
          >
            Export CSV
          </button>
          <button
            className="danger-button compact-button"
            type="button"
            onClick={handleClearData}
            style={{ marginLeft: 'auto' }}
          >
            Clear Data
          </button>
        </div>
      </article>
    </div>
  );
}
