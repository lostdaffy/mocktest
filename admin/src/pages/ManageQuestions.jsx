import { useEffect, useState } from "react";
import { RiCheckLine, RiCloseLine, RiEdit2Line, RiDeleteBin6Line, RiAlertLine } from "@remixicon/react";
import api from "../api/axios";
import { PageHeader } from "../components/ui";
import { useToast } from "../components/Toast";

const PAGE_SIZE = 20;

// The queue comes first on purpose: this page's real job is clearing the
// questions the quality gate held back, not browsing the whole bank.
const TABS = [
  { key: "under_review", label: "Needs review" },
  { key: "published", label: "Live" },
  { key: "rejected", label: "Rejected" },
  { key: "", label: "All" },
];

export default function ManageQuestions() {
  const toast = useToast();
  const [questions, setQuestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("under_review");
  const [filters, setFilters] = useState({ subject: "", topic: "" });
  const [counts, setCounts] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState("");
  const [rechecking, setRechecking] = useState(false);

  async function load(targetPage = page, targetStatus = status) {
    setLoading(true);
    try {
      const params = { page: targetPage, limit: PAGE_SIZE };
      if (filters.subject) params.subject = filters.subject;
      if (filters.topic) params.topic = filters.topic;
      if (targetStatus) params.status = targetStatus;
      const res = await api.get("/questions", { params });
      setQuestions(res.data.questions || []);
      setTotal(res.data.total ?? 0);
      setPage(res.data.page ?? targetPage);
    } catch (err) {
      toast.error("Couldn't load questions: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }

  async function loadCounts() {
    try {
      const res = await api.get("/questions/stats");
      setCounts(res.data);
    } catch (err) {
      // the header just won't show numbers
    }
  }

  useEffect(() => {
    load(1, status);
    loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function act(id, action) {
    setBusy(id);
    try {
      if (action === "approve") await api.patch(`/questions/${id}/approve`);
      if (action === "reject") await api.patch(`/questions/${id}/reject`);
      setQuestions((qs) => qs.filter((q) => q._id !== id));
      setTotal((t) => Math.max(0, t - 1));
      loadCounts();
      toast.success(action === "approve" ? "Approved — it can be used in tests now" : "Rejected — it stays out of every test");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't update that question");
    } finally {
      setBusy("");
    }
  }

  // Put the queue back through the gate that filled it. Whatever passes goes
  // live, whatever can be mended is mended, and whatever still fails leaves
  // circulation - so the queue empties without anyone solving 141 questions by
  // hand. Twenty at a time, because each one costs an AI call.
  async function recheckQueue() {
    setRechecking(true);
    try {
      const res = await api.post("/questions/recheck", {
        limit: 20,
        subject: filters.subject || undefined,
        topic: filters.topic || undefined,
      });
      toast.success(res.data?.message || "Re-checked");
      load(1, status);
      loadCounts();
    } catch (err) {
      toast.error(err.response?.data?.message || "The re-check couldn't finish");
    } finally {
      setRechecking(false);
    }
  }

  async function handleDelete(id) {
    const ok = await toast.confirm({
      title: "Delete this question?",
      message: "It disappears from the bank for good. Rejecting keeps it out of tests without losing it.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/questions/${id}`);
      setQuestions((prev) => prev.filter((q) => q._id !== id));
      setTotal((t) => Math.max(0, t - 1));
      loadCounts();
      toast.success("Question deleted");
    } catch (err) {
      toast.error("Delete failed");
    }
  }

  async function handleSaveEdit({ approve } = {}) {
    try {
      await api.put(`/questions/${editing._id}`, editing);
      if (approve) await api.patch(`/questions/${editing._id}/approve`);
      toast.success(approve ? "Fixed and approved" : "Question saved");
      setEditing(null);
      load();
      loadCounts();
    } catch (err) {
      toast.error("Save failed: " + (err.response?.data?.message || err.message));
    }
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Question Review"
        subtitle="Questions the quality gate held back land here. Fix them, approve them, or keep them out — nothing reaches a student until you decide."
      />

      {counts && (
        <div className="flex flex-wrap gap-3 mb-6">
          <Stat label="Waiting for review" value={counts.reviewQueue} tone={counts.reviewQueue ? "warn" : "muted"} />
          <Stat label="Live in the bank" value={counts.publishedQuestions} tone="success" />
          <Stat label="Total questions" value={counts.totalQuestions} tone="muted" />
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatus(t.key)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              status === t.key ? "bg-brand text-white" : "bg-slate-light text-slate hover:text-ink"
            }`}
          >
            {t.label}
            {t.key === "under_review" && counts?.reviewQueue ? ` (${counts.reviewQueue})` : ""}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          value={filters.subject}
          onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
          placeholder="Subject (e.g. Maths)"
          className="rv-input max-w-[200px]"
        />
        <input
          value={filters.topic}
          onChange={(e) => setFilters({ ...filters, topic: e.target.value })}
          placeholder="Topic / chapter"
          className="rv-input max-w-[200px]"
        />
        <button onClick={() => load(1)} className="rv-btn-secondary">
          Apply
        </button>
        {status === "under_review" && total > 0 && (
          <button onClick={recheckQueue} disabled={rechecking} className="rv-btn-primary disabled:opacity-60">
            {rechecking ? "Re-checking..." : `Re-check next ${Math.min(20, total)}`}
          </button>
        )}
      </div>
      {status === "under_review" && total > 0 && (
        <p className="text-xs text-slate-soft -mt-4 mb-6">
          Re-checking solves each question again: the sound ones go live, thin solutions and missing Hindi are
          filled in, and the rest leave the bank. Twenty at a time.
        </p>
      )}

      {loading ? (
        <p className="text-slate-soft">Loading...</p>
      ) : questions.length === 0 ? (
        <div className="rv-card p-10 text-center">
          <p className="font-medium text-ink">
            {status === "under_review" ? "Nothing waiting — the queue is clear." : "No questions here."}
          </p>
          {status === "under_review" && (
            <p className="text-sm text-slate-soft mt-1">Anything the AI or the rules doubt will show up here.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q._id} className="rv-card p-5">
              {q.flagReason && (
                <div className="flex items-start gap-2 mb-3 text-xs bg-warn-light text-warn rounded-lg px-3 py-2">
                  <RiAlertLine size={14} className="shrink-0 mt-0.5" />
                  <span>{q.flagReason}</span>
                </div>
              )}

              <p className="font-medium text-ink">{q.text}</p>
              {q.textHi && <p className="text-sm text-slate mt-1">{q.textHi}</p>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-3">
                {(q.options || []).map((opt, i) => (
                  <div
                    key={i}
                    className={`text-sm px-2.5 py-1 rounded ${
                      i === q.correctIndex ? "bg-success-light text-success font-medium" : "text-slate"
                    }`}
                  >
                    {String.fromCharCode(65 + i)}. {opt} {i === q.correctIndex && "✓"}
                  </div>
                ))}
              </div>

              {q.solution && (
                <p className="text-xs text-slate mt-3">
                  <b className="text-ink-soft">Solution:</b> {q.solution}
                </p>
              )}
              {q.solutionHi && <p className="text-xs text-slate mt-1">{q.solutionHi}</p>}

              <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-border-soft flex-wrap">
                <p className="text-xs text-slate-soft">
                  {q.subject} · {q.topic} · {q.difficulty}
                  {q.source === "pyq" ? " · real paper" : " · AI"}
                  {typeof q.aiConfidenceScore === "number" && ` · AI confidence ${Math.round(q.aiConfidenceScore * 100)}%`}
                  {q.reportCount > 0 && ` · ${q.reportCount} student report(s)`}
                </p>

                <div className="flex gap-2">
                  {q.status !== "published" && (
                    <button
                      onClick={() => act(q._id, "approve")}
                      disabled={busy === q._id}
                      className="px-3 py-1.5 rounded-lg bg-success-light hover:opacity-80 text-success text-xs font-medium inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <RiCheckLine size={14} /> Approve
                    </button>
                  )}
                  {q.status !== "rejected" && (
                    <button
                      onClick={() => act(q._id, "reject")}
                      disabled={busy === q._id}
                      className="px-3 py-1.5 rounded-lg bg-slate-light hover:bg-border-strong text-ink-soft text-xs font-medium inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <RiCloseLine size={14} /> Reject
                    </button>
                  )}
                  <button
                    onClick={() => setEditing({ ...q })}
                    className="px-3 py-1.5 rounded-lg bg-slate-light hover:bg-border-strong text-ink-soft text-xs font-medium inline-flex items-center gap-1"
                  >
                    <RiEdit2Line size={14} /> Fix
                  </button>
                  <button
                    onClick={() => handleDelete(q._id)}
                    className="px-3 py-1.5 rounded-lg bg-danger-light hover:opacity-80 text-danger text-xs font-medium inline-flex items-center gap-1"
                  >
                    <RiDeleteBin6Line size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => load(page - 1)} disabled={page <= 1} className="rv-btn-secondary disabled:opacity-40">
            Previous
          </button>
          <span className="text-sm text-slate">
            Page {page} of {pages} · {total} questions
          </span>
          <button onClick={() => load(page + 1)} disabled={page >= pages} className="rv-btn-secondary disabled:opacity-40">
            Next
          </button>
        </div>
      )}

      {/* Fix a question, then approve it in the same step */}
      {editing && (
        <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-lg w-full max-w-2xl max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border-soft">
              <h3 className="font-semibold text-ink">Fix question</h3>
              <button onClick={() => setEditing(null)} className="text-slate-soft hover:text-slate text-2xl leading-none">
                ×
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {editing.flagReason && (
                <p className="text-xs bg-warn-light text-warn rounded-lg px-3 py-2">{editing.flagReason}</p>
              )}

              <Field label="Question (English)" value={editing.text} onChange={(v) => setEditing({ ...editing, text: v })} textarea />
              <Field label="Question (Hindi)" value={editing.textHi || ""} onChange={(v) => setEditing({ ...editing, textHi: v })} textarea />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(editing.options || []).map((opt, i) => (
                  <Field
                    key={i}
                    label={`Option ${String.fromCharCode(65 + i)}${i === editing.correctIndex ? " (correct)" : ""}`}
                    value={opt}
                    onChange={(v) => {
                      const options = [...editing.options];
                      options[i] = v;
                      setEditing({ ...editing, options });
                    }}
                  />
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-soft mb-1.5">Correct option</label>
                <select
                  value={editing.correctIndex ?? 0}
                  onChange={(e) => setEditing({ ...editing, correctIndex: Number(e.target.value) })}
                  className="rv-input"
                >
                  {[0, 1, 2, 3].map((i) => (
                    <option key={i} value={i}>
                      {String.fromCharCode(65 + i)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(editing.optionsHi || ["", "", "", ""]).map((opt, i) => (
                  <Field
                    key={i}
                    label={`Hindi option ${String.fromCharCode(65 + i)}`}
                    value={opt}
                    onChange={(v) => {
                      const optionsHi = [...(editing.optionsHi || ["", "", "", ""])];
                      optionsHi[i] = v;
                      setEditing({ ...editing, optionsHi });
                    }}
                  />
                ))}
              </div>

              <Field label="Solution (English)" value={editing.solution || ""} onChange={(v) => setEditing({ ...editing, solution: v })} textarea />
              <Field label="Solution (Hindi)" value={editing.solutionHi || ""} onChange={(v) => setEditing({ ...editing, solutionHi: v })} textarea />
            </div>

            <div className="p-5 border-t border-border-soft flex gap-3">
              <button onClick={() => handleSaveEdit({ approve: true })} className="flex-1 rv-btn-primary">
                Save & approve
              </button>
              <button onClick={() => handleSaveEdit()} className="rv-btn-secondary">
                Save only
              </button>
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg bg-slate-light text-slate text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }) {
  const tones = {
    warn: "bg-warn-light text-warn",
    success: "bg-success-light text-success",
    muted: "bg-slate-light text-slate",
  };
  return (
    <div className={`rounded-xl px-4 py-3 ${tones[tone] || tones.muted}`}>
      <p className="text-xl font-bold leading-tight">{(value ?? 0).toLocaleString("en-IN")}</p>
      <p className="text-xs">{label}</p>
    </div>
  );
}

function Field({ label, value, onChange, textarea }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink-soft mb-1.5">{label}</label>
      {textarea ? (
        <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} className="rv-input !py-2" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="rv-input" />
      )}
    </div>
  );
}
