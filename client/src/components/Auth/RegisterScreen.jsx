import { Moon, Sun, AlertCircle } from "lucide-react";

export function RegisterScreen({
  theme,
  setTheme,
  submitting,
  error,
  form,
  setForm,
  onSubmit,
  onSwitch,
}) {
  return (
    <section className="panel auth-panel auth-panel-register">
      <div className="auth-panel-top">
        <div>
          <p className="eyebrow">Create account</p>
          <h2>Register for PesoTrace</h2>
          <p className="auth-helper">
            Set up your workspace and start tracking your finances in one place.
          </p>
        </div>

        <button
          className="theme-toggle"
          type="button"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          aria-label="Toggle theme"
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>

      <form className="auth-form" onSubmit={onSubmit}>
        <label>
          <div className="field-label">
            <span>Full name</span>
            <small>Shown across your workspace.</small>
          </div>
          <input
            type="text"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="Juan Dela Cruz"
            autoComplete="name"
            required
          />
        </label>

        <label>
          <div className="field-label">
            <span>Email</span>
            <small>Used for sign in.</small>
          </div>
          <input
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({ ...current, email: event.target.value }))
            }
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label>
          <div className="field-label">
            <span>Password</span>
            <small>Minimum of 6 characters.</small>
          </div>
          <input
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
            minLength={6}
            placeholder="At least 6 characters"
            autoComplete="new-password"
            required
          />
        </label>

        <label>
          <div className="field-label">
            <span>Confirm password</span>
            <small>Must match your password.</small>
          </div>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                confirmPassword: event.target.value,
              }))
            }
            minLength={6}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            required
          />
        </label>

        {error ? (
          <p className="form-error" role="alert">
            <AlertCircle size={15} /> {error}
          </p>
        ) : null}

        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? "Please wait..." : "Create account"}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account?
        <button type="button" className="text-button" onClick={onSwitch}>
          Sign in
        </button>
      </p>
    </section>
  );
}
