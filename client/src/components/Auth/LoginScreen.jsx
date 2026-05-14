import { Moon, Sun, AlertCircle } from "lucide-react";

export function LoginScreen({
  theme,
  setTheme,
  submitting,
  error,
  message,
  form,
  setForm,
  onSubmit,
  onSwitch,
  onForgotPassword,
}) {
  return (
    <section className="panel auth-panel auth-panel-login">
      <div className="auth-panel-top">
        <div>
          <p className="eyebrow">Welcome Back</p>
          <h2>Sign in to PesoTrace</h2>
          <p className="auth-helper">
            Continue managing your personal finances.
          </p>
        </div>

        <button
          className="sidebar-action-btn"
          style={{ width: '40px', height: '40px' }}
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
            <span>Email Address</span>
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
            <button type="button" className="text-button" onClick={onForgotPassword}>
              Forgot password?
            </button>
          </div>
          <input
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </label>

        {error ? (
          <p className="form-error" role="alert">
            <AlertCircle size={16} /> {error}
          </p>
        ) : null}

        {message ? <p className="form-success">{message}</p> : null}

        <button className="primary-button large-button" type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="auth-footer">
        <p className="auth-switch">
          New to PesoTrace?
          <button type="button" className="text-button" onClick={onSwitch}>
            Create an account
          </button>
        </p>
      </div>
    </section>
  );
}
