import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  RiFileList3Line,
  RiBookOpenLine,
  RiQuestionnaireLine,
  RiFlag2Line,
  RiFolderLine,
  RiBroadcastLine,
  RiArrowRightLine,
  RiFilePaperLine,
  RiCoupon3Line,
  RiGroupLine,
  RiMoneyRupeeCircleLine,
  RiVipCrownLine,
  RiDatabase2Line,
} from "@remixicon/react";
import api from "../api/axios";
import { PageHeader, StatCard, SectionTitle, Alert, Card } from "../components/ui";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/questions/stats");
        setStats(res.data);
      } catch (err) {
        setLoadError(
          "Couldn't connect to the backend — check that the server is running and VITE_API_URL is correct"
        );
      }
    }
    load();
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        subtitle="A complete overview of your platform — revenue, students, and content health at a glance."
      />

      {loadError && (
        <Alert tone="warn" className="mb-6">
          {loadError}
        </Alert>
      )}

      {/* HERO SUMMARY */}
      <div className="relative overflow-hidden rounded-xl bg-brand-gradient text-white p-6 sm:p-7 mb-6 shadow-brand">
        <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full border-[44px] border-white/[0.06] pointer-events-none" />
        <div className="absolute -bottom-20 right-32 w-48 h-48 rounded-full border-[32px] border-white/[0.05] pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-extrabold tracking-[0.14em] text-white/70 mb-1.5">TOTAL REVENUE</p>
            <p className="font-display text-4xl sm:text-[42px] leading-none font-extrabold">
              {stats ? `₹${stats.totalRevenue}` : "—"}
            </p>
            <p className="text-sm text-white/75 mt-2">
              {stats?.paidSubscriptions ?? 0} paid subscription{stats?.paidSubscriptions === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/[0.12] border border-white/15 rounded-md px-4 py-3">
            <div className="text-center px-3">
              <p className="font-display text-xl font-extrabold">{stats?.totalUsers ?? "—"}</p>
              <p className="text-[10px] text-white/70 font-semibold mt-0.5">Students</p>
            </div>
            <div className="w-px h-9 bg-white/20" />
            <div className="text-center px-3">
              <p className="font-display text-xl font-extrabold">{stats?.activeSubscribers ?? "—"}</p>
              <p className="text-[10px] text-white/70 font-semibold mt-0.5">Premium</p>
            </div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Active Subscribers"
          value={stats?.activeSubscribers ?? "—"}
          hint="Currently premium"
          icon={RiVipCrownLine}
          tone="brand"
        />
        <StatCard
          label="Total Students"
          value={stats?.totalUsers ?? "—"}
          hint="Registered users"
          icon={RiGroupLine}
          tone="info"
        />
        <StatCard
          label="Published Questions"
          value={stats?.publishedQuestions ?? "—"}
          hint={`${stats?.totalQuestions ?? 0} total in bank`}
          icon={RiDatabase2Line}
          tone="success"
        />
        <StatCard
          label="Open Reports"
          value={stats?.openReports ?? "—"}
          hint="Flagged by students"
          icon={RiFlag2Line}
          tone={stats?.openReports > 0 ? "danger" : "success"}
        />
      </div>

      {/* QUICK ACTIONS */}
      <SectionTitle title="Quick Actions" hint="Jump straight into a workflow" />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
          to="/live-exams"
          Icon={RiBroadcastLine}
          title="Live Exams"
          desc="Build and schedule ranked live exams"
        />
        <ActionCard to="/reports" Icon={RiFlag2Line} title="Student Reports" desc="Questions students have flagged" />
        <ActionCard
          to="/subjects"
          Icon={RiFolderLine}
          title="Subjects & Chapters"
          desc="The subject/chapter structure used for practice"
        />
        <ActionCard to="/coupons" Icon={RiCoupon3Line} title="Coupons" desc="Create and manage discount codes" />
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
    <Card as={Link} to={to} hover className="group block">
      <div className="flex items-center gap-3 mb-2.5">
        <div className="w-10 h-10 rounded-sm bg-brand/10 text-brand grid place-items-center shrink-0 group-hover:bg-brand group-hover:text-white transition-colors">
          <Icon size={19} />
        </div>
        <p className="font-semibold text-ink group-hover:text-brand transition-colors flex items-center gap-1.5 min-w-0">
          <span className="truncate">{title}</span>
          <RiArrowRightLine
            size={15}
            className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all shrink-0"
          />
        </p>
      </div>
      <p className="text-[13px] text-slate leading-relaxed">{desc}</p>
    </Card>
  );
}
