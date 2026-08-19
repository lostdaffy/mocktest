import { useEffect, useRef, useState } from "react";
import {
  RiSearchLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiDownloadLine,
  RiUserLine,
  RiStarLine,
  RiTimeLine,
  RiAlarmWarningLine,
  RiCloseLine,
} from "@remixicon/react";
import api from "../api/axios";

const PAGE_SIZE = 25;
const EXAM_LABELS = {
  SSC_CGL: "SSC",
  UP_POLICE: "UP Police",
  RAILWAY: "Railway",
  BANKING: "Banking",
  CTET: "CTET",
};

export default function Users() {
  const [search, setSearch] = useState("");
  const [subscription, setSubscription] = useState("");
  const [examGoal, setExamGoal] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [stats, setStats] = useState(null);

  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const [subTarget, setSubTarget] = useState(null);
  const [subAction, setSubAction] = useState("grant");
  const [subPlan, setSubPlan] = useState("half_yearly");
  const [subReason, setSubReason] = useState("");
  const [subSaving, setSubSaving] = useState(false);

  const debounceRef = useRef(null);

  function currentParams(targetPage = page, term = search) {
    const isPhoneLike = /^\d+$/.test(term.trim());
    const params = { page: targetPage, limit: PAGE_SIZE, sortBy };
    if (term.trim()) {
      if (isPhoneLike) params.phone = term.trim();
      else {
        params.name = term.trim();
        params.email = term.trim();
      }
    }
    if (subscription) params.subscription = subscription;
    if (examGoal) params.examGoal = examGoal;
    return params;
  }

  async function load(targetPage = page, term = search) {
    setLoading(true);
    try {
      const res = await api.get("/admin/users", { params: currentParams(targetPage, term) });
      setUsers(res.data.users || []);
      setTotal(res.data.total ?? 0);
      setPages(res.data.pages ?? 1);
      setPage(res.data.page ?? targetPage);
    } catch (err) {
      alert("Load failed: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const res = await api.get("/admin/users/stats");
      setStats(res.data);
    } catch (err) {
      // non-critical - cards just won't show
    }
  }

  useEffect(() => {
    load(1, "");
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Any filter/sort change re-runs the search from page 1
  useEffect(() => {
    load(1, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscription, examGoal, sortBy]);

  function onSearchChange(value) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(1, value), 400);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await api.get("/admin/users/export", { params: currentParams(1, search), responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-export-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export failed: " + (err.response?.data?.message || err.message));
    } finally {
      setExporting(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert("Password kam se kam 6 characters ka hona chahiye");
      return;
    }
    setResetting(true);
    try {
      await api.patch(`/admin/users/${resetTarget._id}/reset-password`, { newPassword });
      alert(`Password reset ho gaya ${resetTarget.name} ke liye`);
      setResetTarget(null);
      setNewPassword("");
    } catch (err) {
      alert("Reset failed: " + (err.response?.data?.message || err.message));
    } finally {
      setResetting(false);
    }
  }

  function openSubModal(user) {
    setSubTarget(user);
    setSubAction("grant");
    setSubPlan("half_yearly");
    setSubReason("");
  }

  async function handleSubSave(e) {
    e.preventDefault();
    setSubSaving(true);
    try {
      await api.patch(`/admin/users/${subTarget._id}/subscription`, {
        action: subAction,
        plan: subAction !== "revoke" ? subPlan : undefined,
        reason: subReason || undefined,
      });
      setSubTarget(null);
      load(page, search);
      loadStats();
    } catch (err) {
      alert("Update failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSubSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl font-bold text-ink">Users</h1>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-600 transition-colors disabled:opacity-50"
        >
          <RiDownloadLine size={15} />
          {exporting ? "Exporting..." : "Export CSV"}
        </button>
      </div>
      <p className="text-slate-500 mb-6">
        {total.toLocaleString("en-IN")} total students. Filter, search, ya poori list yahan se manage karo.
      </p>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard icon={RiUserLine} label="Total" value={stats.total} tint="text-slate-500" bg="bg-slate-50" />
          <StatCard icon={RiStarLine} label="Premium" value={stats.premium} tint="text-emerald-600" bg="bg-emerald-50" />
          <StatCard
            icon={RiAlarmWarningLine}
            label="Expiring (7d)"
            value={stats.expiringSoon}
            tint="text-amber-600"
            bg="bg-amber-50"
            onClick={() => setSubscription("expiring")}
          />
          <StatCard icon={RiTimeLine} label="New this week" value={stats.newThisWeek} tint="text-brand" bg="bg-brand/5" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <RiSearchLine size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Phone, name, ya email se search..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand outline-none"
          />
        </div>

        <select
          value={subscription}
          onChange={(e) => setSubscription(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand outline-none text-sm"
        >
          <option value="">All plans</option>
          <option value="premium">Premium</option>
          <option value="free">Free</option>
          <option value="expiring">Expiring (7 days)</option>
          <option value="expired">Expired</option>
        </select>

        <select
          value={examGoal}
          onChange={(e) => setExamGoal(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand outline-none text-sm"
        >
          <option value="">All exams</option>
          {Object.entries(EXAM_LABELS).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand outline-none text-sm"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="expirySoon">Expiring soonest</option>
          <option value="nameAsc">Name A-Z</option>
        </select>

        {(subscription || examGoal) && (
          <button
            onClick={() => {
              setSubscription("");
              setExamGoal("");
            }}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-ink"
          >
            <RiCloseLine size={15} /> Clear filters
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-3 min-h-[200px]">
        {loading ? (
          <p className="text-slate-400 text-center py-10">Loading...</p>
        ) : users.length === 0 ? (
          <p className="text-slate-400 text-center py-10">Koi user nahi mila.</p>
        ) : (
          users.map((u) => {
            const isExpiring =
              u.subscriptionStatus === "active" &&
              u.subscriptionExpiresAt &&
              new Date(u.subscriptionExpiresAt) - new Date() < 7 * 24 * 60 * 60 * 1000;

            return (
              <div key={u._id} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-ink">{u.name}</p>
                      {u.authProvider === "google" && (
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                          Google
                        </span>
                      )}
                      {isExpiring && (
                        <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                          Expiring soon
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      {u.phone || "—"} {u.email && `· ${u.email}`}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {u.subscriptionStatus === "active" ? (
                        <span className="text-emerald-600 font-medium">
                          ⭐ Premium ({u.subscriptionPlan === "yearly" ? "12mo" : u.subscriptionPlan === "half_yearly" ? "6mo" : "?"}) ·
                          expires {u.subscriptionExpiresAt ? new Date(u.subscriptionExpiresAt).toLocaleDateString("en-IN") : "—"}
                        </span>
                      ) : (
                        "Free"
                      )}
                      {" · "}Joined {new Date(u.createdAt).toLocaleDateString("en-IN")}
                      {u.streakCount > 0 && ` · 🔥 ${u.streakCount} day streak`}
                      {u.referralCount > 0 && ` · ${u.referralCount} referrals`}
                    </p>
                    {u.examGoals?.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {u.examGoals.map((g) => (
                          <span key={g} className="text-[10px] font-medium bg-brand/5 text-brand px-2 py-0.5 rounded-full">
                            {EXAM_LABELS[g] || g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => openSubModal(u)}
                      className="px-3.5 py-1.5 rounded-lg bg-brand/5 hover:bg-brand/10 text-brand text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      Manage Plan
                    </button>
                    <button
                      onClick={() => setResetTarget(u)}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      Reset Password
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => load(page - 1)}
            disabled={page <= 1 || loading}
            className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-30 hover:bg-slate-50"
          >
            <RiArrowLeftSLine size={18} />
          </button>
          <span className="text-sm text-slate-500">
            Page {page} of {pages}
          </span>
          <button
            onClick={() => load(page + 1)}
            disabled={page >= pages || loading}
            className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-30 hover:bg-slate-50"
          >
            <RiArrowRightSLine size={18} />
          </button>
        </div>
      )}

      {/* Reset password modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-ink mb-1">Password Reset</h3>
            <p className="text-sm text-slate-500 mb-4">
              {resetTarget.name} ({resetTarget.phone}) ke liye naya password set karo
            </p>
            <form onSubmit={handleReset} className="space-y-3">
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Naya password (min 6 characters)"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand outline-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetTarget(null);
                    setNewPassword("");
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {resetting ? "Resetting..." : "Reset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage subscription modal */}
      {subTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-ink mb-1">Manage Subscription</h3>
            <p className="text-sm text-slate-500 mb-4">
              {subTarget.name} ({subTarget.phone || subTarget.email}) — abhi{" "}
              {subTarget.subscriptionStatus === "active" ? "Premium" : "Free"}
            </p>

            <form onSubmit={handleSubSave} className="space-y-3">
              <div className="flex gap-2">
                {["grant", "extend", "revoke"].map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setSubAction(a)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${
                      subAction === a ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>

              {subAction !== "revoke" && (
                <select
                  value={subPlan}
                  onChange={(e) => setSubPlan(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand outline-none text-sm"
                >
                  <option value="half_yearly">6 Months</option>
                  <option value="yearly">12 Months</option>
                </select>
              )}

              <input
                type="text"
                value={subReason}
                onChange={(e) => setSubReason(e.target.value)}
                placeholder={
                  subAction === "revoke" ? "Reason (e.g. refund, chargeback)" : "Reason (e.g. offline UPI payment)"
                }
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand outline-none text-sm"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSubTarget(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={subSaving}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-60 ${
                    subAction === "revoke" ? "bg-red-500 hover:bg-red-600" : "bg-brand hover:bg-brand-dark"
                  }`}
                >
                  {subSaving ? "Saving..." : subAction === "revoke" ? "Revoke Access" : "Confirm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tint, bg, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`text-left bg-white border border-slate-100 rounded-2xl shadow-sm p-4 ${onClick ? "hover:border-slate-200 cursor-pointer" : "cursor-default"}`}
    >
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
        <Icon size={16} className={tint} />
      </div>
      <p className="text-xl font-bold text-ink">{(value ?? 0).toLocaleString("en-IN")}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </button>
  );
}