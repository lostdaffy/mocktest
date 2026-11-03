import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axios";
import { PageHeader } from "../components/ui";
import { useToast } from "../components/Toast";

const emptySection = () => ({
  subject: "",
  sources: [],
  questionCount: 25,
  // null means "marked like the rest of the paper", which is true of nine
  // of the ten exams. Only SSC MTS differs, and only because the real paper
  // does: no penalty in Session-I, a full mark in Session-II.
  negativeMarking: null,
  // Minutes for this section alone, for a paper that locks a section when
  // its time is up. IBPS PO Prelims is the only one of the ten: three
  // 20-minute papers in a row, no going back. Blank means one clock for the
  // whole paper.
  durationMinutes: null,
  difficultyMix: { easy: 30, medium: 50, hard: 20 },
  syllabus: [],
});
const emptyForm = () => ({
  examType: "",
  displayName: "",
  examGroup: "",
  postName: "",
  durationMinutes: 60,
  negativeMarking: 0.25,
  examLevel: "",
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
      examGroup: p.examGroup || "",
      postName: p.postName || "",
      examLevel: p.examLevel || "",
      sections: (p.sections || []).map((s) => ({
        subject: s.subject,
        sources: s.sources || [],
        questionCount: s.questionCount,
        negativeMarking: s.negativeMarking ?? null,
        durationMinutes: s.durationMinutes ?? null,
        difficultyMix: { easy: 30, medium: 50, hard: 20, ...(s.difficultyMix || {}) },
        // Not edited here, but carried through so saving the form keeps them.
        ...(s.chartSets?.length ? { chartSets: s.chartSets } : {}),
        ...(s.passageSets?.count ? { passageSets: s.passageSets } : {}),
        syllabus: (s.syllabus || []).map((t) =>
          typeof t === "string" ? t : t.subTopics?.length ? `${t.topic}: ${t.subTopics.join(", ")}` : t.topic
        ),
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
    // Blank syllabus lines are typing artefacts, not topics - drop them
    // before saving so the generator isn't handed empty entries.
    const payload = {
      ...form,
      sections: form.sections.map((s) => ({
        ...s,
        syllabus: (s.syllabus || []).map((t) => t.trim()).filter(Boolean),
      })),
    };
    try {
      if (editingId) {
        await api.patch(`/exams/${editingId}`, payload);
        toast.success(`"${form.displayName}" updated`);
      } else {
        await api.post("/exams", payload);
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
              <label className="block text-sm font-medium text-ink-soft mb-1.5">
                Exam group <span className="text-slate-soft font-normal">· optional</span>
              </label>
              <input
                value={form.examGroup}
                onChange={(e) => setForm({ ...form, examGroup: e.target.value })}
                placeholder="e.g. Agniveer"
                className="rv-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-1.5">
                Post <span className="text-slate-soft font-normal">· optional</span>
              </label>
              <input
                value={form.postName}
                onChange={(e) => setForm({ ...form, postName: e.target.value })}
                placeholder="e.g. Army GD"
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
            <label className="block text-sm font-medium text-ink-soft mb-1.5">
              Exam level & scope <span className="text-slate-soft font-normal">· told to the question generator</span>
            </label>
            <textarea
              rows={2}
              value={form.examLevel}
              onChange={(e) => setForm({ ...form, examLevel: e.target.value })}
              placeholder="e.g. 10th-pass level Army entrance exam. Basic maths, science and GK. NOT graduate or UPSC level."
              className="rv-input !py-2"
            />
            <p className="text-xs text-slate-soft mt-1">
              One or two lines describing who takes this exam and how hard it is. This is what stops questions coming out
              too easy or too advanced.
            </p>
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
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        placeholder={`−${form.negativeMarking}`}
                        title="Negative marking for this section only. Leave blank to mark it like the rest of the paper."
                        value={s.negativeMarking ?? ""}
                        onChange={(e) =>
                          updateSection(idx, "negativeMarking", e.target.value === "" ? null : Number(e.target.value))
                        }
                        className="w-24 rv-input !py-1.5 text-sm"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="min"
                        title="Minutes for this section alone. Leave blank unless the exam locks each section to its own clock."
                        value={s.durationMinutes ?? ""}
                        onChange={(e) =>
                          updateSection(idx, "durationMinutes", e.target.value === "" ? null : Number(e.target.value))
                        }
                        className="w-20 rv-input !py-1.5 text-sm"
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
                    <div>
                      <input
                        placeholder="Also draw from (e.g. Science, Current Affairs)"
                        value={(s.sources || []).join(", ")}
                        onChange={(e) =>
                          updateSection(idx, "sources", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))
                        }
                        className="w-full rv-input !py-1.5 text-sm"
                      />
                      <p className="text-xs text-slate-soft mt-1">
                        Leave the two small boxes blank unless this section really differs: the first is its own
                        negative marking (SSC MTS deducts nothing in Session-I and a full mark in Session-II), the
                        second is its own time limit (IBPS PO Prelims is three 20-minute papers in a row, with no
                        going back). Set the time on every section or none — half-timed makes no sense.
                      </p>
                      <p className="text-xs text-slate-soft mt-1">
                        Extra subjects this one section is built from. SSC&apos;s General Awareness is GK + Science +
                        Current Affairs together; leave blank if the section is just {s.subject || "one subject"}.
                      </p>
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

                    <div>
                      <label className="block text-xs font-medium text-ink-soft mb-1">
                        Syllabus for {s.subject || "this section"}{" "}
                        <span className="text-slate-soft font-normal">
                          · one topic per line, sub-topics after a colon
                          {(s.syllabus || []).filter((t) => t.trim()).length > 0 &&
                            ` · ${(s.syllabus || []).filter((t) => t.trim()).length} topics`}
                        </span>
                      </label>
                      <textarea
                        rows={4}
                        value={(s.syllabus || []).join("\n")}
                        onChange={(e) => updateSection(idx, "syllabus", e.target.value.split("\n"))}
                        placeholder={
                          "Percentage: successive change, profit link\nProfit and Loss: discount, marked price\nAverage\nSimple & Compound Interest"
                        }
                        className="rv-input !py-2 text-sm font-mono"
                      />
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
            {[
              ["Active exams", active.length, "bg-brand"],
              ["Archived", archived.length, "bg-slate-soft"],
              ["Tests built on these patterns", patterns.reduce((n, p) => n + (p.testCount || 0), 0), "bg-success"],
              ["Exams with a section missing its syllabus", active.filter((p) => (p.sections || []).some((s) => !(s.syllabus?.length > 0))).length, "bg-warn"],
            ].map(([label, value, tone]) => (
              <div key={label} className="rv-card p-4 flex items-center gap-3">
                <span className={`w-1.5 self-stretch rounded-full ${value || tone !== "bg-warn" ? tone : "bg-slate-soft"}`} />
                <div className="min-w-0">
                  <p className="font-display text-xl font-extrabold text-ink tabular-nums">{value}</p>
                  <p className="text-xs text-slate truncate">{label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1 border-b border-border mb-4">
            {[
              [false, "Active", active.length],
              [true, "Archived", archived.length],
            ].map(([key, label, n]) => (
              <button
                key={label}
                onClick={() => setShowArchived(key)}
                className={`px-4 py-2.5 -mb-px text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                  showArchived === key ? "border-brand text-brand" : "border-transparent text-slate hover:text-ink"
                }`}
              >
                {label}
                <span className="text-[11px] px-1.5 py-0.5 rounded-full tabular-nums bg-slate-light text-slate">{n}</span>
              </button>
            ))}
            <span className="ml-auto text-xs text-slate-soft pb-2">{showArchived ? "Not offered to students" : "Offered in the app's exam list"}</span>
          </div>

          {(showArchived ? archived : active).length === 0 ? (
            <p className="text-slate-soft text-center py-10 rv-card">{showArchived ? "Nothing archived." : "No exam patterns yet — add one above."}</p>
          ) : (
            <div className="rv-card !p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-light/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate">
                      <th className="px-4 py-3">Exam</th>
                      <th className="px-4 py-3">Paper</th>
                      <th className="px-4 py-3">Sections</th>
                      <th className="px-4 py-3 text-right">Tests</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft">
                    {(showArchived ? archived : active).map((p) => (
                      <PatternRow
                        key={p._id}
                        p={p}
                        editing={editingId === p._id}
                        archived={showArchived}
                        onEdit={() => startEdit(p)}
                        onArchive={() => archivePattern(p)}
                        onRestore={() => restorePattern(p)}
                        onDelete={() => deletePattern(p)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PatternRow({ p, editing, archived, onEdit, onArchive, onRestore, onDelete }) {
  const questions = (p.sections || []).reduce((sum, s) => sum + (s.questionCount || 0), 0);

  // "−1/wrong" would be a lie about SSC MTS, where half the paper deducts
  // nothing at all. Only quote one rate when one rate is true.
  const sectionRates = new Set((p.sections || []).map((s) => (s.negativeMarking == null ? p.negativeMarking ?? 0 : s.negativeMarking)));
  const markedAlike = sectionRates.size <= 1;
  const missing = (p.sections || []).filter((s) => !(s.syllabus?.length > 0)).length;
  const small = "px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors";

  return (
    <tr className={`align-top transition-colors ${editing ? "bg-brand/[0.05]" : "hover:bg-slate-light/40"}`}>
      <td className="px-4 py-3 min-w-[200px]">
        <button onClick={archived ? undefined : onEdit} className="font-semibold text-ink hover:text-brand text-left">
          {p.displayName}
        </button>
        <p className="text-xs text-slate-soft">
          {(p.examGroup || p.postName) && <span className="text-slate">{[p.examGroup, p.postName].filter(Boolean).join(" › ")} · </span>}
          <span className="font-mono">{p.examType}</span>
        </p>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-slate">
        <p className="text-ink-soft font-medium tabular-nums">
          {questions} Q · {p.durationMinutes} min
        </p>
        <p className="text-xs">
          {!markedAlike
            ? `−${[...sectionRates].sort((a, b) => a - b).join(" / −")} by section`
            : p.negativeMarking
              ? `−${p.negativeMarking} per wrong`
              : "No negative marking"}
          {p.marksPerQuestion && p.marksPerQuestion !== 1 ? ` · ${p.marksPerQuestion} marks each` : ""}
        </p>
      </td>
      <td className="px-4 py-3 min-w-[260px]">
        <div className="flex flex-wrap gap-1">
          {(p.sections || []).map((s, i) => {
            const subs = (s.syllabus || []).reduce((n, t) => n + (t.subTopics?.length || 0), 0);
            const none = !(s.syllabus?.length > 0);
            return (
              <span
                key={i}
                title={none ? "No syllabus - questions will be less accurate" : `${s.syllabus.length} topics${subs ? `, ${subs} sub-topics` : ""}`}
                className={`text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${none ? "bg-warn-light text-warn" : "bg-brand/10 text-brand-dark"}`}
              >
                {[s.subject, ...(s.sources || [])].join(" + ")} {s.questionCount}
                {!none && <span className="opacity-70"> · {s.syllabus.length}t</span>}
              </span>
            );
          })}
        </div>
        {missing > 0 && <p className="text-[11px] text-warn mt-1">{missing} section(s) without a syllabus</p>}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-slate">{typeof p.testCount === "number" ? p.testCount : "—"}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1.5">
          {archived ? (
            <button onClick={onRestore} className={`${small} bg-success-light text-success hover:opacity-80`}>
              Restore
            </button>
          ) : (
            <>
              <button onClick={onEdit} className={`${small} bg-brand/5 text-brand hover:bg-brand/10`}>
                Edit
              </button>
              <button onClick={onArchive} className={`${small} bg-slate-light text-ink-soft hover:bg-border-strong`}>
                Archive
              </button>
            </>
          )}
          <button onClick={onDelete} className={`${small} bg-danger-light text-danger hover:opacity-80`}>
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
