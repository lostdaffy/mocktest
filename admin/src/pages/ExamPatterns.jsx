import { useEffect, useState } from "react";
import api from "../api/axios";
import { PageHeader } from "../components/ui";
import { useToast } from "../components/Toast";

const emptySection = () => ({ subject: "", questionCount: 25, difficultyMix: { easy: 30, medium: 50, hard: 20 } });

export default function ExamPatterns() {
  const toast = useToast();
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
      toast.success(`"${form.displayName}" saved`);
      setShowForm(false);
      setForm({ examType: "", displayName: "", durationMinutes: 60, negativeMarking: 0.25, sections: [emptySection()] });
      load();
    } catch (err) {
      toast.error("Save failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Exams"
        title="Exam Patterns"
        actions={
          <button onClick={() => setShowForm((s) => !s)} className="rv-btn-primary">
            {showForm ? "Cancel" : "+ Add New Exam"}
          </button>
        }
      />
      <p className="text-slate -mt-4 mb-8">
        Define a pattern once — mock tests are automatically built to match it from then on, no need to configure
        each test individually.
      </p>

      {showForm && (
        <form onSubmit={handleSubmit} className="rv-card p-6 mb-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-1.5">Exam Code (unique)</label>
              <input
                required
                value={form.examType}
                onChange={(e) => setForm({ ...form, examType: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
                placeholder="e.g. SSC_CHSL"
                className="rv-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-1.5">Display Name</label>
              <input
                required
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                placeholder="e.g. SSC CHSL Tier 1"
                className="rv-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-1.5">Duration (minutes)</label>
              <input
                type="number"
                required
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                className="rv-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-1.5">Negative Marking (per wrong)</label>
              <input
                type="number"
                step="0.05"
                value={form.negativeMarking}
                onChange={(e) => setForm({ ...form, negativeMarking: Number(e.target.value) })}
                className="rv-input"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-ink-soft">Sections</label>
              <button type="button" onClick={addSection} className="text-sm text-brand hover:underline">
                + Add Section
              </button>
            </div>
            <div className="space-y-3">
              {form.sections.map((s, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-light p-3 rounded-lg">
                  <input
                    placeholder="Subject (e.g. Maths)"
                    value={s.subject}
                    onChange={(e) => updateSection(idx, "subject", e.target.value)}
                    className="col-span-4 rv-input !py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Question count"
                    value={s.questionCount}
                    onChange={(e) => updateSection(idx, "questionCount", Number(e.target.value))}
                    className="col-span-3 rv-input !py-1.5 text-sm"
                  />
                  <span className="col-span-4 text-xs text-slate-soft">Easy/Med/Hard split: default 30/50/20</span>
                  <button
                    type="button"
                    onClick={() => removeSection(idx)}
                    className="col-span-1 text-danger hover:text-danger text-sm"
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
            className="rv-btn-primary"
          >
            {saving ? "Saving..." : "Save Exam Pattern"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-slate-soft">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {patterns.map((p) => (
            <div key={p._id} className="rv-card p-6">
              <p className="font-semibold text-ink">{p.displayName}</p>
              <p className="text-xs text-slate-soft mb-3">{p.examType}</p>
              <p className="text-sm text-slate">
                {p.durationMinutes} min · {p.sections.reduce((sum, s) => sum + s.questionCount, 0)} questions ·{" "}
                {p.sections.length} sections
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {p.sections.map((s, i) => (
                  <span key={i} className="text-xs bg-brand/10 text-brand-dark px-2 py-0.5 rounded-full">
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