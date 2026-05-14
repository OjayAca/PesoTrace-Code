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
          <p className="eyebrow">Get Started</p>
          <h2>Create your account</h2>
          <p className="auth-helper">
            Start tracking your finances with PesoTrace.
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
            <span>Full Name</span>
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

        <div className="form-row">
          <label>
            <div className="field-label">
              <span>Password</span>
            </div>
            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              minLength={6}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </label>

          <label>
            <div className="field-label">
              <span>Confirm</span>
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
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </label>
        </div>

        {error ? (
          <p className="form-error" role="alert">
            <AlertCircle size={16} /> {error}
          </p>
        ) : null}

        <button className="primary-button large-button" type="submit" disabled={submitting}>
          {submitting ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <div className="auth-footer">
        <p className="auth-switch">
          Already have an account?
          <button type="button" className="text-button" onClick={onSwitch}>
            Sign in
          </button>
        </p>
      </div>
    </section>
  );
}
