import { useState } from "react";
import { useAuth } from "../../AuthContext";
import { useTheme } from "../../hooks/useTheme";
import { AuthHero } from "../../components/Auth/AuthHero";
import { LoginScreen } from "../../components/Auth/LoginScreen";
import { RegisterScreen } from "../../components/Auth/RegisterScreen";

export function AuthScreen() {
  const { login, register } = useAuth();
  const { theme, setTheme } = useTheme(null);
  const [screen, setScreen] = useState("login");
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
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [registerSubmitting, setRegisterSubmitting] = useState(false);

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
    setScreen("login");
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

  return (
    <main className="app-shell auth-shell">
      <AuthHero />

      {screen === "login" ? (
        <LoginScreen
          theme={theme}
          setTheme={setTheme}
          submitting={loginSubmitting}
          error={loginError}
          form={loginForm}
          setForm={setLoginForm}
          onSubmit={handleLoginSubmit}
          onSwitch={switchToRegister}
        />
      ) : (
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
      )}
    </main>
  );
}
