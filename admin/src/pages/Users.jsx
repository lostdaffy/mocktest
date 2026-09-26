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
import { PageHeader } from "../components/ui";
import { useToast } from "../components/Toast";

const PAGE_SIZE = 25;
const PLAN_LABELS = {
  quarterly: "3mo",
  half_yearly: "6mo",
  yearly: "12mo",
};
const EXAM_LABELS = {
  SSC_CGL: "SSC",
  UP_POLICE: "UP Police",
  RAILWAY: "Railway",
  BANKING: "Banking",
  CTET: "CTET",
};

export default function Users() {
  const toast = useToast();
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

  // ---- Support view: everything about one account, and the fixes for it
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [actionBusy, setActionBusy] = useState("");

  async function openDetail(id) {
    setDetailId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await api.get("/admin/users/" + id);
      setDetail(res.data);
      setEditName(res.data.user?.name || "");
      setEditEmail(res.data.user?.email || "");
    } catch (err) {
      toast.error("Couldn't load the user: " + (err.response?.data?.message || err.message));
      setDetailId(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setDetailId(null);
    setDetail(null);
  }

  async function runUserAction(path, busyKey) {
    setActionBusy(busyKey);
    try {
      const res = await api.patch("/admin/users/" + detailId + path);
      toast.success(res.data.message || "Done");
      await openDetail(detailId);
      load(page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally {
      setActionBusy("");
    }
  }

  async function saveUserProfile() {
    setSavingProfile(true);
    try {
      await api.patch("/admin/users/" + detailId + "/profile", { name: editName, email: editEmail });
      toast.success("Profile updated");
      await openDetail(detailId);
      load(page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't save");
    } finally {
      setSavingProfile(false);
    }
  }

  async function deleteUserAccount() {
    const u = detail?.user;
    const ok = await toast.confirm({
      title: "Delete this account?",
      message:
        (u ? u.name + " (" + u.phone + ") — " : "") +
        "profile, test results, progress and referral credits are removed permanently. Paid payment records are kept for tax. This can't be undone.",
      confirmLabel: "Delete forever",
      danger: true,
    });
    if (!ok) return;
    setActionBusy("delete");
    try {
      const res = await api.delete("/admin/users/" + detailId);
      toast.success(res.data.message || "Account deleted");
      closeDetail();
      load(page);
      loadStats();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    } finally {
      setActionBusy("");
    }
  }

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
      toast.error("Couldn't load users: " + (err.response?.data?.message || err.message));
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
      toast.error("Export failed: " + (err.response?.data?.message || err.message));
    } finally {
      setExporting(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setResetting(true);
    try {
      await api.patch(`/admin/users/${resetTarget._id}/reset-password`, { newPassword });
      toast.success(`Password reset for ${resetTarget.name}`);
      setResetTarget(null);
      setNewPassword("");
    } catch (err) {
      toast.error("Reset failed: " + (err.response?.data?.message || err.message));
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
      const res = await api.patch(`/admin/users/${subTarget._id}/subscription`, {
        action: subAction,
        plan: subAction !== "revoke" ? subPlan : undefined,
        reason: subReason || undefined,
      });
      toast.success(res.data.message || "Subscription updated");
      setSubTarget(null);
      load(page, search);
      loadStats();
    } catch (err) {
      toast.error("Update failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSubSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Students"
        title="Users"
        actions={
          <button onClick={handleExport} disabled={exporting} className="rv-btn-secondary">
            <RiDownloadLine size={15} />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        }
      />
      <p className="text-slate -mt-4 mb-6">
        {total.toLocaleString("en-IN")} total students. Filter, search, or manage the full list here.
      </p>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard icon={RiUserLine} label="Total" value={stats.total} tint="text-slate" bg="bg-slate-light" />
          <StatCard icon={RiStarLine} label="Premium" value={stats.premium} tint="text-success" bg="bg-success-light" />
          <StatCard
            icon={RiAlarmWarningLine}
            label="Expiring (7d)"
            value={stats.expiringSoon}
            tint="text-warn"
            bg="bg-warn-light"
            onClick={() => setSubscription("expiring")}
          />
          <StatCard icon={RiTimeLine} label="New this week" value={stats.newThisWeek} tint="text-brand" bg="bg-brand/5" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <RiSearchLine size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-soft" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by phone, name or email..."
            className="rv-input !pl-10"
          />
        </div>

        <select
          value={subscription}
          onChange={(e) => setSubscription(e.target.value)}
          className="rv-input text-sm !w-auto min-w-[150px]"
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
          className="rv-input text-sm !w-auto min-w-[150px]"
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
          className="rv-input text-sm !w-auto min-w-[150px]"
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
            className="flex items-center gap-1 text-sm text-slate hover:text-ink"
          >
            <RiCloseLine size={15} /> Clear filters
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-3 min-h-[200px]">
        {loading ? (
          <p className="text-slate-soft text-center py-10">Loading...</p>
        ) : users.length === 0 ? (
          <p className="text-slate-soft text-center py-10">No users found.</p>
        ) : (
          users.map((u) => {
            const isExpiring =
              u.subscriptionStatus === "active" &&
              u.subscriptionExpiresAt &&
              new Date(u.subscriptionExpiresAt) - new Date() < 7 * 24 * 60 * 60 * 1000;

            return (
              <div key={u._id} className="rv-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-ink">{u.name}</p>
                      {u.authProvider === "google" && (
                        <span className="text-[10px] font-semibold bg-slate-light text-slate px-2 py-0.5 rounded-full">
                          Google
                        </span>
                      )}
                      {isExpiring && (
                        <span className="text-[10px] font-semibold bg-warn-light text-warn px-2 py-0.5 rounded-full">
                          Expiring soon
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate">
                      {u.phone || "—"} {u.email && `· ${u.email}`}
                    </p>
                    <p className="text-xs text-slate-soft mt-1">
                      {u.subscriptionStatus === "active" ? (
                        <span className="text-success font-medium">
                          ⭐ Premium ({PLAN_LABELS[u.subscriptionPlan] || "?"}) ·
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
                      onClick={() => openDetail(u._id)}
                      className="px-3.5 py-1.5 rounded-lg bg-ink-soft/5 hover:bg-ink-soft/10 text-ink-soft text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => openSubModal(u)}
                      className="px-3.5 py-1.5 rounded-lg bg-brand/5 hover:bg-brand/10 text-brand text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      Manage Plan
                    </button>
                    <button
                      onClick={() => setResetTarget(u)}
                      className="px-3.5 py-1.5 rounded-lg bg-warn-light hover:bg-warn-light text-warn text-xs font-medium transition-colors whitespace-nowrap"
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
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center disabled:opacity-30 hover:bg-slate-light"
          >
            <RiArrowLeftSLine size={18} />
          </button>
          <span className="text-sm text-slate">
            Page {page} of {pages}
          </span>
          <button
            onClick={() => load(page + 1)}
            disabled={page >= pages || loading}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center disabled:opacity-30 hover:bg-slate-light"
          >
            <RiArrowRightSLine size={18} />
          </button>
        </div>
      )}

      {/* Support view: one account, its state, and the fixes for it */}
      {detailId && (
        <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-lg w-full max-w-3xl max-h-[88vh] flex flex-col">
            <div className="flex items-start justify-between p-5 border-b border-border-soft">
              <div className="min-w-0">
                <h3 className="font-semibold text-ink">{detail?.user?.name || "Loading..."}</h3>
                {detail?.user && (
                  <p className="text-xs text-slate-soft mt-0.5">
                    {detail.user.phone || "no phone"}
                    {detail.user.email ? " · " + detail.user.email : " · no email"}
                    {" · joined " + new Date(detail.user.createdAt).toLocaleDateString("en-IN")}
                    {detail.user.role === "admin" && " · ADMIN"}
                  </p>
                )}
              </div>
              <button onClick={closeDetail} className="text-slate-soft hover:text-slate text-2xl leading-none">
                ×
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {detailLoading || !detail ? (
                <p className="text-sm text-slate-soft">Loading account...</p>
              ) : (
                <>
                  {/* Why they're stuck, at a glance */}
                  <div className="flex flex-wrap gap-2">
                    {detail.flags.locked && (
                      <Flag tone="danger">🔒 Locked · {detail.flags.lockMinutesLeft} min left</Flag>
                    )}
                    {!detail.flags.hasEmail && <Flag tone="warn">No email · password reset impossible</Flag>}
                    {!detail.flags.hasPassword && <Flag tone="warn">No password set · can only get in via email reset</Flag>}
                    {detail.flags.loggedInSomewhere && <Flag tone="slate">Logged in on a device</Flag>}
                    {detail.flags.failedLoginAttempts > 0 && (
                      <Flag tone="slate">{detail.flags.failedLoginAttempts} failed login attempts</Flag>
                    )}
                    {!detail.flags.hasPushToken && <Flag tone="slate">No notifications token</Flag>}
                    {!detail.flags.locked &&
                      detail.flags.hasEmail &&
                      detail.flags.hasPassword &&
                      detail.flags.failedLoginAttempts === 0 && <Flag tone="success">Account healthy</Flag>}
                  </div>

                  {/* The three fixes that solve most support calls */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => runUserAction("/unlock", "unlock")}
                      disabled={!!actionBusy}
                      className="px-3 py-1.5 rounded-lg bg-slate-light hover:bg-border-strong text-ink-soft text-xs font-medium disabled:opacity-50"
                    >
                      {actionBusy === "unlock" ? "Unlocking..." : "Unlock login"}
                    </button>
                    <button
                      onClick={() => runUserAction("/logout", "logout")}
                      disabled={!!actionBusy}
                      className="px-3 py-1.5 rounded-lg bg-slate-light hover:bg-border-strong text-ink-soft text-xs font-medium disabled:opacity-50"
                    >
                      {actionBusy === "logout" ? "Logging out..." : "Log out of all devices"}
                    </button>
                    <button
                      onClick={() => {
                        closeDetail();
                        setResetTarget(detail.user);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-warn-light hover:opacity-80 text-warn text-xs font-medium"
                    >
                      Reset password
                    </button>
                    <button
                      onClick={() => {
                        closeDetail();
                        openSubModal(detail.user);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-brand/5 hover:bg-brand/10 text-brand text-xs font-medium"
                    >
                      Manage plan
                    </button>
                    {detail.user.role !== "admin" && (
                      <button
                        onClick={deleteUserAccount}
                        disabled={!!actionBusy}
                        className="px-3 py-1.5 rounded-lg bg-danger-light hover:opacity-80 text-danger text-xs font-medium ml-auto disabled:opacity-50"
                      >
                        {actionBusy === "delete" ? "Deleting..." : "Delete account"}
                      </button>
                    )}
                  </div>

                  {/* Fixing a mistyped email is what makes password reset work again */}
                  <Panel title="Profile">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate mb-1">Name</label>
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} className="rv-input !py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate mb-1">Email (password reset goes here)</label>
                        <input
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="not set"
                          className="rv-input !py-1.5 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <button
                        onClick={saveUserProfile}
                        disabled={savingProfile}
                        className="px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-xs font-medium disabled:opacity-50"
                      >
                        {savingProfile ? "Saving..." : "Save"}
                      </button>
                      <span className="text-xs text-slate-soft">
                        Exam: {(detail.user.examGoals || []).join(", ") || "—"} · Language:{" "}
                        {detail.user.preferredLanguage || "—"} · Streak: {detail.user.streakCount || 0}
                      </span>
                    </div>
                  </Panel>

                  <Panel title="Subscription">
                    <p className="text-sm text-ink">
                      {detail.user.subscriptionStatus === "active" ? (
                        <span className="text-success font-medium">
                          Premium ({PLAN_LABELS[detail.user.subscriptionPlan] || detail.user.subscriptionPlan || "?"})
                          {typeof detail.user.daysLeft === "number" && " · " + detail.user.daysLeft + " days left"}
                        </span>
                      ) : (
                        <span className="text-slate">{detail.user.subscriptionStatus || "free"}</span>
                      )}
                      {detail.user.subscriptionExpiresAt &&
                        " · expires " + new Date(detail.user.subscriptionExpiresAt).toLocaleDateString("en-IN")}
                    </p>
                    <p className="text-xs text-slate-soft mt-1">
                      Free usage — mocks {detail.user.freeUsage?.mockTestsUsed || 0} · live{" "}
                      {detail.user.freeUsage?.liveExamsUsed || 0} · PYQ {detail.user.freeUsage?.pyqUsed || 0}
                    </p>

                    {detail.subscriptions?.length > 0 ? (
                      <div className="mt-3 space-y-1.5">
                        {detail.subscriptions.map((s) => (
                          <div key={s._id} className="text-xs flex items-center justify-between gap-3 border-b border-border-soft pb-1.5">
                            <span className="text-ink-soft">
                              ₹{s.amount} · {PLAN_LABELS[s.plan] || s.plan}
                              {s.couponCode && " · coupon " + s.couponCode}
                              {s.creditsUsed > 0 && " · ₹" + s.creditsUsed + " credit"}
                            </span>
                            <span className={s.status === "paid" ? "text-success" : "text-slate-soft"}>
                              {s.status} · {new Date(s.createdAt).toLocaleDateString("en-IN")}
                            </span>
                          </div>
                        ))}
                        <p className="text-[11px] text-slate-soft pt-1">
                          Razorpay payment id of the latest paid order:{" "}
                          {detail.subscriptions.find((s) => s.status === "paid")?.razorpayPaymentId || "—"}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-soft mt-2">No payment records.</p>
                    )}
                  </Panel>

                  <Panel title={"Activity · " + (detail.activity?.attemptCount || 0) + " tests taken"}>
                    {detail.activity?.recentAttempts?.length > 0 ? (
                      <div className="space-y-1.5">
                        {detail.activity.recentAttempts.map((a) => (
                          <div key={a._id} className="text-xs flex items-center justify-between gap-3 border-b border-border-soft pb-1.5">
                            <span className="text-ink-soft truncate">{a.test?.title || "Deleted test"}</span>
                            <span className="text-slate-soft whitespace-nowrap">
                              {a.status === "in_progress" ? (
                                <span className="text-warn">in progress</span>
                              ) : (
                                a.score + "/" + (a.totalMarks || 0) + " · " + (a.accuracy || 0) + "%"
                              )}
                              {" · " + new Date(a.submittedAt || a.createdAt).toLocaleDateString("en-IN")}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-soft">Hasn't taken any test yet.</p>
                    )}
                    <p className="text-xs text-slate-soft mt-2">
                      Question reports filed: {detail.activity?.reportCount || 0}
                    </p>
                  </Panel>

                  <Panel title="Referrals">
                    <p className="text-xs text-slate">
                      Code <b className="text-ink">{detail.user.referralCode || "—"}</b> · ₹
                      {detail.user.referralCredits || 0} credit · {detail.user.referredCount || 0} joined with it
                      {detail.user.referredBy && " · referred by " + detail.user.referredBy.name + " (" + detail.user.referredBy.phone + ")"}
                    </p>
                  </Panel>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-lg p-6 w-full max-w-sm">
            <h3 className="font-semibold text-ink mb-1">Password Reset</h3>
            <p className="text-sm text-slate mb-4">
              Set a new password for {resetTarget.name} ({resetTarget.phone})
            </p>
            <form onSubmit={handleReset} className="space-y-3">
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 6 characters)"
                className="rv-input"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetTarget(null);
                    setNewPassword("");
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-slate-light hover:bg-border-strong text-sm font-medium transition-colors"
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
        <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-lg p-6 w-full max-w-sm">
            <h3 className="font-semibold text-ink mb-1">Manage Subscription</h3>
            <p className="text-sm text-slate mb-4">
              {subTarget.name} ({subTarget.phone || subTarget.email}) — currently{" "}
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
                      subAction === a ? "bg-brand text-white" : "bg-slate-light text-slate hover:bg-border-strong"
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
                  className="w-full rv-input text-sm"
                >
                  <option value="quarterly">3 Months</option>
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
                className="w-full rv-input text-sm"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSubTarget(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-slate-light hover:bg-border-strong text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={subSaving}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-60 ${
                    subAction === "revoke" ? "bg-danger-light0 hover:bg-danger" : "bg-brand hover:bg-brand-dark"
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

function Flag({ tone, children }) {
  const tones = {
    danger: "bg-danger-light text-danger",
    warn: "bg-warn-light text-warn",
    success: "bg-success-light text-success",
    slate: "bg-slate-light text-slate",
  };
  return <span className={"text-[11px] font-medium px-2 py-1 rounded-full " + (tones[tone] || tones.slate)}>{children}</span>;
}

function Panel({ title, children }) {
  return (
    <div className="border border-border-soft rounded-xl p-4">
      <p className="text-xs font-semibold text-slate uppercase tracking-wide mb-2">{title}</p>
      {children}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tint, bg, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`text-left rv-card p-4 ${onClick ? "hover:border-border cursor-pointer" : "cursor-default"}`}
    >
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
        <Icon size={16} className={tint} />
      </div>
      <p className="text-xl font-bold text-ink">{(value ?? 0).toLocaleString("en-IN")}</p>
      <p className="text-xs text-slate-soft">{label}</p>
    </button>
  );
}