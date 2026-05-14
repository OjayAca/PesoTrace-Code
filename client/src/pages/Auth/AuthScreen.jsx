import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../AuthContext";
import { api } from "../../api";
import { useTheme } from "../../hooks/useTheme";
import { AuthHero } from "../../components/Auth/AuthHero";
import { LoginScreen } from "../../components/Auth/LoginScreen";
import { RegisterScreen } from "../../components/Auth/RegisterScreen";

export function AuthScreen() {
  const { login, register } = useAuth();
  const { theme, setTheme } = useTheme(null);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const routeToken = params.get("token") || "";
  const [screen, setScreen] = useState(() => {
    if (location.pathname === "/reset-password") {
      return "reset";
    }

    return "login";
  });
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [resetForm, setResetForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loginError, setLoginError] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [registerSubmitting, setRegisterSubmitting] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  useEffect(() => {
    if (location.pathname === "/reset-password") {
      setScreen("reset");
    }
  }, [location.pathname]);

  function switchToRegister() {
    setRegisterForm((current) => ({
      ...current,
      email: loginForm.email || current.email,
    }));
    setRegisterError("");
    setScreen("register");
  }

  function switchToLogin() {
    setLoginForm((current) => ({
      ...current,
      email: registerForm.email || current.email,
    }));
    setLoginError("");
    setLoginMessage("");
    setResetError("");
    setResetMessage("");
    setScreen("login");
  }

  function switchToForgotPassword() {
    setResetForm((current) => ({
      ...current,
      email: loginForm.email || current.email,
    }));
    setResetError("");
    setResetMessage("");
    setScreen("forgot");
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setLoginError("");
    setLoginSubmitting(true);

    try {
      await login(loginForm);
    } catch (submitError) {
      setLoginError(submitError.message);
    } finally {
      setLoginSubmitting(false);
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    setRegisterError("");
    setRegisterSubmitting(true);

    try {
      if (registerForm.password !== registerForm.confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      await register(registerForm);
    } catch (submitError) {
      setRegisterError(submitError.message);
    } finally {
      setRegisterSubmitting(false);
    }
  }

  async function handleForgotSubmit(event) {
    event.preventDefault();
    setResetError("");
    setResetMessage("");
    setResetSubmitting(true);

    try {
      const response = await api.requestPasswordReset({ email: resetForm.email });
      setResetMessage(response.message);
    } catch (submitError) {
      setResetError(submitError.message);
    } finally {
      setResetSubmitting(false);
    }
  }

  async function handleResetSubmit(event) {
    event.preventDefault();
    setResetError("");
    setResetMessage("");
    setResetSubmitting(true);

    try {
      if (resetForm.password !== resetForm.confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      await api.confirmPasswordReset({
        token: routeToken,
        password: resetForm.password,
      });
      setLoginMessage("Password updated. You can sign in now.");
      setScreen("login");
    } catch (submitError) {
      setResetError(submitError.message);
    } finally {
      setResetSubmitting(false);
    }
  }

  function renderForgotPassword() {
    return (
      <section className="panel auth-panel auth-panel-login">
        <div className="auth-panel-top">
          <div>
            <p className="eyebrow">Password reset</p>
            <h2>Recover your account</h2>
            <p className="auth-helper">Enter your email to receive a reset link.</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleForgotSubmit}>
          <label>
            <div className="field-label">
              <span>Email Address</span>
              <small>Use the email on your account.</small>
            </div>
            <input
              type="email"
              value={resetForm.email}
              onChange={(event) =>
                setResetForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder=""
              autoComplete="email"
              required
            />
          </label>

          {resetError ? <p className="form-error" role="alert">{resetError}</p> : null}
          {resetMessage ? <p className="form-success">{resetMessage}</p> : null}

          <button className="primary-button large-button" type="submit" disabled={resetSubmitting}>
            {resetSubmitting ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div className="auth-footer">
          <p className="auth-switch">
            Remembered it?
            <button type="button" className="text-button" onClick={switchToLogin}>
              Sign in
            </button>
          </p>
        </div>
      </section>
    );
  }

  function renderResetPassword() {
    return (
      <section className="panel auth-panel auth-panel-login">
        <div className="auth-panel-top">
          <div>
            <p className="eyebrow">Password reset</p>
            <h2>Choose a new password</h2>
            <p className="auth-helper">Use at least 6 characters.</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleResetSubmit}>
          <label>
            <div className="field-label">
              <span>New password</span>
            </div>
            <input
              type="password"
              minLength={6}
              value={resetForm.password}
              onChange={(event) =>
                setResetForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="••••••••"
              autoComplete="new-password"
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
              value={resetForm.confirmPassword}
              onChange={(event) =>
                setResetForm((current) => ({
                  ...current,
                  confirmPassword: event.target.value,
                }))
              }
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </label>

          {resetError ? <p className="form-error" role="alert">{resetError}</p> : null}
          {resetMessage ? <p className="form-success">{resetMessage}</p> : null}

          <button className="primary-button large-button" type="submit" disabled={resetSubmitting || !routeToken}>
            {resetSubmitting ? "Saving..." : "Update Password"}
          </button>
        </form>
      </section>
    );
  }

  return (
    <main className="auth-shell">
      <AuthHero />

      {screen === "forgot" ? renderForgotPassword() : null}
      {screen === "reset" ? renderResetPassword() : null}

      {screen === "login" ? (
        <LoginScreen
          theme={theme}
          setTheme={setTheme}
          submitting={loginSubmitting}
          error={loginError}
          message={loginMessage}
          form={loginForm}
          setForm={setLoginForm}
          onSubmit={handleLoginSubmit}
          onSwitch={switchToRegister}
          onForgotPassword={switchToForgotPassword}
        />
      ) : null}

      {screen === "register" ? (
        <RegisterScreen
          theme={theme}
          setTheme={setTheme}
          submitting={registerSubmitting}
          error={registerError}
          form={registerForm}
          setForm={setRegisterForm}
          onSubmit={handleRegisterSubmit}
          onSwitch={switchToLogin}
        />
      ) : null}
    </main>
  );
}
