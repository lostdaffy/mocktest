import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { PageHeader } from "../components/ui";
import { useToast } from "../components/Toast";

const blankChapter = () => ({ name: "", nameHi: "", category: "", categoryHi: "", topics: [], exams: [] });

export default function Subjects() {
  const toast = useToast();
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // subject being edited, or null

  const [health, setHealth] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [subjectRes, examRes, healthRes] = await Promise.all([
        api.get("/subjects"),
        api.get("/exams"),
        api.get("/subjects/health").catch(() => null),
      ]);
      setSubjects(subjectRes.data.subjects);
      setExams(examRes.data.patterns || []);
      setHealth(healthRes?.data || null);
    } catch (err) {
      // fail quietly
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setEditing({ name: "", nameHi: "", icon: "📘", displayOrder: subjects.length + 1, aliases: [], chapters: [] });
  }

  function addChapter() {
    setEditing((e) => ({ ...e, chapters: [...e.chapters, blankChapter()] }));
  }

  function updateChapter(idx, field, value) {
    setEditing((e) => {
      const chapters = [...e.chapters];
      if (field === "topics") chapters[idx] = { ...chapters[idx], topics: splitList(value) };
      else chapters[idx] = { ...chapters[idx], [field]: value };
      return { ...e, chapters };
    });
  }

  function toggleChapterExam(idx, examType) {
    setEditing((e) => {
      const chapters = [...e.chapters];
      const current = chapters[idx].exams || [];
      chapters[idx] = {
        ...chapters[idx],
        exams: current.includes(examType) ? current.filter((x) => x !== examType) : [...current, examType],
      };
      return { ...e, chapters };
    });
  }

  function removeChapter(idx) {
    setEditing((e) => ({ ...e, chapters: e.chapters.filter((_, i) => i !== idx) }));
  }

  async function save() {
    if (!editing.name) {
      toast.error("Enter a subject name");
      return;
    }
    const unnamed = editing.chapters.filter((c) => !c.name.trim()).length;
    if (unnamed) {
      toast.error(`${unnamed} chapter${unnamed > 1 ? "s have" : " has"} no name`);
      return;
    }
    try {
      await api.post("/subjects", editing);
      toast.success(`"${editing.name}" saved`);
      setEditing(null);
      load();
    } catch (err) {
      toast.error("Save failed: " + (err.response?.data?.message || err.message));
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Exams"
        title="Subjects & Chapters"
        actions={
          <button onClick={startNew} className="rv-btn-primary">
            + Add Subject
          </button>
        }
      />
      <p className="text-slate -mt-4 mb-8">
        These subjects and chapters are what students practise from. A chapter's <b>topics</b> must match exactly
        what's tagged on the questions, or the chapter will look empty however full the bank is.
      </p>

      <CatalogHealth health={health} />

      {editing && (
        <div className="rv-card p-6 mb-8">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-1.5">Subject Name</label>
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Maths"
                className="rv-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-1.5">Hindi Name</label>
              <input
                value={editing.nameHi || ""}
                onChange={(e) => setEditing({ ...editing, nameHi: e.target.value })}
                placeholder="गणित"
                className="rv-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-1.5">Icon (emoji)</label>
              <input
                value={editing.icon || ""}
                onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                placeholder="🔢"
                className="rv-input"
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-ink-soft mb-1.5">Other names for this subject</label>
            <input
              value={(editing.aliases || []).join(", ")}
              onChange={(e) => setEditing({ ...editing, aliases: splitList(e.target.value) })}
              placeholder="Quant, Quantitative Aptitude"
              className="rv-input"
            />
            <p className="text-xs text-slate-soft mt-1.5">
              Names other exams use for the same subject. A Banking paper asking for "Quant" then finds this subject
              and its questions, instead of coming back empty.
            </p>
          </div>

          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-ink-soft">
              Chapters <span className="text-slate-soft font-normal">({editing.chapters.length})</span>
            </label>
            <button type="button" onClick={addChapter} className="text-sm text-brand hover:underline">
              + Add Chapter
            </button>
          </div>

          <div className="space-y-3">
            {editing.chapters.map((ch, idx) => (
              <div key={idx} className="bg-slate-light p-3 rounded-lg">
                <div className="grid grid-cols-12 gap-2 mb-2">
                  <input
                    placeholder="Chapter name (e.g. Percentage)"
                    value={ch.name}
                    onChange={(e) => updateChapter(idx, "name", e.target.value)}
                    className="col-span-4 rv-input !py-1.5 text-sm"
                  />
                  <input
                    placeholder="Hindi name (प्रतिशत)"
                    value={ch.nameHi || ""}
                    onChange={(e) => updateChapter(idx, "nameHi", e.target.value)}
                    className="col-span-3 rv-input !py-1.5 text-sm"
                  />
                  <input
                    placeholder="Group heading (अंकगणित)"
                    value={ch.category || ""}
                    onChange={(e) => updateChapter(idx, "category", e.target.value)}
                    className="col-span-4 rv-input !py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeChapter(idx)}
                    className="col-span-1 text-danger text-sm"
                    title="Remove chapter"
                  >
                    ✕
                  </button>
                </div>

                <input
                  placeholder="Topics (comma-separated, must match question tags)"
                  value={(ch.topics || []).join(", ")}
                  onChange={(e) => updateChapter(idx, "topics", e.target.value)}
                  className="w-full rv-input !py-1.5 text-sm mb-2"
                />

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-soft mr-1">Shown in:</span>
                  {exams.map((ex) => {
                    const on = (ch.exams || []).includes(ex.examType);
                    return (
                      <button
                        key={ex.examType}
                        type="button"
                        onClick={() => toggleChapterExam(idx, ex.examType)}
                        className={
                          "text-xs px-2 py-0.5 rounded-full border transition-colors " +
                          (on
                            ? "bg-brand text-white border-brand"
                            : "bg-white text-slate border-slate-light hover:border-brand")
                        }
                      >
                        {ex.displayName || ex.examType}
                      </button>
                    );
                  })}
                  {!(ch.exams || []).length && (
                    <span className="text-xs text-slate-soft italic">none picked — shows in every exam</span>
                  )}
                </div>
              </div>
            ))}
            {!editing.chapters.length && (
              <p className="text-sm text-slate-soft italic py-3">No chapters yet. Add the first one above.</p>
            )}
          </div>

          <div className="flex gap-3 mt-5">
            <button onClick={save} className="px-5 py-2.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium">
              Save Subject
            </button>
            <button onClick={() => setEditing(null)} className="px-5 py-2.5 rounded-lg bg-slate-light text-slate text-sm font-medium">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-slate-soft">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {subjects.map((s) => (
            <SubjectCard key={s._id} subject={s} onEdit={() => setEditing(s)} />
          ))}
        </div>
      )}
    </div>
  );
}

// Setup mistakes don't announce themselves. A section naming a subject that
// doesn't exist saves without complaint and then shows one group of students
// an empty screen, months later. This is where they surface instead.
function CatalogHealth({ health }) {
  const [open, setOpen] = useState(false);
  if (!health) return null;

  const problems = health.problems || [];
  const high = problems.filter((p) => p.severity === "high");
  const rest = problems.filter((p) => p.severity !== "high");

  if (!problems.length) {
    return (
      <div className="rv-card p-4 mb-8 border-l-4 border-l-success">
        <p className="text-sm text-ink">
          ✓ Catalog is consistent — {health.subjects} subjects, {health.chapters} chapters,{" "}
          {health.publishedQuestions} published questions, every section wired to a subject.
        </p>
      </div>
    );
  }

  const shown = open ? [...high, ...rest] : high;

  return (
    <div className={`rv-card p-5 mb-8 border-l-4 ${high.length ? "border-l-danger" : "border-l-warn"}`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="font-semibold text-ink">
            {high.length > 0
              ? `${high.length} problem${high.length > 1 ? "s" : ""} will make screens come up empty`
              : `${rest.length} thing${rest.length > 1 ? "s" : ""} to look at`}
          </p>
          <p className="text-xs text-slate-soft mt-0.5">
            {health.subjects} subjects · {health.chapters} chapters · {health.publishedQuestions} published questions
          </p>
        </div>
        {rest.length > 0 && (
          <button onClick={() => setOpen((o) => !o)} className="text-sm text-brand hover:underline whitespace-nowrap">
            {open ? "Show less" : `+ ${rest.length} more`}
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {shown.map((p, i) => (
          <div key={i} className="text-sm">
            <p className="text-ink">
              <span
                className={
                  "inline-block text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded mr-2 align-middle " +
                  (p.severity === "high" ? "bg-danger/10 text-danger" : "bg-warn/10 text-warn")
                }
              >
                {p.severity}
              </span>
              <b>{p.exam || p.subject}</b>
              {p.chapter ? ` / ${p.chapter}` : ""} — {p.detail}
            </p>
            <p className="text-xs text-slate-soft ml-1 mt-0.5">{p.fix}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubjectCard({ subject, onEdit }) {
  // Grouped the way a student sees them, so the admin screen and the app
  // don't quietly drift apart.
  const groups = useMemo(() => {
    const byCategory = new Map();
    for (const ch of subject.chapters || []) {
      const key = ch.category || "";
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key).push(ch);
    }
    return [...byCategory.entries()];
  }, [subject]);

  return (
    <div className="rv-card p-6">
      <div className="flex items-center justify-between mb-1">
        <p className="font-semibold text-ink text-lg">
          {subject.icon} {subject.name}
        </p>
        <button onClick={onEdit} className="text-sm text-brand hover:underline">
          Edit
        </button>
      </div>
      <p className="text-xs text-slate-soft mb-3">
        {subject.chapters?.length || 0} chapters
        {subject.aliases?.length ? ` · also known as ${subject.aliases.join(", ")}` : ""}
      </p>

      <div className="space-y-2.5">
        {groups.map(([category, chapters]) => (
          <div key={category || "ungrouped"}>
            <p className="text-[11px] uppercase tracking-wide text-slate-soft mb-1">
              {category || "No group"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {chapters.map((ch, i) => (
                <span
                  key={i}
                  className="text-xs bg-brand/10 text-brand-dark px-2 py-0.5 rounded-full"
                  title={(ch.exams || []).length ? `Shown in: ${ch.exams.join(", ")}` : "Shown in every exam"}
                >
                  {ch.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function splitList(value) {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}
