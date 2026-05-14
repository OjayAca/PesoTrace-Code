import { AuthProvider, useAuth } from "./AuthContext";
import { Zap } from "lucide-react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthScreen } from "./pages/Auth/AuthScreen";
import { Dashboard } from "./pages/Dashboard/Dashboard";
import { LandingPage } from "./pages/Landing/LandingPage";

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="app-shell animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <section className="panel animate-scale-in" style={{ padding: '3rem', textAlign: 'center', maxWidth: '400px' }}>
          <div className="brand-mark" style={{ margin: '0 auto 1.5rem' }}>PT</div>
          <h2 style={{ fontSize: '1.25rem' }}>Preparing workspace...</h2>
          <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Securely loading your finance data.</p>
        </section>
      </main>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? <Navigate to="/dashboard" replace /> : <LandingPage />
        }
      />
      <Route
        path="/auth"
        element={!user ? <AuthScreen /> : <Navigate to="/dashboard" replace />}
      />
      <Route
        path="/reset-password"
        element={!user ? <AuthScreen /> : <Navigate to="/dashboard" replace />}
      />
      <Route
        path="/dashboard/*"
        element={user ? <Dashboard /> : <Navigate to="/auth" replace />}
      />
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
