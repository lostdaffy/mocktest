import { useEffect, useState } from "react";
import api from "../api/axios";
import { useToast } from "./Toast";

// Facts that go out of date: "the current CEC", "recently", a recent year.
// Right when written, wrong a few months later - no check in code can know
// today's answer, so a person confirms each one every six months.
export default function TimeSensitive() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/questions/time-sensitive", { params: { limit: 30 } });
      setItems(res.data.questions);
      setCount(res.data.count);
    } catch (err) {
      // fail quietly
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function drop(id) {
    setItems((prev) => prev.filter((q) => q._id !== id));
    setCount((c) => Math.max(c - 1, 0));
  }

  async function stillCorrect(id) {
    setBusy(id);
    try {
      await api.patch(`/questions/${id}/fact-checked`);
      drop(id);
      toast.success("Marked correct — it will come back in 6 months");
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function reject(id) {
    const ok = await toast.confirm({
      title: "Out of date — reject this question?",
      message: "It is removed from every test and a new question is put in its place.",
      confirmLabel: "Reject & replace",
      danger: true,
    });
    if (!ok) return;
    setBusy(id);
    try {
      const res = await api.patch(`/questions/${id}/reject`, { reason: "Out of date (time-sensitive fact)" });
      drop(id);
      toast.success(res.data.message || "Question rejected");
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-ink">Facts that can go out of date {count > 0 && <span className="text-slate-soft font-normal">({count})</span>}</h2>
      <p className="text-sm text-slate mb-4">
        Questions in live tests that say "current", "recently" or a recent year. Check each answer is still true today.
        "Still correct" hides it for 6 months; "Reject & replace" swaps in a new question.
      </p>

      {loading ? (
        <p className="text-slate-soft">Loading...</p>
      ) : items.length === 0 ? (
        <div className="bg-success-light border border-success-border text-success rounded-lg px-6 py-6 text-center">
          <p className="font-medium">Nothing to check right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((q) => (
            <div key={q._id} className="rv-card p-6">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs font-medium bg-warn-light text-warn px-2.5 py-1 rounded-full">
                  {q.subject} · {q.topic}
                </span>
                {q.factCheckedAt && (
                  <span className="text-xs text-slate-soft">Last checked {new Date(q.factCheckedAt).toLocaleDateString()}</span>
                )}
                <span className="text-xs text-slate-soft">In: {q.tests.slice(0, 3).join(", ")}{q.tests.length > 3 ? ` +${q.tests.length - 3}` : ""}</span>
              </div>
              <p className="font-medium text-ink mb-1">{q.text}</p>
              {q.textHi && q.textHi !== q.text && <p className="text-sm text-slate mb-2">{q.textHi}</p>}
              <div className="grid grid-cols-2 gap-1.5 mb-4">
                {q.options.map((opt, idx) => (
                  <div
                    key={idx}
                    className={`text-sm px-2 py-1 rounded ${idx === q.correctIndex ? "bg-success-light text-success font-medium" : "text-slate"}`}
                  >
                    {String.fromCharCode(65 + idx)}. {opt} {idx === q.correctIndex && "✓"}
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  disabled={busy === q._id}
                  onClick={() => stillCorrect(q._id)}
                  className="px-4 py-2 rounded-lg bg-success hover:bg-success text-white text-sm font-medium disabled:opacity-50"
                >
                  Still correct
                </button>
                <button
                  disabled={busy === q._id}
                  onClick={() => reject(q._id)}
                  className="px-4 py-2 rounded-lg bg-danger-light hover:bg-danger-light text-danger text-sm font-medium disabled:opacity-50"
                >
                  Reject & replace
                </button>
              </div>
            </div>
          ))}
          {count > items.length && (
            <button onClick={load} className="text-sm text-brand font-medium">
              Load next ({count - items.length} more)
            </button>
          )}
        </div>
      )}
    </section>
  );
}
