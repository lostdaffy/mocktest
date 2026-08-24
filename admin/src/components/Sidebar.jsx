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
  RiCoupon3Line,
  RiCloseLine,
} from "@remixicon/react";

// Grouped rather than one flat list of 11 - with this many destinations a
// flat list makes the admin scan every label to find anything.
const NAV_GROUPS = [
  {
    label: null,
    items: [{ to: "/", label: "Dashboard", Icon: RiDashboardLine, end: true }],
  },
  {
    label: "Content",
    items: [
      { to: "/exam-series", label: "Exam Mock Series", Icon: RiFileList3Line },
      { to: "/practice-series", label: "Subject Practice", Icon: RiBookOpenLine },
      { to: "/pyq-bank", label: "PYQ Bank", Icon: RiFilePaperLine },
      { to: "/questions", label: "Manage Questions", Icon: RiQuestionnaireLine },
    ],
  },
  {
    label: "Exams",
    items: [
      { to: "/live-exams", label: "Live Exams", Icon: RiBroadcastLine },
      { to: "/exam-patterns", label: "Exam Patterns", Icon: RiLayoutGridLine },
      { to: "/subjects", label: "Subjects", Icon: RiFolderLine },
    ],
  },
  {
    label: "Students",
    items: [
      { to: "/users", label: "Users", Icon: RiGroupLine },
      { to: "/reports", label: "Student Reports", Icon: RiFlag2Line },
      { to: "/coupons", label: "Coupons", Icon: RiCoupon3Line },
    ],
  },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Backdrop - mobile only, since on desktop the sidebar is permanent */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-brand-navy/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed lg:sticky top-0 z-40 h-screen w-[268px] shrink-0
          flex flex-col bg-brand-navy text-white
          transition-transform duration-200 ease-out
          ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
        `}
      >
        {/* BRAND */}
        <div className="flex items-center justify-between gap-3 px-5 h-[68px] border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xs bg-brand-gradient grid place-items-center font-display font-extrabold shrink-0">
              R
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold leading-tight truncate">Rankveer</p>
              <p className="text-[10px] text-white/45 tracking-wide">ADMIN PANEL</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden w-8 h-8 rounded-xs grid place-items-center text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <RiCloseLine size={19} />
          </button>
        </div>

        {/* NAV */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV_GROUPS.map((group, i) => (
            <div key={group.label || i}>
              {group.label && (
                <p className="px-3 mb-1.5 text-[10px] font-extrabold tracking-[0.14em] text-white/35">
                  {group.label.toUpperCase()}
                </p>
              )}

              <div className="space-y-0.5">
                {group.items.map(({ to, label, Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 px-3 py-2.5 rounded-xs text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-white/[0.14] text-white"
                          : "text-white/60 hover:bg-white/[0.07] hover:text-white"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-brand-lavender" />
                        )}
                        <Icon size={18} className="shrink-0" />
                        <span className="truncate">{label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* USER */}
        <div className="px-3 py-3 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-white/12 grid place-items-center text-xs font-bold shrink-0">
              {user?.name?.trim()?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold truncate">{user?.name || "Admin"}</p>
              <p className="text-[10px] text-white/40 truncate">{user?.phone || user?.email || "Administrator"}</p>
            </div>
            <button
              onClick={logout}
              title="Log out"
              className="w-8 h-8 rounded-xs grid place-items-center text-white/50 hover:bg-danger/20 hover:text-white transition-colors shrink-0"
            >
              <RiLogoutBoxRLine size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
