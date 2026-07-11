import { useEffect, useState } from "react";
import api from "../api/axios";

const REASON_LABELS = {
  wrong_answer: "Galat Answer",
  unclear_question: "Unclear Question",
  typo: "Typo",
  duplicate_options: "Duplicate Options",
  other: "Other",
};

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/questions/reports");
      setReports(res.data.reports);
    } catch (err) {
      // fail quietly
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function resolve(id) {
    try {
      await api.patch(`/questions/reports/${id}/resolve`);
      setReports((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      alert("Failed");
    }
  }

  async function rejectQuestion(questionId) {
    if (!confirm("Is question ko reject/hide karein?")) return;
    try {
      await api.patch(`/questions/${questionId}/reject`, { reason: "Rejected via student report" });
      alert("Question hide ho gaya");
    } catch (err) {
      alert("Failed");
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Student Reports</h1>
      <p className="text-slate-500 mb-8">Jo questions students ne galat/confusing mark kiye — inhe check karke fix ya resolve karo.</p>

      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : reports.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-6 py-10 text-center">
          <p className="text-2xl mb-2">✅</p>
          <p className="font-medium">Koi pending report nahi — sab clean hai!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <div key={r._id} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs font-medium bg-red-50 text-red-700 px-2.5 py-1 rounded-full">
                  {REASON_LABELS[r.reason] || r.reason}
                </span>
                {r.reportedBy && (
                  <span className="text-xs text-slate-400">
                    {r.reportedBy.name} ({r.reportedBy.phone})
                  </span>
                )}
              </div>

              {r.question ? (
                <>
                  <p className="font-medium text-ink mb-2">{r.question.text}</p>
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {r.question.options.map((opt, idx) => (
                      <div
                        key={idx}
                        className={`text-sm px-2 py-1 rounded ${
                          idx === r.question.correctIndex ? "bg-emerald-50 text-emerald-800 font-medium" : "text-slate-500"
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}. {opt} {idx === r.question.correctIndex && "✓"}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-slate-500 mb-4">
                    <b className="text-slate-700">Solution:</b> {r.question.solution}
                  </p>
                </>
              ) : (
                <p className="text-slate-400 mb-4">(Question delete ho chuka hai)</p>
              )}

              <div className="flex gap-3">
                <button onClick={() => resolve(r._id)} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium">
                  Sahi hai, Resolve karo
                </button>
                {r.question && (
                  <button
                    onClick={() => rejectQuestion(r.question._id)}
                    className="px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium"
                  >
                    Question Hide Karo
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}