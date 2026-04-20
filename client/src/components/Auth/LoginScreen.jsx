import { Moon, Sun, AlertCircle } from "lucide-react";

export function LoginScreen({ theme, setTheme, submitting, error, form, setForm, onSubmit, onSwitch }) {
  return (
    <section className="panel auth-panel auth-panel-login">
      <div className="auth-panel-top">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h2>Sign in to PesoTrace</h2>
          <p className="auth-helper">
            Continue managing your monthly finances and recent activity.
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
            <small>Enter your current password.</small>
          </div>
          <input
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
            placeholder="Your password"
            autoComplete="current-password"
            required
          />
        </label>

        {error ? (
          <p className="form-error" role="alert">
            <AlertCircle size={15} /> {error}
          </p>
        ) : null}

        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? "Please wait..." : "Sign in"}
        </button>
      </form>

      <p className="auth-switch">
        New here?
        <button type="button" className="text-button" onClick={onSwitch}>
          Create an account
        </button>
      </p>
    </section>
  );
}
