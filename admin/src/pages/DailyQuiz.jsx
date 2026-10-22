import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { PageHeader, Badge, Button, Checkbox } from "../components/ui";
import { useToast } from "../components/Toast";

// The Daily GK Quiz: 20 GK questions, the same for every student, live at
// 12:00 AM India time on its date. The app's daily button shows it (GET
// /api/tests/today), so nothing here needs an app update.

const STATUS = {
  ready: { label: "Ready", tone: "success" },
  draft: { label: "Draft", tone: "warn" },
  generating: { label: "Generating", tone: "brand" },
  none: { label: "Not prepared", tone: "neutral" },
};

function shortDay(date) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export default function DailyQuiz() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState(null);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(null);
  const [settings, setSettings] = useState(null);

  const selected = params.get("date") || list?.today;

  const loadList = useCallback(async () => {
    const res = await api.get("/daily-quiz");
    setList(res.data);
    setSettings((s) => s || res.data.settings);
  }, []);

  const loadDetail = useCallback(async (date) => {
    if (!date) return;
    const res = await api.get(`/daily-quiz/${date}`);
    setDetail(res.data);
  }, []);

  useEffect(() => {
    loadList().catch(() => toast.error("Couldn't load the daily quizzes"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setDetail(null);
    loadDetail(selected).catch(() => toast.error("Couldn't load that day"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // While AI questions are being made, check back every few seconds.
  const generating = detail?.quiz?.status === "generating" || ["queued", "running"].includes(detail?.job?.status);
  useEffect(() => {
    if (!generating) return;
    const t = setInterval(() => {
      loadDetail(selected).catch(() => {});
      loadList().catch(() => {});
    }, 5000);
    return () => clearInterval(t);
  }, [generating, selected, loadDetail, loadList]);

  async function act(key, fn, okMessage) {
    setBusy(key);
    try {
      const res = await fn();
      if (res?.data?.questions) setDetail(res.data);
      else await loadDetail(selected);
      await loadList();
      if (okMessage || res?.data?.message) toast.success(res?.data?.message || okMessage);
    } catch (err) {
      toast.error(err.response?.data?.message || "That didn't work");
    } finally {
      setBusy(null);
    }
  }

  async function saveSettings() {
    await act("settings", () => api.patch("/daily-quiz/settings", settings), "Settings saved");
  }

  const isPast = selected && list && selected < list.today;
  const status = detail?.quiz?.status || "none";

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Daily GK Quiz"
        subtitle="20 General Knowledge questions, the same for every student, live at 12:00 AM India time on its date. Free for everyone. Students open it from the daily test button in the app."
      />

      {/* What the scheduler may do by itself */}
      {settings && (
        <div className="rv-card p-5 mb-6">
          <p className="font-semibold text-ink mb-3">Automatic preparation</p>
          <div className="space-y-2.5">
            <Checkbox
              checked={!!settings.autoFromBank}
              onChange={(e) => setSettings({ ...settings, autoFromBank: e.target.checked })}
              label="If a day has no ready quiz, build it from published GK questions (no AI, uses questions the team has already checked)"
            />
            <Checkbox
              checked={!!settings.autoAI}
              onChange={(e) => setSettings({ ...settings, autoAI: e.target.checked })}
              label="Make new questions with AI for the coming days (uses the daily AI allowance; goes live without review)"
            />
            <label className="flex items-center gap-2.5 text-sm text-ink-soft">
              Prepare
              <select
                className="rv-input !w-20 !py-1"
                value={settings.daysAhead}
                onChange={(e) => setSettings({ ...settings, daysAhead: Number(e.target.value) })}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              day(s) ahead with AI
            </label>
            <p className="text-xs text-slate-soft">
              If the AI is down, the missing days stay queued and fill in by themselves when it is back. An AI quiz with a fault
              (two questions asking the same thing) is mended from the bank and goes live by itself. If tomorrow is still not
              ready by 6 PM, it is made from the bank, so midnight is always covered.
            </p>
          </div>
          <Button className="mt-4" size="sm" loading={busy === "settings"} onClick={saveSettings}>
            Save
          </Button>
        </div>
      )}

      {/* The days */}
      {!list ? (
        <p className="text-slate-soft">Loading...</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 mb-8">
          {list.days.map((d) => {
            const s = STATUS[d.status] || STATUS.none;
            const active = d.date === selected;
            return (
              <button
                key={d.date}
                onClick={() => setParams({ date: d.date })}
                className={`rv-card min-h-[118px] p-3 flex flex-col text-left transition-all ${
                  active ? "border-brand ring-2 ring-brand/40" : "hover:border-brand"
                } ${d.past ? "opacity-60" : ""}`}
              >
                <span className="text-[11px] font-semibold text-slate-soft">{d.today ? "TODAY" : d.past ? "Past" : "Upcoming"}</span>
                <span className="font-display font-bold text-ink mt-1 leading-tight">{shortDay(d.date)}</span>
                <span className="mt-auto">
                  <Badge tone={s.tone}>{s.label}</Badge>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* One day */}
      {selected && (
        <div className="rv-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-display text-xl font-bold text-ink">
                {detail?.label || selected} {detail?.today && <Badge tone="brand">Live today</Badge>}
              </h2>
              <p className="text-sm text-slate mt-1">
                <Badge tone={(STATUS[status] || STATUS.none).tone}>{(STATUS[status] || STATUS.none).label}</Badge>
                {detail?.quiz?.source && <span className="ml-2">Source: {detail.quiz.source}</span>}
                {detail?.quiz?.preparedBy && <span className="ml-2">· by {detail.quiz.preparedBy}</span>}
                <span className="ml-2">· {detail?.questions?.length || 0} / {list?.quizSize || 20} questions</span>
              </p>
            </div>
            {!isPast && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  loading={busy === "bank"}
                  disabled={generating}
                  onClick={() => act("bank", () => api.post(`/daily-quiz/${selected}/fill-bank`))}
                >
                  {detail?.questions?.length ? "Complete from bank" : "Fill from bank"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={busy === "ai"}
                  disabled={generating}
                  onClick={() => act("ai", () => api.post(`/daily-quiz/${selected}/generate-ai`))}
                >
                  Generate with AI (10 + 10)
                </Button>
                {status === "ready" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={busy === "draft"}
                    onClick={() => act("draft", () => api.patch(`/daily-quiz/${selected}/status`, { status: "draft" }), "Moved to draft")}
                  >
                    Move to draft
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    loading={busy === "ready"}
                    disabled={generating || !detail?.questions?.length}
                    onClick={() => act("ready", () => api.patch(`/daily-quiz/${selected}/status`, { status: "ready" }), "Marked ready - it goes live on its date")}
                  >
                    Mark ready
                  </Button>
                )}
              </div>
            )}
          </div>

          {generating && (
            <div className="mb-4 bg-info-light border border-info-border text-info text-sm rounded-lg px-4 py-3">
              AI questions are being made in two batches of 10 on the Generation page. This page refreshes by itself.
            </div>
          )}
          {detail?.job?.status === "failed" && (
            <div className="mb-4 bg-danger-light border border-danger-border text-danger text-sm rounded-lg px-4 py-3">
              AI generation failed: {detail.job.lastError}
            </div>
          )}
          {detail?.quiz?.lastError && !generating && (
            <div className="mb-4 bg-warn-light border border-warn-border text-warn text-sm rounded-lg px-4 py-3">{detail.quiz.lastError}</div>
          )}
          {detail?.problems?.length > 0 && detail?.questions?.length > 0 && (
            <div className="mb-4 bg-warn-light border border-warn-border text-warn text-sm rounded-lg px-4 py-3">
              <p className="font-semibold mb-1">Can't go live yet:</p>
              <ul className="list-disc pl-5 space-y-0.5">
                {detail.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          {status === "none" && !isPast && !generating && (
            <p className="text-sm text-slate-soft mb-2">
              Nothing prepared for this day yet.
              {settings?.autoFromBank && detail?.today && " Students will get a quiz built from the bank when they open it."}
            </p>
          )}

          <div className="space-y-3">
            {(detail?.questions || []).map((q, i) => (
              <div key={q._id} className="border border-border-soft rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-ink text-sm">
                    <span className="text-slate-soft mr-1.5">Q{i + 1}.</span>
                    {q.text}
                  </p>
                  {!isPast && (
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={busy === q._id}
                      onClick={() =>
                        act(q._id, () => api.post(`/daily-quiz/${selected}/replace`, { questionId: q._id }), "Replaced with another GK question")
                      }
                    >
                      Replace
                    </Button>
                  )}
                </div>
                {q.textHi && <p className="text-xs text-slate mt-1 pl-6">{q.textHi}</p>}
                <div className="grid grid-cols-2 gap-1.5 mt-2 pl-6">
                  {q.options?.map((o, k) => (
                    <div
                      key={k}
                      className={`text-sm px-2 py-1 rounded ${k === q.correctIndex ? "bg-success-light text-success font-medium" : "text-slate"}`}
                    >
                      {String.fromCharCode(65 + k)}. {o} {k === q.correctIndex && "✓"}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-soft mt-2 pl-6">
                  {q.subject} · {q.topic}
                  {q.status !== "published" && <span className="text-warn font-medium"> · {q.status}</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
