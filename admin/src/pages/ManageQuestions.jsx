import { useEffect, useState } from "react";
import api from "../api/axios";

export default function ManageQuestions() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ subject: "", topic: "", status: "published" });
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (filters.subject) params.subject = filters.subject;
      if (filters.topic) params.topic = filters.topic;
      if (filters.status) params.status = filters.status;
      const res = await api.get("/questions", { params });
      setQuestions(res.data.questions);
    } catch (err) {
      // fail quietly
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id) {
    if (!confirm("Ye question delete karein? Wapas nahi aayega.")) return;
    try {
      await api.delete(`/questions/${id}`);
      setQuestions((prev) => prev.filter((q) => q._id !== id));
    } catch (err) {
      alert("Delete failed");
    }
  }

  async function handleSaveEdit() {
    try {
      await api.put(`/questions/${editing._id}`, editing);
      setEditing(null);
      load();
    } catch (err) {
      alert("Save failed: " + (err.response?.data?.message || err.message));
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Manage Questions</h1>
      <p className="text-slate-500 mb-6">Poora question bank browse karo, edit ya delete karo.</p>

      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          placeholder="Subject (e.g. Maths)"
          value={filters.subject}
          onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
          className="px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none text-sm"
        />
        <input
          placeholder="Topic (e.g. Percentage)"
          value={filters.topic}
          onChange={(e) => setFilters({ ...filters, topic: e.target.value })}
          className="px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none text-sm"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none text-sm"
        >
          <option value="published">Published</option>
          <option value="under_review">Under Review</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </select>
        <button
          onClick={load}
          className="px-5 py-2 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium"
        >
          Filter
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : questions.length === 0 ? (
        <p className="text-slate-400">Koi question nahi mila is filter mein.</p>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q._id} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {q.subject} / {q.topic}
                </span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{q.difficulty}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    q.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {q.status}
                </span>
              </div>
              <p className="font-medium text-ink mb-2">{q.text}</p>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {q.options.map((opt, idx) => (
                  <div
                    key={idx}
                    className={`text-sm px-2 py-1 rounded ${
                      idx === q.correctIndex ? "bg-emerald-50 text-emerald-800 font-medium" : "text-slate-500"
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}. {opt} {idx === q.correctIndex && "✓"}
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditing({ ...q })} className="text-sm text-brand hover:underline">
                  Edit
                </button>
                <button onClick={() => handleDelete(q._id)} className="text-sm text-red-600 hover:underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg my-8">
            <h3 className="font-semibold text-ink mb-4">Edit Question</h3>
            <label className="block text-sm font-medium text-slate-700 mb-1">Question Text</label>
            <textarea
              value={editing.text}
              onChange={(e) => setEditing({ ...editing, text: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 mb-3 text-sm"
              rows={2}
            />
            {editing.options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  checked={editing.correctIndex === idx}
                  onChange={() => setEditing({ ...editing, correctIndex: idx })}
                />
                <input
                  value={opt}
                  onChange={(e) => {
                    const options = [...editing.options];
                    options[idx] = e.target.value;
                    setEditing({ ...editing, options });
                  }}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm"
                />
              </div>
            ))}
            <label className="block text-sm font-medium text-slate-700 mb-1 mt-3">Solution</label>
            <textarea
              value={editing.solution}
              onChange={(e) => setEditing({ ...editing, solution: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 mb-4 text-sm"
              rows={2}
            />
            <div className="flex gap-3">
              <button onClick={handleSaveEdit} className="flex-1 px-4 py-2.5 rounded-lg bg-brand text-white text-sm font-medium">
                Save
              </button>
              <button onClick={() => setEditing(null)} className="flex-1 px-4 py-2.5 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}