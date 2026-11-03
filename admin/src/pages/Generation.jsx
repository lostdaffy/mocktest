import { useEffect, useRef, useState } from "react";
import {
  RiTimeLine,
  RiLoader4Line,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiPauseCircleLine,
  RiPlayCircleLine,
  RiRefreshLine,
  RiStackLine,
  RiBookOpenLine,
  RiFileList3Line,
  RiCpuLine,
} from "@remixicon/react";
import api from "../api/axios";
import { PageHeader, Card } from "../components/ui";
import { useToast } from "../components/Toast";

// Deliberately left empty for now - these go stale in weeks, so they are not
// worth generating before launch. Named once, and used both for the count on
// the button and for what the button actually queues, because a button that
// promises 38 and queues 31 is a button nobody trusts again.
const LEFT_ALONE = ["Current Affairs"];

const KIND = {
  practice: "Practice test",
  practice_series: "Practice series",
  top_up: "Top-up",
  mock: "Mock test",
  quality_check: "Quality check",
  daily_quiz: "Daily quiz",
  live: "Live exam",
  pyq_extract: "PYQ extraction",
  reference_read: "Reference reading",
  lessons: "Lessons",
  quality_audit: "Quality audit",
  chapter_health: "Chapter health check",
};
const when = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—";
const ago = (d, now) => {
  if (!d) return "";
  const s = Math.max(0, Math.round((now - new Date(d).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
};

// The generation queue, made visible.
//
// The work is rows on the server, so this page only shows them - and keeps
// showing the truth after a reload, because it reads the queue rather than
// being it. It asks for the status every 5 s while something is building and
// every 15 s while idle, never while the last answer is still on its way, and
// asks for the catalog's gaps (the expensive call) only on open and after an
// action.
export default function Generation() {
  const toast = useToast();
  const [status, setStatus] = useState(null);
  const [gaps, setGaps] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  // Server clock minus this computer's, so a countdown is right even when the
  // admin's laptop clock is a few minutes out.
  const clockOffset = useRef(0);
  const inFlight = useRef(false);
  const timer = useRef(null);

  async function loadStatus() {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const s = await api.get("/generation/status");
      if (s.data.serverTime) clockOffset.current = new Date(s.data.serverTime).getTime() - Date.now();
      setStatus(s.data);
      setError("");
    } catch (err) {
      setError(err.response ? err.response.data?.message || "Couldn't read the queue" : "Couldn't reach the server — trying again.");
    } finally {
      inFlight.current = false;
    }
  }

  async function loadGaps() {
    try {
      const g = await api.get("/generation/gaps", { params: { exclude: LEFT_ALONE.join(",") } });
      setGaps(g.data);
    } catch {
      /* the buttons just show no count */
    }
  }

  const active = !!(status?.current || status?.counts?.queued);

  useEffect(() => {
    loadStatus();
    loadGaps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    clearInterval(timer.current);
    timer.current = setInterval(loadStatus, active ? 5000 : 15000);
    return () => clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // A one-second tick for the "running for" clock.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  async function act(label, fn) {
    setBusy(label);
    try {
      const res = await fn();
      toast.success(res.data?.message || "Done");
      await Promise.all([loadStatus(), loadGaps()]);
    } catch (err) {
      toast.error(err.response?.data?.message || "That didn't work");
    } finally {
      setBusy("");
    }
  }

  const counts = status?.counts || {};
  const running = status?.current;
  const waiting = counts.queued || 0;
  const done = counts.done || 0;
  const failed = counts.failed || 0;
  const total = status?.total || 0;
  const serverNow = now + clockOffset.current;

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Generation"
        subtitle="Everything the server is building, waiting to build, and has built. It runs on the server — you can close this page and it carries on."
        actions={
          <button onClick={() => Promise.all([loadStatus(), loadGaps()])} className="rv-btn-secondary !px-2.5 !py-1.5" title="Refresh" aria-label="Refresh">
            <RiRefreshLine size={16} />
          </button>
        }
      />

      {error && <div className="rv-card p-3 mb-5 text-sm text-warn border-l-4 border-l-warn">{error}</div>}

      {status && <QueueStatus status={status} now={serverNow} busy={busy} onResume={() => act("resume", () => api.post("/generation/resume"))} />}

      {/* Progress + counts */}
      <Card className="!p-5 mb-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-slate">Overall progress</p>
            <p className="font-display text-[28px] font-extrabold text-ink tabular-nums leading-tight mt-1">
              {status ? `${status.percentDone}%` : "—"}
              <span className="text-base font-semibold text-slate-soft"> · {done + failed} of {total} jobs</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill icon={RiTimeLine} tone="bg-slate-light text-slate" label="Waiting" value={waiting} />
            <Pill icon={RiLoader4Line} tone="bg-info-light text-info" label="Building" value={counts.running || 0} spin={!!running} />
            <Pill icon={RiCheckboxCircleLine} tone="bg-success-light text-success" label="Done" value={done} />
            <Pill icon={RiErrorWarningLine} tone={failed ? "bg-danger-light text-danger" : "bg-slate-light text-slate"} label="Failed" value={failed} />
          </div>
        </div>
        <div className="h-2.5 rounded-full bg-slate-light overflow-hidden mt-4">
          <div className="h-full rounded-full bg-gradient-to-r from-brand-dark to-brand transition-all duration-700" style={{ width: `${status?.percentDone || 0}%` }} />
        </div>

        {running && (
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-info-light/60 border border-info-border px-3.5 py-2.5">
            <RiLoader4Line size={18} className="text-info animate-spin shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink truncate">{running.label}</p>
              <p className="text-xs text-slate">
                {KIND[running.kind] || running.kind} · running for {ago(running.startedAt, serverNow)}
                {running.attempts > 1 ? ` · attempt ${running.attempts}` : ""}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-border-soft">
          <button
            onClick={() => act("enqueue", () => api.post("/generation/enqueue", { practice: true, mocks: false, exclude: LEFT_ALONE }))}
            disabled={!!busy}
            className="rv-btn-primary !text-[13px] disabled:opacity-60"
          >
            {busy === "enqueue" ? "Queueing..." : `Build missing practice tests${gaps ? ` (${gaps.totals.practice})` : ""}`}
          </button>
          <button
            onClick={() => act("mocks", () => api.post("/generation/enqueue", { practice: false, mocks: true, mocksPerExam: 1 }))}
            disabled={!!busy}
            className="rv-btn-secondary !text-[13px] disabled:opacity-60"
          >
            {busy === "mocks" ? "Queueing..." : `Build one mock per exam${gaps ? ` (${gaps.totals.mocks})` : ""}`}
          </button>
          {!status?.paused && (waiting > 0 || running) && (
            <button onClick={() => act("pause", () => api.post("/generation/pause"))} disabled={!!busy} className="rv-btn-secondary !text-[13px] disabled:opacity-60">
              <RiPauseCircleLine size={16} /> {busy === "pause" ? "Pausing..." : "Pause"}
            </button>
          )}
          {status?.paused && (
            <button onClick={() => act("resume", () => api.post("/generation/resume"))} disabled={!!busy} className="rv-btn-secondary !text-[13px] disabled:opacity-60">
              <RiPlayCircleLine size={16} /> {busy === "resume" ? "Resuming..." : "Resume"}
            </button>
          )}
          {failed > 0 && (
            <button onClick={() => act("retry", () => api.post("/generation/retry-failed"))} disabled={!!busy} className="rv-btn-secondary !text-[13px] disabled:opacity-60">
              {busy === "retry" ? "Retrying..." : `Retry ${failed} failed`}
            </button>
          )}
          {waiting > 0 && (
            <button
              onClick={async () => {
                const ok = await toast.confirm({
                  title: `Cancel ${waiting} waiting job(s)?`,
                  message: "Anything already built stays. You can queue them again later.",
                  confirmLabel: "Cancel them",
                  danger: true,
                });
                if (ok) act("cancel", () => api.delete("/generation/queue"));
              }}
              disabled={!!busy}
              className="ml-auto text-[13px] text-danger hover:underline px-2 py-1.5"
            >
              Cancel what's waiting
            </button>
          )}
          <p className="w-full text-xs text-slate-soft">
            {LEFT_ALONE.join(", ")} is left out on purpose — it goes stale too quickly to be worth generating.
          </p>
        </div>
      </Card>

      {/* Coverage */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-5">
        <Stat
          icon={RiBookOpenLine}
          label="Practice tests built"
          value={status ? `${status.coverage.practice.built} / ${status.coverage.practice.possible}` : "—"}
          pct={status ? (status.coverage.practice.built / Math.max(1, status.coverage.practice.possible)) * 100 : 0}
        />
        <Stat
          icon={RiFileList3Line}
          label="Exams with a full mock"
          value={status ? `${status.coverage.mocks.examsCovered ?? status.coverage.mocks.built} of ${status.coverage.mocks.exams}` : "—"}
          pct={status ? ((status.coverage.mocks.examsCovered ?? status.coverage.mocks.built) / Math.max(1, status.coverage.mocks.exams)) * 100 : 0}
          // Only a full paper counts. A mock stopped part way is listed here,
          // and building mocks finishes it rather than starting another.
          hint={
            status?.coverage?.mocks?.unfinished?.length
              ? `Unfinished: ${status.coverage.mocks.unfinished.map((u) => `${u.examType.replace(/_/g, " ")} ${u.have}/${u.of}`).join(", ")}`
              : undefined
          }
        />
        <Stat
          icon={RiCpuLine}
          label="AI model in use"
          value={status?.ai?.inUse || "—"}
          hint={status?.ai?.models?.length > 1 ? `${status.ai.models.length} models, each with its own daily allowance` : undefined}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <JobTable
          title="Waiting"
          icon={RiStackLine}
          empty="Nothing is waiting."
          rows={status?.waiting || []}
          more={waiting > (status?.waiting?.length || 0) ? waiting - status.waiting.length : 0}
          cols={[
            ["#", (j, i) => i + 1, "w-8 text-slate-soft tabular-nums"],
            ["Job", (j) => j.label, "text-ink"],
            ["Type", (j) => KIND[j.kind] || j.kind, "text-slate whitespace-nowrap"],
            ["Queued", (j) => when(j.queuedAt), "text-slate whitespace-nowrap tabular-nums"],
          ]}
        />
        <div className="space-y-4">
          {failed > 0 && (
            <JobTable
              title="Failed, and why"
              icon={RiErrorWarningLine}
              tone="danger"
              rows={status?.recentFailures || []}
              cols={[
                ["Job", (j) => j.label, "text-ink"],
                ["Reason", (j) => j.lastError || "—", "text-danger"],
                ["When", (j) => when(j.finishedAt), "text-slate whitespace-nowrap tabular-nums"],
              ]}
            />
          )}
          <JobTable
            title="Just built"
            icon={RiCheckboxCircleLine}
            tone="success"
            empty="Nothing built yet."
            rows={status?.recentDone || []}
            action={
              (status?.recentDone || []).length > 0 && (
                <button onClick={() => act("clear", () => api.delete("/generation/history"))} disabled={!!busy} className="text-xs text-slate-soft hover:text-ink">
                  Clear history
                </button>
              )
            }
            cols={[
              ["Job", (j) => j.label, "text-ink"],
              ["Result", (j) => j.result || "—", "text-slate"],
              ["When", (j) => when(j.finishedAt), "text-slate whitespace-nowrap tabular-nums"],
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function Pill({ icon: Icon, tone, label, value, spin }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold ${tone}`}>
      <Icon size={15} className={spin ? "animate-spin" : ""} />
      <span className="tabular-nums">{value}</span>
      <span className="font-medium opacity-80">{label}</span>
    </span>
  );
}

function Stat({ icon: Icon, label, value, hint, pct }) {
  return (
    <Card className="!p-4">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-sm bg-brand/10 text-brand grid place-items-center shrink-0">
          <Icon size={19} />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-slate">{label}</p>
          <p className="font-display text-lg font-extrabold text-ink tabular-nums truncate">{value}</p>
        </div>
      </div>
      {pct != null && (
        <div className="h-1.5 rounded-full bg-slate-light overflow-hidden mt-3">
          <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      )}
      {hint && <p className="text-xs text-slate-soft mt-2">{hint}</p>}
    </Card>
  );
}

function JobTable({ title, icon: Icon, tone, rows, cols, empty = "Nothing here.", more = 0, action }) {
  const toneCls = tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-brand";
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border-soft">
        <p className="font-semibold text-ink flex items-center gap-2">
          <Icon size={17} className={toneCls} />
          {title}
          <span className="text-xs font-medium text-slate-soft">({rows.length + more})</span>
        </p>
        {action}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-soft px-4 py-6 text-center">{empty}</p>
      ) : (
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-surface">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate bg-slate-light/60">
                {cols.map(([h]) => (
                  <th key={h} className="px-4 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft">
              {rows.map((r, i) => (
                <tr key={r._id || i} className="align-top hover:bg-slate-light/40">
                  {cols.map(([h, get, cls]) => (
                    <td key={h} className={`px-4 py-2 ${cls}`}>
                      {get(r, i)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {more > 0 && <p className="text-xs text-slate-soft px-4 py-2 border-t border-border-soft">…and {more} more</p>}
        </div>
      )}
    </Card>
  );
}

// What the queue is doing and what happens next, in words.
//
// It used to say "The queue stopped itself" and offer a Resume button. Someone
// pressed it at 11:49, before the AI's daily limit had reset at 12:30, and the
// queue stopped again straight away - the page never said from when a Resume
// would work. This tells them when.
function QueueStatus({ status, now, busy, onResume }) {
  const queued = status.counts?.queued || 0;
  const forAllowance = status.paused && status.resumableAfter;

  let tone;
  let title;
  let body;
  let action = null;

  if (forAllowance) {
    const at = new Date(status.resumableAfter);
    const minutes = Math.ceil((at.getTime() - now) / 60000);
    const at12 = at.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" });
    const ready = minutes <= 0;
    tone = ready ? "ok" : "warn";
    title = ready ? "Ready to resume" : "Stopped — the AI's daily limit is used up";
    body = ready ? (
      <>
        The daily limit reset at {at12}. <b>Press Resume</b> to carry on — {queued} job(s) waiting.
      </>
    ) : (
      <>
        You can resume <b>after {at12}</b> — <b>{formatWait(minutes)}</b> from now. Pressing Resume before then won't help: the queue will
        just stop again.
      </>
    );
    action = (
      <button onClick={onResume} disabled={!!busy} className={`${ready ? "rv-btn-primary" : "rv-btn-secondary"} disabled:opacity-60`}>
        {busy === "resume" ? "Resuming..." : ready ? "Resume" : `Resume (after ${at12})`}
      </button>
    );
  } else if (status.paused && status.pausedBy === "worker") {
    tone = "warn";
    title = "The queue stopped itself";
    body = <>{status.pausedReason || "It hit a problem it could not get past on its own."}</>;
    action = (
      <button onClick={onResume} disabled={!!busy} className="rv-btn-primary disabled:opacity-60">
        {busy === "resume" ? "Resuming..." : "Resume"}
      </button>
    );
  } else if (status.paused) {
    tone = "warn";
    title = "Paused by an admin";
    body = queued ? <>{queued} job(s) are waiting. Nothing is built until someone presses Resume.</> : <>Nothing is waiting.</>;
  } else {
    return null;
  }

  const style = tone === "warn" ? "border-l-warn bg-warn-light/40" : "border-l-success bg-success-light/40";
  return (
    <div className={`rv-card p-4 mb-5 border-l-4 ${style}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{title}</p>
          <p className="text-sm text-slate mt-1">{body}</p>
        </div>
        {action}
      </div>
    </div>
  );
}

function formatWait(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
