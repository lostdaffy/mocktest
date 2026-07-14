import { useEffect, useState } from "react";
import { RiRadioButtonLine, RiCalendarEventLine, RiCheckboxCircleFill } from "@remixicon/react";
import api from "../api/axios";

export default function LiveExams() {
  const [exams, setExams] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [examType, setExamType] = useState("");
  const [mocks, setMocks] = useState([]);
  const [mockLoading, setMockLoading] = useState(false);
  const [mockTestId, setMockTestId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [examsRes, patternsRes] = await Promise.all([api.get("/exams/live/upcoming"), api.get("/exams")]);
      setExams(examsRes.data.exams);
      setPatterns(patternsRes.data.patterns);
      if (!examType && patternsRes.data.patterns.length) setExamType(patternsRes.data.patterns[0].examType);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whenever the selected exam changes, fetch its published mocks - only
  // these are eligible to become a live exam.
  useEffect(() => {
    if (!examType) return;
    setMockTestId("");
    setMockLoading(true);
    api
      .get(`/exam-series/${examType}/mocks`, { params: { status: "published", liveExclusive: "true" } })
      .then((res) => setMocks(res.data.mocks || []))
      .finally(() => setMockLoading(false));
  }, [examType]);

  async function handleSchedule(e) {
    e.preventDefault();
    if (!mockTestId) {
      alert("Pick a published mock first");
      return;
    }
    setSaving(true);
    try {
      await api.post("/exams/live/schedule", { mockTestId, scheduledAt });
      setScheduledAt("");
      setMockTestId("");
      load();
    } catch (err) {
      alert("Schedule failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Live Exams</h1>
      <p className="text-slate-500 mb-8">
        Only mocks marked "Live Exam Exclusive" show up here - they're built the same reliable way as regular mocks
        but never appear in the Mock Tests tab, so every student sees the paper for the first time when the live
        exam starts.
      </p>

      <form onSubmit={handleSchedule} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 mb-8 space-y-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Exam</label>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none min-w-[220px]"
            >
              {patterns.map((p) => (
                <option key={p._id} value={p.examType}>
                  {p.displayName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Date & Time</label>
            <input
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !mockTestId}
            className="px-5 py-2.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {saving ? "Scheduling..." : "Schedule Live Exam"}
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Published mock to use</label>

          {mockLoading ? (
            <p className="text-sm text-slate-400">Loading mocks...</p>
          ) : mocks.length === 0 ? (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              No Live Exam Exclusive mocks for this exam yet. Go to Exam Mock Series, tick "Live Exam Exclusive", and
              publish one — regular Mock Tests series mocks can't be used here since students may have already
              attempted them.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {mocks.map((m) => {
                const active = mockTestId === m._id;
                return (
                  <button
                    type="button"
                    key={m._id}
                    onClick={() => setMockTestId(m._id)}
                    className={`flex items-center gap-3 text-left px-4 py-3 rounded-xl border transition-colors ${
                      active ? "border-brand bg-brand/5" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        active ? "bg-brand text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {active ? <RiCheckboxCircleFill size={16} /> : <span className="text-xs font-bold">#{m.seriesNumber ?? "-"}</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{m.title}</p>
                      <p className="text-xs text-slate-500">{m.questions?.length || 0} questions</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </form>

      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : exams.length === 0 ? (
        <p className="text-slate-400">No live exams scheduled yet.</p>
      ) : (
        <div className="space-y-3">
          {exams.map((ex) => (
            <div key={ex._id} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                  <RiCalendarEventLine size={18} />
                </div>
                <div>
                  <p className="font-semibold text-ink">{ex.title}</p>
                  <p className="text-sm text-slate-500">{new Date(ex.scheduledAt).toLocaleString("en-IN")}</p>
                </div>
              </div>
              <span className="text-xs font-medium bg-red-50 text-red-600 px-3 py-1 rounded-full flex items-center gap-1.5">
                <RiRadioButtonLine size={12} /> Upcoming
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}