import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RiCalendarCheckLine, RiCalendarEventLine, RiErrorWarningLine, RiSettings3Line, RiArrowDownSLine } from "@remixicon/react";
import api from "../api/axios";
import { PageHeader, Badge, Button, Checkbox, Card } from "../components/ui";
import { useToast } from "../components/Toast";

// The Daily GK Quiz: 20 GK questions, the same for every student, live at
// 12:00 AM India time on its date. The app's daily button shows it (GET
// /api/tests/today), so nothing here needs an app update.

const STATUS = {
  ready: { label: "Ready", tone: "success", dot: "bg-success" },
  draft: { label: "Draft", tone: "warn", dot: "bg-warn" },
  generating: { label: "Generating", tone: "brand", dot: "bg-brand" },
  none: { label: "Not prepared", tone: "neutral", dot: "bg-slate-soft" },
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
  const [showSettings, setShowSettings] = useState(false);
  const [openQ, setOpenQ] = useState(null);

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
    setOpenQ(null);
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
  const days = list?.days || [];
  const todayRow = days.find((d) => d.today);
  const upcoming = days.filter((d) => !d.past && !d.today);
  const upcomingReady = upcoming.filter((d) => d.status === "ready").length;
  const upcomingEmpty = upcoming.filter((d) => !d.status || d.status === "none").length;
  const size = list?.quizSize || 20;
  const have = detail?.questions?.length || 0;

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Daily GK Quiz"
        subtitle="20 General Knowledge questions, the same for every student, live at 12:00 AM India time. Free for everyone, opened from the daily test button in the app."
        actions={
          <button onClick={() => setShowSettings((v) => !v)} className="rv-btn-secondary !text-[13px] !py-1.5">
            <RiSettings3Line size={16} /> Automatic preparation
            <RiArrowDownSLine size={16} className={`transition-transform ${showSettings ? "rotate-180" : ""}`} />
          </button>
        }
      />

      {/* What the scheduler may do by itself */}
      {settings && showSettings && (
        <Card className="!p-5 mb-5">
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
              <select className="rv-input !w-20 !py-1" value={settings.daysAhead} onChange={(e) => setSettings({ ...settings, daysAhead: Number(e.target.value) })}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              day(s) ahead with AI
            </label>
            <p className="text-xs text-slate-soft">
              If the AI is down, the missing days stay queued and fill in by themselves when it is back. An AI quiz with a fault (two questions
              asking the same thing) is mended from the bank and goes live by itself. If tomorrow is still not ready by 6 PM, it is made from the
              bank, so midnight is always covered.
            </p>
          </div>
          <Button className="mt-4" size="sm" loading={busy === "settings"} onClick={saveSettings}>
            Save
          </Button>
        </Card>
      )}

      {/* At a glance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-5">
        <Tile
          icon={RiCalendarCheckLine}
          tone={todayRow?.status === "ready" ? "bg-success-light text-success" : "bg-warn-light text-warn"}
          label="Today's quiz"
          value={list ? (STATUS[todayRow?.status] || STATUS.none).label : null}
          hint={settings?.autoFromBank && todayRow?.status !== "ready" ? "Built from the bank when opened" : undefined}
        />
        <Tile
          icon={RiCalendarEventLine}
          tone="bg-brand/10 text-brand"
          label="Upcoming days ready"
          value={list ? `${upcomingReady} of ${upcoming.length}` : null}
        />
        <Tile
          icon={RiErrorWarningLine}
          tone={upcomingEmpty ? "bg-warn-light text-warn" : "bg-slate-light text-slate"}
          label="Upcoming days not prepared"
          value={list ? upcomingEmpty : null}
          hint={upcomingEmpty && settings?.autoFromBank ? "Filled from the bank by 6 PM the day before" : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr] items-start">
        {/* The days */}
        <Card className="!p-0 overflow-hidden lg:sticky lg:top-4">
          <p className="px-4 py-3 border-b border-border-soft text-[11px] font-semibold uppercase tracking-wide text-slate">Days</p>
          {!list ? (
            <p className="text-slate-soft text-sm p-4">Loading...</p>
          ) : (
            <ul className="max-h-[70vh] overflow-y-auto divide-y divide-border-soft">
              {days.map((d) => {
                const s = STATUS[d.status] || STATUS.none;
                const active = d.date === selected;
                return (
                  <li key={d.date}>
                    <button
                      onClick={() => setParams({ date: d.date })}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        active ? "bg-brand/10" : "hover:bg-slate-light/50"
                      } ${d.past && !active ? "opacity-60" : ""}`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm font-semibold ${active ? "text-brand" : "text-ink"}`}>{shortDay(d.date)}</span>
                        <span className="block text-[11px] text-slate-soft">{d.today ? "Today" : d.past ? "Past" : "Upcoming"}</span>
                      </span>
                      <span className="text-[11px] font-medium text-slate">{s.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* One day */}
        {selected && (
          <Card className="!p-0 overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-border-soft">
              <div>
                <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2 flex-wrap">
                  {detail?.label || shortDay(selected)} {detail?.today && <Badge tone="brand">Live today</Badge>}
                </h2>
                <div className="flex items-center gap-2 flex-wrap mt-1.5 text-sm text-slate">
                  <Badge tone={(STATUS[status] || STATUS.none).tone}>{(STATUS[status] || STATUS.none).label}</Badge>
                  <span className="tabular-nums">
                    {have} / {size} questions
                  </span>
                  {detail?.quiz?.source && <span>· {detail.quiz.source}</span>}
                  {detail?.quiz?.preparedBy && <span>· by {detail.quiz.preparedBy}</span>}
                </div>
                <div className="h-1.5 w-48 max-w-full rounded-full bg-slate-light overflow-hidden mt-2">
                  <div className={`h-full rounded-full ${have >= size ? "bg-success" : "bg-warn"}`} style={{ width: `${Math.min(100, (have / size) * 100)}%` }} />
                </div>
              </div>
              {!isPast && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" loading={busy === "bank"} disabled={generating} onClick={() => act("bank", () => api.post(`/daily-quiz/${selected}/fill-bank`))}>
                    {have ? "Complete from bank" : "Fill from bank"}
                  </Button>
                  <Button size="sm" variant="secondary" loading={busy === "ai"} disabled={generating} onClick={() => act("ai", () => api.post(`/daily-quiz/${selected}/generate-ai`))}>
                    Generate with AI
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
                      disabled={generating || !have}
                      onClick={() => act("ready", () => api.patch(`/daily-quiz/${selected}/status`, { status: "ready" }), "Marked ready - it goes live on its date")}
                    >
                      Mark ready
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 pt-4 empty:hidden">
              {generating && (
                <div className="mb-3 bg-info-light border border-info-border text-info text-sm rounded-lg px-4 py-3">
                  AI questions are being made in two batches of 10 on the Generation page. This page refreshes by itself.
                </div>
              )}
              {detail?.job?.status === "failed" && (
                <div className="mb-3 bg-danger-light border border-danger-border text-danger text-sm rounded-lg px-4 py-3">AI generation failed: {detail.job.lastError}</div>
              )}
              {detail?.quiz?.lastError && !generating && (
                <div className="mb-3 bg-warn-light border border-warn-border text-warn text-sm rounded-lg px-4 py-3">{detail.quiz.lastError}</div>
              )}
              {detail?.problems?.length > 0 && have > 0 && (
                <div className="mb-3 bg-warn-light border border-warn-border text-warn text-sm rounded-lg px-4 py-3">
                  <p className="font-semibold mb-1">Can't go live yet:</p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {detail.problems.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {!detail ? (
              <p className="text-slate-soft text-sm px-5 py-8 text-center">Loading...</p>
            ) : !have ? (
              <p className="text-sm text-slate-soft px-5 py-8 text-center">
                {isPast ? "No quiz was prepared for this day." : "Nothing prepared for this day yet."}
                {settings?.autoFromBank && detail?.today && " Students will get a quiz built from the bank when they open it."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-light/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate">
                      <th className="px-4 py-2.5 w-10">#</th>
                      <th className="px-4 py-2.5">Question</th>
                      <th className="px-4 py-2.5">Answer</th>
                      <th className="px-4 py-2.5">Topic</th>
                      {!isPast && <th className="px-4 py-2.5" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft">
                    {detail.questions.map((q, i) => (
                      <tr key={q._id} className="align-top hover:bg-slate-light/40">
                        <td className="px-4 py-3 text-slate-soft tabular-nums">{i + 1}</td>
                        <td className="px-4 py-3 min-w-[260px]">
                          <button onClick={() => setOpenQ(openQ === q._id ? null : q._id)} className="text-left text-ink font-medium hover:text-brand">
                            {q.text}
                          </button>
                          {q.textHi && <p className="text-xs text-slate mt-0.5">{q.textHi}</p>}
                          {openQ === q._id && (
                            <div className="grid grid-cols-2 gap-1.5 mt-2">
                              {q.options?.map((o, k) => (
                                <div key={k} className={`text-xs px-2 py-1 rounded ${k === q.correctIndex ? "bg-success-light text-success font-medium" : "bg-slate-light/60 text-slate"}`}>
                                  {String.fromCharCode(65 + k)}. {o}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <span className="text-success font-medium">
                            {String.fromCharCode(65 + (q.correctIndex ?? 0))}. {q.options?.[q.correctIndex]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate min-w-[110px]">
                          {q.topic}
                          {q.status !== "published" && <span className="block text-warn font-medium">{q.status}</span>}
                        </td>
                        {!isPast && (
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              loading={busy === q._id}
                              onClick={() => act(q._id, () => api.post(`/daily-quiz/${selected}/replace`, { questionId: q._id }), "Replaced with another GK question")}
                            >
                              Replace
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-slate-soft px-5 py-3 border-t border-border-soft">Click a question to see all four options.</p>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

function Tile({ icon: Icon, tone, label, value, hint }) {
  return (
    <Card className="!p-4 flex items-center gap-3">
      <span className={`w-10 h-10 rounded-sm grid place-items-center shrink-0 ${tone}`}>
        <Icon size={19} />
      </span>
      <div className="min-w-0">
        {value == null ? <div className="h-6 w-16 rounded bg-slate-light animate-pulse" /> : <p className="font-display text-lg font-extrabold text-ink tabular-nums">{value}</p>}
        <p className="text-xs text-slate truncate">{label}</p>
        {hint && <p className="text-[11px] text-slate-soft truncate">{hint}</p>}
      </div>
    </Card>
  );
}
