import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  RiDashboardLine,
  RiFileList3Line,
  RiBookOpenLine,
  RiQuestionnaireLine,
  RiFlag2Line,
  RiLayoutGridLine,
  RiFolderLine,
  RiBroadcastLine,
  RiGroupLine,
  RiLogoutBoxRLine,
  RiFilePaperLine,
} from "@remixicon/react";

const navItems = [
  { to: "/", label: "Dashboard", Icon: RiDashboardLine },
  { to: "/exam-series", label: "Exam Mock Series", Icon: RiFileList3Line },
  { to: "/practice-series", label: "Subject Practice", Icon: RiBookOpenLine },
  { to: "/pyq-bank", label: "PYQ Bank", Icon: RiFilePaperLine },
  { to: "/questions", label: "Manage Questions", Icon: RiQuestionnaireLine },
  { to: "/reports", label: "Student Reports", Icon: RiFlag2Line },
  { to: "/exam-patterns", label: "Exam Patterns", Icon: RiLayoutGridLine },
  { to: "/subjects", label: "Subjects", Icon: RiFolderLine },
  { to: "/live-exams", label: "Live Exams", Icon: RiBroadcastLine },
  { to: "/users", label: "Users", Icon: RiGroupLine },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 shrink-0 bg-ink text-white min-h-screen flex flex-col">
      <div className="px-6 py-6 border-b border-white/10">
        <h1 className="font-display text-lg font-bold tracking-tight">Smart Test Engine</h1>
        <p className="text-xs text-white/50 mt-0.5">Admin Panel</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "bg-brand text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <p className="text-sm text-white/80 truncate">{user?.name}</p>
        <button
          onClick={logout}
          className="mt-2 flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors"
        >
          <RiLogoutBoxRLine size={14} />
          Logout
        </button>
      </div>
    </aside>
  );
}