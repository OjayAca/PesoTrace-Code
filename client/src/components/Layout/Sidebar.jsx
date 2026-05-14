import React from "react";
import { 
  LayoutDashboard, 
  ReceiptText, 
  BarChart3, 
  Settings, 
  LogOut, 
  Moon, 
  Sun,
  Zap
} from "lucide-react";
import { useAuth } from "../../AuthContext";

export function Sidebar({ setActiveView, activeView, theme, toggleTheme, onLogout }) {
  const { user } = useAuth();

  const navItems = [
    { id: "main", label: "Dashboard", icon: LayoutDashboard },
    { id: "transactions", label: "Transactions", icon: ReceiptText },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header" style={{ padding: '2rem 1.5rem' }}>
        <div className="sidebar-logo" style={{ fontSize: '1.25rem' }}>
          <div className="brand-mark small">PT</div>
          <span style={{ letterSpacing: '-0.02em' }}>PesoTrace</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <p className="nav-section-label">Main Menu</p>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`sidebar-nav-item ${activeView === item.id ? "active" : ""}`}
            >
              <item.icon size={18} strokeWidth={activeView === item.id ? 2.5 : 2} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user animate-fade-in">
          <div className="user-avatar" style={{ boxShadow: '0 0 0 2px var(--bg), 0 0 0 4px var(--accent-glow)' }}>
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className="user-email">{user?.email}</span>
          </div>
        </div>
        
        <div className="sidebar-actions">
          <button onClick={toggleTheme} className="sidebar-action-btn" title="Toggle Theme" aria-label="Toggle Theme">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={onLogout} className="sidebar-action-btn logout" title="Logout" aria-label="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
