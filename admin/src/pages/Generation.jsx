import { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { PageHeader } from "../components/ui";
import { useToast } from "../components/Toast";

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

  async function load({ silent = false } = {}) {
    try {
      const [s, g] = await Promise.all([api.get("/generation/status"), api.get("/generation/gaps")]);
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

      {status?.paused && (
        <div className="rv-card p-4 mb-6 border-l-4 border-l-warn">
          <p className="font-medium text-ink">
            {status.pausedBy === "worker" ? "The queue stopped itself" : "Paused"}
          </p>
          <p className="text-sm text-slate-soft mt-1">{status.pausedReason}</p>
          <button
            onClick={() => act("resume", () => api.post("/generation/resume"))}
            disabled={!!busy}
            className="rv-btn-primary mt-3 disabled:opacity-60"
          >
            {busy === "resume" ? "Resuming..." : "Resume"}
          </button>
        </div>
      )}

      <div className="rv-card p-5 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <div>
            <p className="font-semibold text-ink">
              {running ? "Building now" : waiting ? "Waiting to start" : total ? "Nothing left to build" : "Queue is empty"}
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
              act("enqueue", () => api.post("/generation/enqueue", { practice: true, mocks: false, exclude: ["Current Affairs"] }))
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
        <Stat label="Mocks built" value={status ? `${status.coverage.mocks.built} across ${status.coverage.mocks.exams} exams` : "—"} />
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

function Stat({ label, value, hint }) {
  return (
    <div className="rv-card p-4">
      <p className="text-sm text-slate-soft">{label}</p>
      <p className="text-lg font-semibold text-ink mt-1">{value}</p>
      {hint && <p className="text-xs text-slate-soft mt-1">{hint}</p>}
    </div>
  );
}
