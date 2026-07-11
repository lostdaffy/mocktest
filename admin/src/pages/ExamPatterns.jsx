import { useEffect, useState } from "react";
import api from "../api/axios";

const emptySection = () => ({ subject: "", questionCount: 25, difficultyMix: { easy: 30, medium: 50, hard: 20 } });

export default function ExamPatterns() {
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    examType: "",
    displayName: "",
    durationMinutes: 60,
    negativeMarking: 0.25,
    sections: [emptySection()],
  });

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/exams");
      setPatterns(res.data.patterns);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateSection(idx, field, value) {
    setForm((f) => {
      const sections = [...f.sections];
      sections[idx] = { ...sections[idx], [field]: value };
      return { ...f, sections };
    });
  }

  function addSection() {
    setForm((f) => ({ ...f, sections: [...f.sections, emptySection()] }));
  }

  function removeSection(idx) {
    setForm((f) => ({ ...f, sections: f.sections.filter((_, i) => i !== idx) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/exams", form);
      setShowForm(false);
      setForm({ examType: "", displayName: "", durationMinutes: 60, negativeMarking: 0.25, sections: [emptySection()] });
      load();
    } catch (err) {
      alert("Save failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl font-bold text-ink">Exam Patterns</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="px-4 py-2 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium transition-colors"
        >
          {showForm ? "Cancel" : "+ Add New Exam"}
        </button>
      </div>
      <p className="text-slate-500 mb-8">
        Ek baar pattern define karo — mock tests uske baad hamesha automatic ban jayenge, manually test banane ki zaroorat nahi.
      </p>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 mb-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Exam Code (unique)</label>
              <input
                required
                value={form.examType}
                onChange={(e) => setForm({ ...form, examType: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
                placeholder="e.g. SSC_CHSL"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Display Name</label>
              <input
                required
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                placeholder="e.g. SSC CHSL Tier 1"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Duration (minutes)</label>
              <input
                type="number"
                required
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Negative Marking (per wrong)</label>
              <input
                type="number"
                step="0.05"
                value={form.negativeMarking}
                onChange={(e) => setForm({ ...form, negativeMarking: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Sections</label>
              <button type="button" onClick={addSection} className="text-sm text-brand hover:underline">
                + Add Section
              </button>
            </div>
            <div className="space-y-3">
              {form.sections.map((s, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-3 rounded-lg">
                  <input
                    placeholder="Subject (e.g. Maths)"
                    value={s.subject}
                    onChange={(e) => updateSection(idx, "subject", e.target.value)}
                    className="col-span-4 px-3 py-1.5 rounded-lg border border-slate-200 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Question count"
                    value={s.questionCount}
                    onChange={(e) => updateSection(idx, "questionCount", Number(e.target.value))}
                    className="col-span-3 px-3 py-1.5 rounded-lg border border-slate-200 text-sm"
                  />
                  <span className="col-span-4 text-xs text-slate-400">Easy/Med/Hard split: default 30/50/20</span>
                  <button
                    type="button"
                    onClick={() => removeSection(idx)}
                    className="col-span-1 text-red-500 hover:text-red-700 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Exam Pattern"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {patterns.map((p) => (
            <div key={p._id} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
              <p className="font-semibold text-ink">{p.displayName}</p>
              <p className="text-xs text-slate-400 mb-3">{p.examType}</p>
              <p className="text-sm text-slate-500">
                {p.durationMinutes} min · {p.sections.reduce((sum, s) => sum + s.questionCount, 0)} questions ·{" "}
                {p.sections.length} sections
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {p.sections.map((s, i) => (
                  <span key={i} className="text-xs bg-brand-light text-brand-dark px-2 py-0.5 rounded-full">
                    {s.subject} ({s.questionCount})
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
