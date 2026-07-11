import { useEffect, useState } from "react";
import api from "../api/axios";

export default function LiveExams() {
  const [exams, setExams] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [examType, setExamType] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [examsRes, patternsRes] = await Promise.all([
        api.get("/exams/live/upcoming"),
        api.get("/exams"),
      ]);
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

  async function handleSchedule(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/exams/live/schedule", { examType, scheduledAt });
      setScheduledAt("");
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
        Sirf date/time chuno — paper khud pattern se auto-assemble ho jayega, manually banane ki zaroorat nahi.
      </p>

      <form onSubmit={handleSchedule} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 mb-8 flex flex-wrap items-end gap-4">
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
          disabled={saving || !patterns.length}
          className="px-5 py-2.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium transition-colors disabled:opacity-60"
        >
          {saving ? "Scheduling..." : "Schedule Live Exam"}
        </button>
      </form>

      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : exams.length === 0 ? (
        <p className="text-slate-400">Koi live exam scheduled nahi hai abhi.</p>
      ) : (
        <div className="space-y-3">
          {exams.map((ex) => (
            <div key={ex._id} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-ink">{ex.title}</p>
                <p className="text-sm text-slate-500">{new Date(ex.scheduledAt).toLocaleString("en-IN")}</p>
              </div>
              <span className="text-xs font-medium bg-red-50 text-red-600 px-3 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Upcoming
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
