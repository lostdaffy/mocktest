import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RiFileList3Line, RiBookOpenLine, RiQuestionnaireLine, RiFlag2Line, RiFolderLine, RiBroadcastLine, RiArrowRightLine, RiFilePaperLine, RiCoupon3Line, RiGroupLine } from "@remixicon/react";
import api from "../api/axios";

function StatCard({ label, value, hint, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`font-display text-3xl font-bold mt-1 ${accent || "text-ink"}`}>{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/questions/stats");
        setStats(res.data);
      } catch (err) {
        setLoadError("Couldn't connect to the backend — check that the server is running and VITE_API_URL is correct");
      }
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Dashboard</h1>
      <p className="text-slate-500 mb-8">A complete overview of your platform</p>

      {loadError && (
        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          label="Total Revenue"
          value={stats ? `₹${stats.totalRevenue}` : "—"}
          hint={`${stats?.paidSubscriptions ?? 0} paid subscriptions`}
          accent="text-emerald-600"
        />
        <StatCard label="Total Students" value={stats?.totalUsers ?? "—"} hint="Registered users" />
        <StatCard
          label="Active Subscribers"
          value={stats?.activeSubscribers ?? "—"}
          hint="Currently premium"
          accent="text-brand"
        />
        <StatCard
          label="Published Questions"
          value={stats?.publishedQuestions ?? "—"}
          hint={`${stats?.totalQuestions ?? 0} total in bank`}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 mb-8">
        <StatCard
          label="Open Reports"
          value={stats?.openReports ?? "—"}
          hint="Flagged as wrong or unclear by students"
          accent={stats?.openReports > 0 ? "text-red-600" : "text-emerald-600"}
        />
      </div>

      <h2 className="font-display text-lg font-bold text-ink mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <ActionCard
          to="/exam-series"
          Icon={RiFileList3Line}
          title="Exam Mock Series"
          desc="Build exam-wise mock tests, review, and publish"
        />
        <ActionCard
          to="/practice-series"
          Icon={RiBookOpenLine}
          title="Subject Practice"
          desc="Chapter-wise practice tests (Easy → Advanced)"
        />
        <ActionCard
          to="/pyq-bank"
          Icon={RiFilePaperLine}
          title="PYQ Bank"
          desc="Upload real previous-year papers and extract questions"
        />
        <ActionCard
          to="/questions"
          Icon={RiQuestionnaireLine}
          title="Manage Questions"
          desc="Browse, edit, or delete anything in the question bank"
        />
        <ActionCard
          to="/reports"
          Icon={RiFlag2Line}
          title="Student Reports"
          desc="Questions students have flagged"
        />
        <ActionCard
          to="/subjects"
          Icon={RiFolderLine}
          title="Subjects & Chapters"
          desc="The subject/chapter structure used for practice"
        />
        <ActionCard
          to="/live-exams"
          Icon={RiBroadcastLine}
          title="Live Exams"
          desc="Schedule a live exam"
        />
        <ActionCard
          to="/coupons"
          Icon={RiCoupon3Line}
          title="Coupons"
          desc="Create and manage discount codes"
        />
        <ActionCard
          to="/users"
          Icon={RiGroupLine}
          title="Users"
          desc="Search students, manage subscriptions"
        />
      </div>
    </div>
  );
}

function ActionCard({ to, Icon, title, desc }) {
  return (
    <Link
      to={to}
      className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 hover:border-brand hover:shadow-md transition-all group"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center text-brand group-hover:bg-brand group-hover:text-white transition-colors">
          <Icon size={20} />
        </div>
        <p className="font-semibold text-ink group-hover:text-brand transition-colors flex items-center gap-1">
          {title}
          <RiArrowRightLine size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </p>
      </div>
      <p className="text-sm text-slate-500">{desc}</p>
    </Link>
  );
}