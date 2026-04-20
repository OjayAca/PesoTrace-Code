import { AuthProvider, useAuth } from "./AuthContext";
import { Zap } from "lucide-react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthScreen } from "./pages/Auth/AuthScreen";
import { Dashboard } from "./pages/Dashboard/Dashboard";

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="app-shell">
        <section className="panel loading-panel">
          <div>
            <p className="eyebrow">
              <Zap size={14} /> PesoTrace
            </p>
            <h2>Loading your finance workspace...</h2>
          </div>
        </section>
      </main>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />
        }
      />
      <Route
        path="/auth"
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
