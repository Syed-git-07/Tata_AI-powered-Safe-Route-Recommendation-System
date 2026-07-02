import { useTheme } from "../../contexts/ThemeContext";
import { Sun, Moon, Shield, BarChart3, Map } from "lucide-react";
import { NavLink } from "react-router-dom";

export default function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="header">
      <div className="header-brand">
        <div className="header-logo">
          <Shield size={22} strokeWidth={2.5} />
        </div>
        <div className="header-title-group">
          <span className="header-title">SafeRoute AI</span>
          <span className="header-subtitle">Tata Innovert Challenge 2026</span>
        </div>
      </div>

      <nav className="header-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          <Map size={16} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          <BarChart3 size={16} />
          <span>Analytics</span>
        </NavLink>
      </nav>

      <div className="header-actions">
        <div className="header-badge">
          <span className="badge-dot pulse"></span>
          <span>46 Districts</span>
        </div>
        <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
