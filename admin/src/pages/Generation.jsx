import { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { PageHeader } from "../components/ui";
import { useToast } from "../components/Toast";

// Deliberately left empty for now - these go stale in weeks, so they are not
// worth generating before launch. Named once, and used both for the count on
// the button and for what the button actually queues, because a button that
// promises 38 and queues 31 is a button nobody trusts again.
const LEFT_ALONE = ["Current Affairs"];

// The generation queue, made visible.
//
// Filling the bank used to mean holding a browser tab open and asking someone
// else how far along it was. The work is rows on the server now, so this page
// only has to show them - and it keeps showing the truth after a reload,
// because it is reading the queue rather than being it.
export default function Generation() {
  const toast = useToast();
  const [status, setStatus] = useState(null);
  const [gaps, setGaps] = useState(null);
  const [busy, setBusy] = useState("");
  const timer = useRef(null);
  // Server clock minus this computer's, so a countdown is right even when the
  // admin's laptop clock is a few minutes out.
  const clockOffset = useRef(0);

  async function load({ silent = false } = {}) {
    try {
      const [s, g] = await Promise.all([
        api.get("/generation/status"),
        api.get("/generation/gaps", { params: { exclude: LEFT_ALONE.join(",") } }),
      ]);
      if (s.data.serverTime) clockOffset.current = new Date(s.data.serverTime).getTime() - Date.now();
      setStatus(s.data);
      setGaps(g.data);
    } catch (err) {
      if (!silent) toast.error(err.response?.data?.message || "Couldn't read the queue");
    }
  }

  useEffect(() => {
    load();
    // Two seconds while something is running, ten while it is idle - often
    // enough to feel live, rarely enough not to hammer a free instance.
    timer.current = setInterval(() => load({ silent: true }), 2500);
    return () => clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(label, fn) {
    setBusy(label);
    try {
      const res = await fn();
      toast.success(res.data?.message || "Done");
      await load({ silent: true });
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

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Generation"
        subtitle="Queue up everything the catalog is missing and watch it build. The queue runs on the server, so you can close this page and it carries on."
      />

      {status && (
        <QueueStatus
          status={status}
          now={Date.now() + clockOffset.current}
          busy={busy}
          onResume={() => act("resume", () => api.post("/generation/resume"))}
        />
      )}

      <div className="rv-card p-5 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <div>
            <p className="font-semibold text-ink">
              {running
                ? "Building now"
                : waiting && status?.paused
                ? "Stopped"
                : waiting
                ? "Starting in a moment"
                : total
                ? "Nothing left to build"
                : "Queue is empty"}
            </p>
            <p className="text-sm text-slate-soft mt-0.5">
              {running ? running.label : waiting ? `${waiting} job(s) queued` : " "}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-ink tabular-nums">
              {done}
              <span className="text-slate-soft text-base"> / {total || 0}</span>
            </p>
            {failed > 0 && <p className="text-sm text-danger">{failed} failed</p>}
          </div>
        </div>

        <div className="h-2 rounded-full bg-slate-light overflow-hidden">
          <div
            className="h-full bg-brand transition-all duration-500"
            style={{ width: `${status?.percentDone || 0}%` }}
          />
        </div>

        <div className="flex flex-wrap gap-2 mt-5">
          <button
            onClick={() =>
              act("enqueue", () => api.post("/generation/enqueue", { practice: true, mocks: false, exclude: LEFT_ALONE }))
            }
            disabled={!!busy}
            className="rv-btn-primary disabled:opacity-60"
          >
            {busy === "enqueue" ? "Queueing..." : `Build all missing practice tests${gaps ? ` (${gaps.totals.practice})` : ""}`}
          </button>

          <button
            onClick={() => act("mocks", () => api.post("/generation/enqueue", { practice: false, mocks: true, mocksPerExam: 1 }))}
            disabled={!!busy}
            className="rv-btn-secondary disabled:opacity-60"
          >
            {busy === "mocks" ? "Queueing..." : `Build one mock per exam${gaps ? ` (${gaps.totals.mocks})` : ""}`}
          </button>

          {!status?.paused && (waiting > 0 || running) && (
            <button
              onClick={() => act("pause", () => api.post("/generation/pause"))}
              disabled={!!busy}
              className="rv-btn-secondary disabled:opacity-60"
            >
              {busy === "pause" ? "Pausing..." : "Pause"}
            </button>
          )}

          {failed > 0 && (
            <button
              onClick={() => act("retry", () => api.post("/generation/retry-failed"))}
              disabled={!!busy}
              className="rv-btn-secondary disabled:opacity-60"
            >
              {busy === "retry" ? "Retrying..." : `Retry ${failed} failed`}
            </button>
          )}

          <p className="w-full text-xs text-slate-soft mt-1">
            {LEFT_ALONE.join(", ")} is left out on purpose — it goes stale too quickly to be worth
            generating before launch.
          </p>

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
              className="text-sm text-slate-soft hover:text-ink px-3 py-1.5"
            >
              Cancel what's waiting
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Stat label="Practice tests built" value={status ? `${status.coverage.practice.built} / ${status.coverage.practice.possible}` : "—"} />
        <Stat
          label="Mocks built"
          value={
            status
              ? `${status.coverage.mocks.examsCovered ?? status.coverage.mocks.built} of ${status.coverage.mocks.exams} exams`
              : "—"
          }
          // Only a full paper counts. A mock stopped part way by the day's
          // allowance is listed here, and building mocks finishes it rather
          // than starting another.
          hint={
            status?.coverage?.mocks?.unfinished?.length
              ? `Unfinished: ${status.coverage.mocks.unfinished
                  .map((u) => `${u.examType.replace(/_/g, " ")} ${u.have}/${u.of}`)
                  .join(", ")}`
              : undefined
          }
        />
        <Stat
          label="Writing with"
          value={status?.ai?.inUse || "—"}
          hint={status?.ai?.models?.length > 1 ? `${status.ai.models.length} models, each with its own daily allowance` : undefined}
        />
      </div>

      {failed > 0 && (
        <div className="rv-card p-5 mb-6">
          <p className="font-semibold text-ink mb-3">What failed, and why</p>
          <div className="space-y-2">
            {(status.recentFailures || []).map((f) => (
              <div key={f._id} className="text-sm border-l-2 border-l-danger pl-3">
                <p className="text-ink">{f.label}</p>
                <p className="text-slate-soft">{f.lastError}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(status?.recentDone || []).length > 0 && (
        <div className="rv-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-ink">Just built</p>
            <button
              onClick={() => act("clear", () => api.delete("/generation/history"))}
              disabled={!!busy}
              className="text-sm text-slate-soft hover:text-ink"
            >
              Clear history
            </button>
          </div>
          <div className="space-y-2">
            {status.recentDone.map((d) => (
              <div key={d._id} className="text-sm border-l-2 border-l-success pl-3">
                <p className="text-ink">{d.label}</p>
                <p className="text-slate-soft">{d.result}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// What the queue is doing and what happens next, in words.
//
// It used to say "The queue stopped itself" and offer a Resume button. Someone
// pressed it at 11:49, before the AI's daily limit had reset at 12:30, and the
// queue stopped again straight away - the page never said from when a Resume
// would work. The team resumes the queue themselves; this tells them when.
function QueueStatus({ status, now, busy, onResume }) {
  const waitingJobs = status.waiting || [];
  const queued = status.counts?.queued || 0;
  const running = status.current;
  const forAllowance = status.paused && status.resumableAfter;

  let tone = "info";
  let title;
  let body;
  let action = null;

  if (forAllowance) {
    // The team resumes the queue themselves; this only says why it stopped
    // and from when a Resume will do anything.
    const at = new Date(status.resumableAfter);
    const minutes = Math.ceil((at.getTime() - now) / 60000);
    const when = at.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" });
    const ready = minutes <= 0;
    tone = ready ? "ok" : "warn";
    title = ready ? "Ready to resume" : "Stopped — the AI's daily limit is used up";
    body = ready ? (
      <>
        The daily limit reset at {when}. <b>Press Resume</b> to carry on — {queued} job(s) waiting.
      </>
    ) : (
      <>
        You can resume <b>after {when}</b> — <b>{formatWait(minutes)}</b> from now. Pressing Resume before then
        won't help: the queue will just stop again.
      </>
    );
    action = (
      <button
        onClick={onResume}
        disabled={!!busy}
        className={`${ready ? "rv-btn-primary" : "rv-btn-secondary"} disabled:opacity-60`}
      >
        {busy === "resume" ? "Resuming..." : ready ? "Resume" : `Resume (after ${when})`}
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
    body = queued
      ? <>{queued} job(s) are waiting. Nothing is built until someone presses Resume.</>
      : <>Nothing is waiting. Resume before queueing more, or queueing will resume it for you.</>;
    action = (
      <button onClick={onResume} disabled={!!busy} className="rv-btn-primary disabled:opacity-60">
        {busy === "resume" ? "Resuming..." : "Resume"}
      </button>
    );
  } else if (running) {
    tone = "ok";
    title = "Building";
    body = <>{running.label}{queued ? ` — then ${queued} more.` : " — the last one."}</>;
  } else if (queued) {
    tone = "ok";
    title = "Starting";
    body = <>{queued} job(s) waiting; the next one starts within a few seconds.</>;
  } else {
    return null;
  }

  const border = { warn: "border-l-warn", ok: "border-l-success", info: "border-l-brand" }[tone];

  return (
    <div className={`rv-card p-4 mb-6 border-l-4 ${border}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{title}</p>
          <p className="text-sm text-slate mt-1">{body}</p>
        </div>
        {action}
      </div>

      {waitingJobs.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border-soft">
          <p className="text-xs font-medium text-slate-soft mb-1.5">
            {forAllowance || status.paused ? "Waiting" : "Next up"} ({queued})
          </p>
          <ol className="text-sm text-ink-soft space-y-0.5 list-decimal list-inside">
            {waitingJobs.map((j) => (
              <li key={j._id}>{j.label}</li>
            ))}
          </ol>
          {queued > waitingJobs.length && (
            <p className="text-xs text-slate-soft mt-1">…and {queued - waitingJobs.length} more</p>
          )}
        </div>
      )}
    </div>
  );
}

function formatWait(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function Stat({ label, value, hint }) {
  return (
    <div className="rv-card p-4">
      <p className="text-sm text-slate-soft">{label}</p>
      <p className="text-lg font-semibold text-ink mt-1">{value}</p>
      {hint && <p className="text-xs text-slate-soft mt-1">{hint}</p>}
    </div>
  );
}
