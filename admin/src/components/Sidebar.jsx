import { NavLink, Link } from "react-router-dom";
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
  RiShieldKeyholeLine,
  RiCloseLine,
  RiMagicLine,
  RiCalendarCheckLine,
  RiImageLine,
  RiMegaphoneLine,
  RiBrainLine,
  RiNotification3Line,
  RiMoneyRupeeCircleLine,
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
      { to: "/generation", label: "Generation", Icon: RiMagicLine },
      { to: "/exam-series", label: "Exam Mock Series", Icon: RiFileList3Line },
      { to: "/practice-series", label: "Subject Practice", Icon: RiBookOpenLine },
      { to: "/daily-quiz", label: "Daily GK Quiz", Icon: RiCalendarCheckLine },
      { to: "/images-pending", label: "Images pending", Icon: RiImageLine },
      { to: "/pyq-bank", label: "PYQ Bank", Icon: RiFilePaperLine },
      { to: "/ai-references", label: "AI References", Icon: RiBrainLine },
      { to: "/questions", label: "Question Review", Icon: RiQuestionnaireLine },
    ],
  },
  {
    label: "Exams",
    items: [
      { to: "/vacancies", label: "Vacancies", Icon: RiMegaphoneLine },
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
      { to: "/notifications", label: "Notifications", Icon: RiNotification3Line },
      { to: "/payments", label: "Payments", Icon: RiMoneyRupeeCircleLine },
      { to: "/coupons", label: "Coupons", Icon: RiCoupon3Line },
    ],
  },
  {
    label: "Account",
    items: [{ to: "/sessions", label: "Login Activity", Icon: RiShieldKeyholeLine }],
  },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Backdrop - mobile only, since on desktop the sidebar is permanent */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed lg:sticky top-0 z-40 h-screen w-[268px] shrink-0
          flex flex-col bg-surface text-ink border-r border-border
          transition-transform duration-200 ease-out
          ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
        `}
      >
        {/* BRAND */}
        <div className="flex items-center justify-between gap-3 px-5 h-[68px] border-b border-border-soft shrink-0">
          <Link
            to="/"
            onClick={onClose}
            className="min-w-0 rounded-xs transition-opacity hover:opacity-90"
            aria-label="Rankveer - go to dashboard"
          >
            <img
              src={`${import.meta.env.BASE_URL}images/brand_logo.png`}
              alt="Rankveer"
              className="h-12 w-auto"
            />
          </Link>

          <button
            onClick={onClose}
            className="lg:hidden w-8 h-8 rounded-xs grid place-items-center text-slate hover:bg-slate-light hover:text-ink transition-colors"
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
                <p className="px-3 mb-1.5 text-[11px] font-bold tracking-[0.12em] text-slate-soft">
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
                          ? "bg-brand-light text-brand font-semibold"
                          : "text-ink-soft hover:bg-slate-light hover:text-ink"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-brand" />
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
        <div className="px-3 py-3 border-t border-border-soft shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-brand-light text-brand grid place-items-center text-xs font-bold shrink-0">
              {user?.name?.trim()?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold truncate">{user?.name || "Admin"}</p>
              <p className="text-[11px] text-slate truncate">{user?.phone || user?.email || "Administrator"}</p>
            </div>
            <button
              onClick={logout}
              title="Log out"
              className="w-8 h-8 rounded-xs grid place-items-center text-slate hover:bg-danger-light hover:text-danger transition-colors shrink-0"
            >
              <RiLogoutBoxRLine size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}