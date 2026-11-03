import { Fragment, useEffect, useMemo, useState } from "react";
import { RiSearchLine, RiArrowDownSLine } from "@remixicon/react";
import api from "../api/axios";
import { PageHeader } from "../components/ui";
import { useToast } from "../components/Toast";

const blankChapter = () => ({ name: "", nameHi: "", category: "", categoryHi: "", topics: [], exams: [], visual: "" });

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
        what's tagged on the questions, or the chapter will look empty however full the bank is. Each topic can also have
        practice tests of its own (Subject Practice → open the chapter → pick the topic).
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

                <label className="flex flex-wrap items-center gap-2 text-xs text-slate mb-2">
                  Questions in this chapter:
                  <select
                    value={ch.visual || ""}
                    onChange={(e) => updateChapter(idx, "visual", e.target.value)}
                    className="rv-input !w-auto !py-1 text-xs"
                  >
                    <option value="">Ordinary (text only)</option>
                    <option value="chart">Data Interpretation - with a chart the app draws</option>
                    <option value="figure">Figure reasoning - a picture is uploaded per question</option>
                  </select>
                  {ch.visual === "figure" && (
                    <span className="text-warn">Tests here cannot be published until every picture is uploaded (Images pending).</span>
                  )}
                </label>

                <input
                  placeholder="Topics / subtopics (comma-separated, must match question tags)"
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
        <SubjectTable
          subjects={subjects}
          exams={exams}
          problems={health?.problems?.length || 0}
          onEdit={(s) => {
            setEditing(s);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}
    </div>
  );
}

function SubjectTable({ subjects, exams, problems, onEdit }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const examName = (t) => exams.find((e) => e.examType === t)?.displayName || t;

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return subjects;
    return subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(t) ||
        (s.nameHi || "").includes(q.trim()) ||
        (s.chapters || []).some((c) => c.name.toLowerCase().includes(t) || (c.topics || []).some((x) => x.toLowerCase().includes(t)))
    );
  }, [subjects, q]);

  const chapters = subjects.reduce((n, s) => n + (s.chapters?.length || 0), 0);
  const topics = subjects.reduce((n, s) => n + (s.chapters || []).reduce((m, c) => m + (c.topics?.length || 0), 0), 0);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        {[
          ["Subjects", subjects.length, "bg-brand"],
          ["Chapters", chapters, "bg-info"],
          ["Topics", topics, "bg-success"],
          ["Catalog problems", problems, problems ? "bg-danger" : "bg-slate-soft"],
        ].map(([label, value, tone]) => (
          <div key={label} className="rv-card p-4 flex items-center gap-3">
            <span className={`w-1.5 self-stretch rounded-full ${tone}`} />
            <div className="min-w-0">
              <p className="font-display text-xl font-extrabold text-ink tabular-nums">{value}</p>
              <p className="text-xs text-slate truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm mb-4">
        <RiSearchLine size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-soft" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search subjects, chapters or topics..." className="rv-input !pl-10" />
      </div>

      <div className="rv-card !p-0 overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-slate-soft text-center py-10">Nothing matches “{q}”.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-light/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate">
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Also known as</th>
                  <th className="px-4 py-3 text-right">Chapters</th>
                  <th className="px-4 py-3 text-right">Topics</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {rows.map((s) => {
                  const isOpen = open === s._id || (q.trim() && rows.length <= 3);
                  const nTopics = (s.chapters || []).reduce((m, c) => m + (c.topics?.length || 0), 0);
                  return (
                    <Fragment key={s._id}>
                      <tr className={`cursor-pointer transition-colors ${isOpen ? "bg-brand/[0.04]" : "hover:bg-slate-light/40"}`} onClick={() => setOpen(open === s._id ? null : s._id)}>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2.5">
                            <span className="text-xl">{s.icon || "📘"}</span>
                            <span>
                              <span className="block font-semibold text-ink">{s.name}</span>
                              {s.nameHi && <span className="block text-xs text-slate-soft">{s.nameHi}</span>}
                            </span>
                            <RiArrowDownSLine size={16} className={`text-slate-soft transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate max-w-[240px]">{s.aliases?.length ? s.aliases.join(", ") : <span className="text-slate-soft">—</span>}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-ink">{s.chapters?.length || 0}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate">{nTopics}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(s);
                            }}
                            className="px-2.5 py-1 rounded-md bg-brand/5 hover:bg-brand/10 text-brand text-xs font-semibold"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={5} className="px-4 pb-4 pt-1 bg-brand/[0.02]">
                            <div className="rounded-lg border border-border-soft overflow-hidden bg-surface">
                              <table className="w-full text-[13px]">
                                <thead>
                                  <tr className="text-left text-[10.5px] font-semibold uppercase tracking-wide text-slate bg-slate-light/50">
                                    <th className="px-3 py-2 w-10">#</th>
                                    <th className="px-3 py-2">Chapter</th>
                                    <th className="px-3 py-2">Group</th>
                                    <th className="px-3 py-2">Topics</th>
                                    <th className="px-3 py-2">Type</th>
                                    <th className="px-3 py-2">Shown in</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border-soft">
                                  {(s.chapters || []).map((c, i) => (
                                    <tr key={c._id || c.name} className="align-top">
                                      <td className="px-3 py-2 text-slate-soft tabular-nums">{i + 1}</td>
                                      <td className="px-3 py-2 min-w-[150px]">
                                        <p className="font-medium text-ink">{c.name}</p>
                                        {c.nameHi && <p className="text-[11px] text-slate-soft">{c.nameHi}</p>}
                                      </td>
                                      <td className="px-3 py-2 text-slate whitespace-nowrap">{c.category || <span className="text-slate-soft">—</span>}</td>
                                      <td className="px-3 py-2 min-w-[220px] text-slate">
                                        {(c.topics || []).length ? (c.topics || []).join(", ") : <span className="text-warn">No topics</span>}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap">
                                        {c.visual === "chart" ? (
                                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-info-light text-info font-semibold">Chart</span>
                                        ) : c.visual === "figure" ? (
                                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-warn-light text-warn font-semibold">Figure</span>
                                        ) : (
                                          <span className="text-[11px] text-slate-soft">Text</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-[11px] text-slate min-w-[160px]" title={(c.exams || []).map(examName).join(", ")}>
                                        {(c.exams || []).length ? `${c.exams.length} exam${c.exams.length > 1 ? "s" : ""}` : <span className="text-slate-soft">Every exam</span>}
                                      </td>
                                    </tr>
                                  ))}
                                  {!(s.chapters || []).length && (
                                    <tr>
                                      <td colSpan={6} className="px-3 py-4 text-center text-slate-soft">
                                        No chapters yet.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
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

function splitList(value) {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}
