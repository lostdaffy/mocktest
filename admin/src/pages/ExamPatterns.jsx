import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axios";
import { PageHeader } from "../components/ui";
import { useToast } from "../components/Toast";

const emptySection = () => ({ subject: "", questionCount: 25, difficultyMix: { easy: 30, medium: 50, hard: 20 } });
const emptyForm = () => ({
  examType: "",
  displayName: "",
  durationMinutes: 60,
  negativeMarking: 0.25,
  sections: [emptySection()],
});

export default function ExamPatterns() {
  const toast = useToast();
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = creating a new pattern
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const formRef = useRef(null);

  async function load() {
    setLoading(true);
    try {
      // includeInactive also brings archived patterns and how many tests
      // already exist for each one.
      const res = await api.get("/exams?includeInactive=1");
      setPatterns(res.data.patterns);
    } catch (err) {
      toast.error("Couldn't load exam patterns");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = useMemo(() => patterns.filter((p) => p.isActive !== false), [patterns]);
  const archived = useMemo(() => patterns.filter((p) => p.isActive === false), [patterns]);

  function updateSection(idx, field, value) {
    setForm((f) => {
      const sections = [...f.sections];
      sections[idx] = { ...sections[idx], [field]: value };
      return { ...f, sections };
    });
  }

  function updateMix(idx, level, value) {
    setForm((f) => {
      const sections = [...f.sections];
      const mix = { ...(sections[idx].difficultyMix || {}), [level]: Number(value) };
      sections[idx] = { ...sections[idx], difficultyMix: mix };
      return { ...f, sections };
    });
  }

  const addSection = () => setForm((f) => ({ ...f, sections: [...f.sections, emptySection()] }));
  const removeSection = (idx) => setForm((f) => ({ ...f, sections: f.sections.filter((_, i) => i !== idx) }));

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startEdit(p) {
    setEditingId(p._id);
    setForm({
      examType: p.examType,
      displayName: p.displayName,
      durationMinutes: p.durationMinutes,
      negativeMarking: p.negativeMarking ?? 0.25,
      sections: (p.sections || []).map((s) => ({
        subject: s.subject,
        questionCount: s.questionCount,
        difficultyMix: { easy: 30, medium: 50, hard: 20, ...(s.difficultyMix || {}) },
      })),
    });
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.sections.some((s) => !s.subject.trim())) {
      toast.error("Every section needs a subject");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/exams/${editingId}`, form);
        toast.success(`"${form.displayName}" updated`);
      } else {
        await api.post("/exams", form);
        toast.success(`"${form.displayName}" saved`);
      }
      closeForm();
      load();
    } catch (err) {
      toast.error("Save failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  }

  async function archivePattern(p) {
    const ok = await toast.confirm({
      title: `Archive "${p.displayName}"?`,
      message:
        `It disappears from the app and from test generation, but the ${p.testCount || 0} test(s) already built from it keep working. ` +
        "You can restore it any time.",
      confirmLabel: "Archive",
    });
    if (!ok) return;
    try {
      await api.delete(`/exams/${p._id}`);
      toast.success(`"${p.displayName}" archived`);
      load();
    } catch (err) {
      toast.error("Couldn't archive: " + (err.response?.data?.message || err.message));
    }
  }

  async function restorePattern(p) {
    try {
      await api.patch(`/exams/${p._id}`, { isActive: true });
      toast.success(`"${p.displayName}" restored`);
      load();
    } catch (err) {
      toast.error("Couldn't restore: " + (err.response?.data?.message || err.message));
    }
  }

  async function deletePattern(p) {
    const ok = await toast.confirm({
      title: `Delete "${p.displayName}" permanently?`,
      message:
        (p.testCount ? `${p.testCount} test(s) were built from this pattern. They stay as they are, ` : "") +
        "but new tests can no longer be generated for this exam. This can't be undone.",
      confirmLabel: "Delete forever",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/exams/${p._id}?permanent=1`);
      toast.success(`"${p.displayName}" deleted`);
      if (editingId === p._id) closeForm();
      load();
    } catch (err) {
      toast.error("Delete failed: " + (err.response?.data?.message || err.message));
    }
  }

  const totalQuestions = form.sections.reduce((sum, s) => sum + (Number(s.questionCount) || 0), 0);

  return (
    <div>
      <PageHeader
        eyebrow="Exams"
        title="Exam Patterns"
        actions={
          <button onClick={() => (showForm ? closeForm() : startCreate())} className="rv-btn-primary">
            {showForm ? "Cancel" : "+ Add New Exam"}
          </button>
        }
      />
      <p className="text-slate -mt-4 mb-8">
        Define a pattern once — mock tests are automatically built to match it from then on, no need to configure
        each test individually.
      </p>

      <div ref={formRef} />

      {showForm && (
        <form onSubmit={handleSubmit} className="rv-card p-6 mb-8 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">
              {editingId ? `Editing: ${form.displayName || form.examType}` : "New exam pattern"}
            </h2>
            {editingId && (
              <button type="button" onClick={closeForm} className="text-xs text-slate hover:text-ink">
                Cancel editing
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-1.5">Exam Code (unique)</label>
              <input
                required
                value={form.examType}
                onChange={(e) => setForm({ ...form, examType: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
                placeholder="e.g. SSC_CHSL"
                className="rv-input"
              />
              {editingId && (
                <p className="text-xs text-slate-soft mt-1">
                  Renaming the code only renames this pattern; tests already built keep their old code.
                </p>
              )}
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
                min="1"
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
                min="0"
                value={form.negativeMarking}
                onChange={(e) => setForm({ ...form, negativeMarking: Number(e.target.value) })}
                className="rv-input"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-ink-soft">
                Sections <span className="text-slate-soft font-normal">· {totalQuestions} questions total</span>
              </label>
              <button type="button" onClick={addSection} className="text-sm text-brand hover:underline">
                + Add Section
              </button>
            </div>
            <div className="space-y-3">
              {form.sections.map((s, idx) => {
                const mix = s.difficultyMix || {};
                const mixTotal = (Number(mix.easy) || 0) + (Number(mix.medium) || 0) + (Number(mix.hard) || 0);
                return (
                  <div key={idx} className="bg-slate-light p-3 rounded-lg space-y-2">
                    <div className="flex gap-2 items-center">
                      <input
                        placeholder="Subject (e.g. Maths)"
                        value={s.subject}
                        onChange={(e) => updateSection(idx, "subject", e.target.value)}
                        className="flex-1 rv-input !py-1.5 text-sm"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Questions"
                        value={s.questionCount}
                        onChange={(e) => updateSection(idx, "questionCount", Number(e.target.value))}
                        className="w-28 rv-input !py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeSection(idx)}
                        disabled={form.sections.length === 1}
                        className="px-2 text-danger hover:opacity-70 text-sm disabled:opacity-30"
                        title="Remove section"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-soft">Difficulty mix %:</span>
                      {["easy", "medium", "hard"].map((level) => (
                        <label key={level} className="flex items-center gap-1 text-xs text-slate capitalize">
                          {level}
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={mix[level] ?? 0}
                            onChange={(e) => updateMix(idx, level, e.target.value)}
                            className="w-16 rv-input !py-1 text-xs"
                          />
                        </label>
                      ))}
                      <span className={`text-xs ${mixTotal === 100 ? "text-slate-soft" : "text-warn font-medium"}`}>
                        = {mixTotal}%{mixTotal !== 100 && " (should be 100)"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button type="submit" disabled={saving} className="rv-btn-primary">
            {saving ? "Saving..." : editingId ? "Save Changes" : "Save Exam Pattern"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-slate-soft">Loading...</p>
      ) : (
        <>
          {active.length === 0 && (
            <p className="text-slate-soft mb-6">No exam patterns yet — add one above.</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {active.map((p) => (
              <PatternCard
                key={p._id}
                p={p}
                editing={editingId === p._id}
                onEdit={() => startEdit(p)}
                onArchive={() => archivePattern(p)}
                onDelete={() => deletePattern(p)}
              />
            ))}
          </div>

          {archived.length > 0 && (
            <div className="mt-10">
              <button
                onClick={() => setShowArchived((s) => !s)}
                className="text-sm font-medium text-slate hover:text-ink"
              >
                {showArchived ? "▾" : "▸"} Archived ({archived.length})
              </button>
              {showArchived && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
                  {archived.map((p) => (
                    <PatternCard
                      key={p._id}
                      p={p}
                      archived
                      onRestore={() => restorePattern(p)}
                      onDelete={() => deletePattern(p)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PatternCard({ p, editing, archived, onEdit, onArchive, onRestore, onDelete }) {
  const questions = (p.sections || []).reduce((sum, s) => sum + (s.questionCount || 0), 0);
  return (
    <div className={`rv-card p-6 ${editing ? "border-brand" : ""} ${archived ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-ink truncate">{p.displayName}</p>
          <p className="text-xs text-slate-soft mb-3">
            {p.examType}
            {archived && <span className="ml-2 text-warn font-medium">Archived</span>}
          </p>
        </div>
        {typeof p.testCount === "number" && (
          <span className="shrink-0 text-xs bg-slate-light text-slate px-2 py-0.5 rounded-full">
            {p.testCount} test{p.testCount === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <p className="text-sm text-slate">
        {p.durationMinutes} min · {questions} questions · {(p.sections || []).length} sections
        {p.negativeMarking ? ` · −${p.negativeMarking}/wrong` : " · no negative marking"}
      </p>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {(p.sections || []).map((s, i) => (
          <span key={i} className="text-xs bg-brand/10 text-brand-dark px-2 py-0.5 rounded-full">
            {s.subject} ({s.questionCount})
          </span>
        ))}
      </div>

      <div className="flex gap-2 mt-4 pt-4 border-t border-border-soft">
        {archived ? (
          <button
            onClick={onRestore}
            className="px-3 py-1.5 rounded-lg bg-slate-light hover:bg-border-strong text-ink-soft text-xs font-medium"
          >
            Restore
          </button>
        ) : (
          <>
            <button
              onClick={onEdit}
              className="px-3 py-1.5 rounded-lg bg-slate-light hover:bg-border-strong text-ink-soft text-xs font-medium"
            >
              ✎ Edit
            </button>
            <button
              onClick={onArchive}
              className="px-3 py-1.5 rounded-lg bg-slate-light hover:bg-border-strong text-ink-soft text-xs font-medium"
            >
              Archive
            </button>
          </>
        )}
        <button
          onClick={onDelete}
          className="px-3 py-1.5 rounded-lg bg-danger-light hover:opacity-80 text-danger text-xs font-medium ml-auto"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
