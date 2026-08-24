import { useEffect, useState } from "react";
import api from "../api/axios";
import { PageHeader } from "../components/ui";
import { useToast } from "../components/Toast";

export default function ManageQuestions() {
  const toast = useToast();
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
    const ok = await toast.confirm({
      title: "Delete this question?",
      message: "This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/questions/${id}`);
      setQuestions((prev) => prev.filter((q) => q._id !== id));
      toast.success("Question deleted");
    } catch (err) {
      toast.error("Delete failed");
    }
  }

  async function handleSaveEdit() {
    try {
      await api.put(`/questions/${editing._id}`, editing);
      toast.success("Question saved");
      setEditing(null);
      load();
    } catch (err) {
      toast.error("Save failed: " + (err.response?.data?.message || err.message));
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Manage Questions"
        subtitle="Browse the full question bank, edit or delete entries."
      />

      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          placeholder="Subject (e.g. Maths)"
          value={filters.subject}
          onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
          className="rv-input text-sm"
        />
        <input
          placeholder="Topic (e.g. Percentage)"
          value={filters.topic}
          onChange={(e) => setFilters({ ...filters, topic: e.target.value })}
          className="rv-input text-sm"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="rv-input text-sm"
        >
          <option value="published">Published</option>
          <option value="under_review">Under Review</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </select>
        <button
          onClick={load}
          className="rv-btn-primary"
        >
          Filter
        </button>
      </div>

      {loading ? (
        <p className="text-slate-soft">Loading...</p>
      ) : questions.length === 0 ? (
        <p className="text-slate-soft">No questions match this filter.</p>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q._id} className="rv-card p-5">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs bg-slate-light text-slate px-2 py-0.5 rounded-full">
                  {q.subject} / {q.topic}
                </span>
                <span className="text-xs bg-slate-light text-slate px-2 py-0.5 rounded-full">{q.difficulty}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    q.status === "published" ? "bg-success-light text-success" : "bg-warn-light text-warn"
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
                      idx === q.correctIndex ? "bg-success-light text-success font-medium" : "text-slate"
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
                <button onClick={() => handleDelete(q._id)} className="text-sm text-danger hover:underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface rounded-lg p-6 w-full max-w-lg my-8">
            <h3 className="font-semibold text-ink mb-4">Edit Question</h3>
            <label className="block text-sm font-medium text-ink-soft mb-1">Question Text</label>
            <textarea
              value={editing.text}
              onChange={(e) => setEditing({ ...editing, text: e.target.value })}
              className="rv-input mb-3 text-sm"
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
                  className="rv-input flex-1 !py-1.5 text-sm"
                />
              </div>
            ))}
            <label className="block text-sm font-medium text-ink-soft mb-1 mt-3">Solution</label>
            <textarea
              value={editing.solution}
              onChange={(e) => setEditing({ ...editing, solution: e.target.value })}
              className="rv-input mb-4 text-sm"
              rows={2}
            />
            <div className="flex gap-3">
              <button onClick={handleSaveEdit} className="flex-1 px-4 py-2.5 rounded-lg bg-brand text-white text-sm font-medium">
                Save
              </button>
              <button onClick={() => setEditing(null)} className="flex-1 px-4 py-2.5 rounded-lg bg-slate-light text-slate text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}