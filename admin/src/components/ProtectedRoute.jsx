import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { RiMenuLine, RiSunLine, RiMoonLine, RiComputerLine } from "@remixicon/react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Sidebar from "./Sidebar";

// Route -> page name, used for the topbar label so the admin always knows
// where they are (especially on mobile, where the sidebar is hidden).
const ROUTE_TITLES = [
  ["/exam-series", "Exam Mock Series"],
  ["/practice-series", "Subject Practice"],
  ["/pyq-bank", "PYQ Bank"],
  ["/questions", "Manage Questions"],
  ["/reports", "Student Reports"],
  ["/exam-patterns", "Exam Patterns"],
  ["/subjects", "Subjects"],
  ["/live-exams", "Live Exams"],
  ["/coupons", "Coupons"],
  ["/users", "Users"],
];

function titleForPath(pathname) {
  if (pathname === "/") return "Dashboard";
  const match = ROUTE_TITLES.find(([prefix]) => pathname.startsWith(prefix));
  return match ? match[1] : "Admin";
}

function ThemeToggle() {
  const { preference, cycleTheme } = useTheme();

  const config = {
    light: { Icon: RiSunLine, label: "Light" },
    dark: { Icon: RiMoonLine, label: "Dark" },
    system: { Icon: RiComputerLine, label: "System" },
  }[preference];

  const { Icon, label } = config;

  return (
    <button
      onClick={cycleTheme}
      title={`Theme: ${label} (click to change)`}
      className="h-9 px-3 rounded-xs border border-border bg-surface text-slate hover:text-brand hover:border-brand/50 transition-colors inline-flex items-center gap-2 text-[13px] font-semibold"
    >
      <Icon size={16} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* TOPBAR */}
        <header className="sticky top-0 z-20 h-[68px] shrink-0 bg-surface/85 backdrop-blur border-b border-border flex items-center gap-3 px-4 sm:px-6">
          <button
            onClick={() => setMenuOpen(true)}
            className="lg:hidden w-9 h-9 rounded-xs grid place-items-center text-ink hover:bg-slate-light transition-colors shrink-0"
            aria-label="Open menu"
          >
            <RiMenuLine size={20} />
          </button>

          <p className="font-display font-bold text-ink truncate flex-1">{titleForPath(location.pathname)}</p>

          <ThemeToggle />
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
