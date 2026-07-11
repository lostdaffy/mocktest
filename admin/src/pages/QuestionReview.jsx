import { useEffect, useState } from "react";
import api from "../api/axios";

export default function QuestionReview() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/questions/review-queue");
      setQuestions(res.data.questions);
    } catch (err) {
      setError("Questions load nahi ho payi. Backend connection check karo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id) {
    setBusyId(id);
    try {
      await api.patch(`/questions/${id}/approve`);
      setQuestions((prev) => prev.filter((q) => q._id !== id));
    } catch (err) {
      alert("Approve failed: " + (err.response?.data?.message || err.message));
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id) {
    const reason = prompt("Reject karne ka reason likho (optional):") || "Rejected by admin";
    setBusyId(id);
    try {
      await api.patch(`/questions/${id}/reject`, { reason });
      setQuestions((prev) => prev.filter((q) => q._id !== id));
    } catch (err) {
      alert("Reject failed: " + (err.response?.data?.message || err.message));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Review Queue</h1>
      <p className="text-slate-500 mb-8">
        Ye wo questions hain jo AI khud confident nahi tha ya rule-check fail hui — publish hone se pehle aapka check chahiye.
      </p>

      {loading && <p className="text-slate-400">Loading...</p>}
      {error && <p className="text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm">{error}</p>}

      {!loading && !error && questions.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-6 py-10 text-center">
          <p className="text-2xl mb-2">✅</p>
          <p className="font-medium">Review queue khali hai — sab kuch clean hai!</p>
        </div>
      )}

      <div className="space-y-4">
        {questions.map((q) => (
          <div key={q._id} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-xs font-medium bg-flag/10 text-flag px-2.5 py-1 rounded-full">
                {q.flagReason || "Flagged"}
              </span>
              <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                {q.examType?.join(", ")} / {q.subject} / {q.topic}
              </span>
              {q.aiConfidenceScore != null && (
                <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                  AI confidence: {Math.round(q.aiConfidenceScore * 100)}%
                </span>
              )}
            </div>

            <p className="font-medium text-ink mb-3">{q.text}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              {q.options.map((opt, idx) => (
                <div
                  key={idx}
                  className={`text-sm px-3 py-2 rounded-lg border ${
                    idx === q.correctIndex
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 font-medium"
                      : "border-slate-100 bg-slate-50 text-slate-600"
                  }`}
                >
                  {String.fromCharCode(65 + idx)}. {opt} {idx === q.correctIndex && "✓"}
                </div>
              ))}
            </div>

            <p className="text-sm text-slate-500 mb-4">
              <span className="font-medium text-slate-700">Solution: </span>
              {q.solution}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => approve(q._id)}
                disabled={busyId === q._id}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                Approve & Publish
              </button>
              <button
                onClick={() => reject(q._id)}
                disabled={busyId === q._id}
                className="px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium transition-colors disabled:opacity-60"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
