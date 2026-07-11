import { useState } from "react";
import api from "../api/axios";

const EXAMS = ["SSC_CGL", "UP_POLICE", "RAILWAY", "BANKING", "CTET"];
const SUBJECTS = ["Maths", "Reasoning", "English", "General Hindi", "GK", "Current Affairs"];
const DIFFICULTIES = ["easy", "medium", "hard"];

export default function GenerateQuestions() {
  const [form, setForm] = useState({
    examType: "SSC_CGL",
    subject: "Maths",
    topic: "",
    difficulty: "medium",
    count: 10,
  });
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleGenerate(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!form.topic.trim()) {
      setError("Topic daalo (jaise 'Percentage')");
      return;
    }
    setGenerating(true);
    try {
      const res = await api.post("/questions/generate", form);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Generation fail hua");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Generate Questions</h1>
      <p className="text-slate-500 mb-8">
        AI se naye questions banao. Ye seedha database mein jaate hain — high-confidence wale publish ho jaate hain, baaki
        Review Queue mein aate hain.
      </p>

      <form onSubmit={handleGenerate} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 mb-6 max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Exam</label>
            <select
              value={form.examType}
              onChange={(e) => setForm({ ...form, examType: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none"
            >
              {EXAMS.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject</label>
            <select
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none"
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Topic (chapter tags se match hona chahiye)</label>
            <input
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              placeholder="Percentage"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Difficulty</label>
            <select
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Count (max 20)</label>
            <input
              type="number"
              min="1"
              max="20"
              value={form.count}
              onChange={(e) => setForm({ ...form, count: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-4">{error}</p>}

        <button
          type="submit"
          disabled={generating}
          className="mt-5 px-5 py-2.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium transition-colors disabled:opacity-60"
        >
          {generating ? "Generate ho raha hai... (30-60 sec)" : "🤖 Generate Karo"}
        </button>
      </form>

      {result && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 max-w-2xl">
          <p className="font-semibold text-emerald-800 mb-2">✅ {result.message}</p>
          <div className="flex gap-6 text-sm">
            <span className="text-emerald-700">
              <b>{result.published}</b> directly published
            </span>
            <span className="text-amber-700">
              <b>{result.flagged}</b> review queue mein (aapka check chahiye)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}