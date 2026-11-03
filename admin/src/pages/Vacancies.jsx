import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { PageHeader, Button, Modal, Field, Input, Select, Textarea, EmptyState, LoadingState } from "../components/ui";
import { useToast } from "../components/Toast";
import { useGenerationActivity, useGenerationFinished, useJobs } from "../context/GenerationActivity";
import { RiMegaphoneLine } from "@remixicon/react";

// Recruitment notices ("RRB Group D 2025") and their mock series.
//
// The app shows "Upcoming exam mock series" above "Previous exam mock
// series"; the status chosen here decides which, and Hidden keeps one out of
// the app while it is being set up. A vacancy's mocks follow the syllabus in
// its notification where it is given here, section by section; a section
// left empty follows the exam pattern.

const STATUS = {
  upcoming: { label: "Upcoming", tone: "success" },
  previous: { label: "Previous", tone: "brand" },
  hidden: { label: "Hidden", tone: "neutral" },
};

// "Percentage - successive change, profit" per line <-> { topic, subTopics }
const topicsToText = (topics = []) =>
  topics.map((t) => [t.topic, (t.subTopics || []).join(", ")].filter(Boolean).join(" - ")).join("\n");
const textToTopics = (text) =>
  String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [topic, subs = ""] = line.split(/\s+-\s+/, 2);
      return { topic: topic.trim(), subTopics: subs.split(",").map((s) => s.trim()).filter(Boolean) };
    });

const blank = (patterns) => ({
  examType: patterns[0]?.examType || "",
  name: "",
  year: new Date().getFullYear(),
  seriesName: "",
  status: "hidden",
  displayOrder: 0,
  examDate: "",
  notificationUrl: "",
  notes: "",
  syllabusText: {},
});

export default function Vacancies() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(null); // form state, with _id when editing
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(null);
  const [tab, setTab] = useState("upcoming");

  async function load() {
    const res = await api.get("/vacancies");
    setData(res.data);
    return res.data;
  }
  useEffect(() => {
    load()
      .then((d) => {
        // Open on a tab that has something in it.
        const has = (st) => (d?.vacancies || []).some((v) => v.status === st);
        if (!has("upcoming")) setTab(has("previous") ? "previous" : has("hidden") ? "hidden" : "upcoming");
      })
      .catch(() => toast.error("Couldn't load vacancies"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live place in line for each vacancy's mocks; the counts re-read when one is done.
  const { refresh: refreshQueue } = useGenerationActivity();
  const vacancyJobs = useJobs((j) => j.kind === "mock" && j.vacancy);
  useGenerationFinished((job) => job.kind === "mock" && load().catch(() => {}));

  const patterns = data?.patterns || [];
  const sectionsOf = (examType) => patterns.find((p) => p.examType === examType)?.sections || [];

  function openNew() {
    setEditing(blank(patterns));
  }
  function openEdit(v) {
    const syllabusText = {};
    for (const s of v.syllabus || []) syllabusText[s.subject] = topicsToText(s.topics);
    setEditing({
      ...v,
      examDate: v.examDate ? String(v.examDate).slice(0, 10) : "",
      notificationUrl: v.notificationUrl || "",
      notes: v.notes || "",
      syllabusText,
    });
  }

  async function save() {
    setSaving(true);
    const body = {
      examType: editing.examType,
      name: editing.name,
      year: editing.year,
      seriesName: editing.seriesName || `${editing.name} Mock Series`,
      status: editing.status,
      displayOrder: editing.displayOrder,
      examDate: editing.examDate || null,
      notificationUrl: editing.notificationUrl,
      notes: editing.notes,
      syllabus: sectionsOf(editing.examType)
        .map((subject) => ({ subject, topics: textToTopics(editing.syllabusText?.[subject]) }))
        .filter((s) => s.topics.length),
    };
    try {
      const res = editing._id ? await api.patch(`/vacancies/${editing._id}`, body) : await api.post("/vacancies", body);
      toast.success(res.data?.message || "Saved");
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  async function queueMock(v) {
    setBusy(v._id);
    try {
      const res = await api.post(`/vacancies/${v._id}/build-mock`, { count: 1 });
      toast.success(res.data?.message || "Queued");
      refreshQueue();
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't queue a mock");
    } finally {
      setBusy(null);
    }
  }

  // Mocks built before vacancies existed: bring them into this series.
  async function adopt(v) {
    const ok = await toast.confirm({
      title: `Move older ${v.examType} mocks into ${v.seriesName}?`,
      message: `Each is renamed "${v.seriesName} - Mock #n". Questions, numbers and publish status stay the same.`,
      confirmLabel: "Move them",
    });
    if (!ok) return;
    try {
      const res = await api.post(`/vacancies/${v._id}/adopt-mocks`);
      toast.success(res.data?.message || "Done");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't move them");
    }
  }

  async function setStatus(v, status) {
    try {
      await api.patch(`/vacancies/${v._id}`, { status });
      toast.success(`Now ${STATUS[status].label.toLowerCase()}`);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't change it");
    }
  }

  async function remove(v) {
    const ok = await toast.confirm({ title: `Delete ${v.name}?`, message: "Only a vacancy with no mocks can be deleted.", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    try {
      const res = await api.delete(`/vacancies/${v._id}`);
      toast.success(res.data?.message || "Deleted");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't delete it");
    }
  }

  const all = data?.vacancies || [];
  const counts = { upcoming: 0, previous: 0, hidden: 0 };
  for (const v of all) counts[v.status] = (counts[v.status] || 0) + 1;
  const totalMocks = all.reduce((n, v) => n + (v.mocks?.published || 0) + (v.mocks?.draft || 0), 0);
  const shown = all.filter((v) => v.status === tab);
  const examName = (t) => patterns.find((p) => p.examType === t)?.displayName || t;

  return (
    <div>
      <PageHeader
        eyebrow="Exams"
        title="Vacancies"
        subtitle="Each recruitment notice gets its own mock series, built from the syllabus in its notification. Upcoming ones show first in the app, then Previous; Hidden ones do not show."
        actions={
          <Button onClick={openNew} disabled={!patterns.length}>
            + Add vacancy
          </Button>
        }
      />

      {!data ? (
        <LoadingState />
      ) : !data.vacancies.length ? (
        <EmptyState
          icon={RiMegaphoneLine}
          title="No vacancies yet"
          text='Add one for each notice, e.g. "RRB Group D 2025", then queue its mocks.'
          action={<Button onClick={openNew}>+ Add vacancy</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
            {[
              ["Upcoming in the app", counts.upcoming, "bg-success"],
              ["Previous in the app", counts.previous, "bg-brand"],
              ["Hidden", counts.hidden, "bg-slate-soft"],
              ["Mocks in these series", totalMocks, "bg-info"],
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

          <div className="flex flex-wrap items-center gap-1 border-b border-border mb-4">
            {[
              ["upcoming", "Upcoming"],
              ["previous", "Previous"],
              ["hidden", "Hidden"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-2.5 -mb-px text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                  tab === key ? "border-brand text-brand" : "border-transparent text-slate hover:text-ink"
                }`}
              >
                {label}
                <span className="text-[11px] px-1.5 py-0.5 rounded-full tabular-nums bg-slate-light text-slate">{counts[key]}</span>
              </button>
            ))}
            <span className="ml-auto text-xs text-slate-soft pb-2">
              {tab === "upcoming"
                ? 'Shown first in the app as "Upcoming exam mock series"'
                : tab === "previous"
                  ? 'Shown in the app under "Previous exam mock series"'
                  : "Not shown in the app"}
            </span>
          </div>

          <div className="rv-card !p-0 overflow-hidden">
            {!shown.length ? (
              <p className="text-slate-soft text-center py-10">No {STATUS[tab].label.toLowerCase()} vacancy.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-light/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate">
                      <th className="px-4 py-3">Vacancy</th>
                      <th className="px-4 py-3">Exam</th>
                      <th className="px-4 py-3 whitespace-nowrap">Exam date</th>
                      <th className="px-4 py-3">Syllabus</th>
                      <th className="px-4 py-3">Mocks</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft">
                    {shown.map((v) => {
                      const jobs = vacancyJobs.filter((j) => String(j.vacancy) === String(v._id));
                      const now = jobs.some((j) => j.position === 0);
                      const next = jobs.length ? Math.min(...jobs.map((j) => j.position)) : 0;
                      const small = "px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors";
                      return (
                        <tr key={v._id} className="align-top hover:bg-slate-light/40 transition-colors">
                          <td className="px-4 py-3 min-w-[220px]">
                            <button onClick={() => openEdit(v)} className="font-semibold text-ink hover:text-brand text-left">
                              {v.name}
                            </button>
                            <p className="text-xs text-slate-soft">{v.seriesName}</p>
                            {v.status === "upcoming" && v.shownAs === "previous" && (
                              <p className="text-[11px] text-warn font-semibold mt-1">Exam date passed - students see it under "Exam held"</p>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-ink-soft">
                            {examName(v.examType)}
                            <p className="text-xs text-slate-soft">{v.year}</p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate tabular-nums">
                            {v.examDate ? new Date(v.examDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs min-w-[150px]">
                            {v.syllabus?.length ? (
                              <span className="text-ink-soft">Own: {v.syllabus.map((s) => s.subject).join(", ")}</span>
                            ) : (
                              <span className="text-slate-soft">Exam pattern's</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums ${v.mocks.published ? "bg-success-light text-success" : "bg-slate-light text-slate-soft"}`}>
                              {v.mocks.published} live
                            </span>
                            {v.mocks.draft > 0 && (
                              <span className="ml-1 text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums bg-warn-light text-warn">{v.mocks.draft} draft</span>
                            )}
                            {jobs.length > 0 && (
                              <p className="text-[11px] text-brand font-semibold mt-1 flex items-center gap-1">
                                {now && <span className="inline-block w-2.5 h-2.5 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />}
                                {now ? `Building now${jobs.length > 1 ? ` (+${jobs.length - 1})` : ""}` : `${jobs.length} waiting (#${next})`}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1.5 flex-wrap max-w-[300px] ml-auto">
                              <button onClick={() => queueMock(v)} disabled={busy === v._id} className={`${small} bg-brand text-white hover:bg-brand-dark disabled:opacity-60`}>
                                {busy === v._id ? "Queueing..." : "+ Queue mock"}
                              </button>
                              <Link to={`/exam-series/${v.examType}`} className={`${small} bg-slate-light text-ink-soft hover:bg-border-strong`}>
                                Review mocks
                              </Link>
                              <button onClick={() => openEdit(v)} className={`${small} bg-slate-light text-ink-soft hover:bg-border-strong`}>
                                Edit
                              </button>
                              {v.status !== "upcoming" && (
                                <button onClick={() => setStatus(v, "upcoming")} className={`${small} bg-success-light text-success hover:opacity-80`}>
                                  Make upcoming
                                </button>
                              )}
                              {v.status === "upcoming" && (
                                <button onClick={() => setStatus(v, "previous")} className={`${small} bg-brand/5 text-brand hover:bg-brand/10`}>
                                  Move to previous
                                </button>
                              )}
                              {v.status !== "hidden" && (
                                <button onClick={() => setStatus(v, "hidden")} className={`${small} bg-slate-light text-slate hover:bg-border-strong`}>
                                  Hide
                                </button>
                              )}
                              <button onClick={() => adopt(v)} className={`${small} bg-slate-light text-slate hover:bg-border-strong`} title="Move mocks built before vacancies existed into this series">
                                Bring in older mocks
                              </button>
                              {v.mocks.published + v.mocks.draft === 0 && (
                                <button onClick={() => remove(v)} className={`${small} bg-danger-light text-danger hover:opacity-80`}>
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        size="lg"
        title={editing?._id ? `Edit ${editing.name}` : "Add vacancy"}
        subtitle="The syllabus is optional: fill in the sections the notification lists; empty sections follow the exam pattern."
        footer={
          <>
            <Button loading={saving} onClick={save}>
              Save
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Exam (pattern the paper follows)">
                <Select value={editing.examType} onChange={(e) => setEditing({ ...editing, examType: e.target.value })}>
                  {patterns.map((p) => (
                    <option key={p.examType} value={p.examType}>
                      {p.displayName}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Shown in the app as">
                <Select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                  <option value="upcoming">Upcoming exam mock series</option>
                  <option value="previous">Previous exam mock series</option>
                  <option value="hidden">Hidden (not in the app)</option>
                </Select>
              </Field>
              <Field label="Vacancy name">
                <Input value={editing.name} placeholder="RRB Group D 2025" onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </Field>
              <Field label="Vacancy year">
                <Input type="number" value={editing.year} onChange={(e) => setEditing({ ...editing, year: Number(e.target.value) })} />
              </Field>
              <Field label="Series name" hint="What students see above the mocks">
                <Input
                  value={editing.seriesName}
                  placeholder={editing.name ? `${editing.name} Mock Series` : "RRB Group D 2025 Mock Series"}
                  onChange={(e) => setEditing({ ...editing, seriesName: e.target.value })}
                />
              </Field>
              <Field label="Exam date (if known)">
                <Input type="date" value={editing.examDate} onChange={(e) => setEditing({ ...editing, examDate: e.target.value })} />
              </Field>
              <Field label="Official notification link">
                <Input value={editing.notificationUrl} placeholder="https://..." onChange={(e) => setEditing({ ...editing, notificationUrl: e.target.value })} />
              </Field>
              <Field label="Order in the app" hint="Lower comes first">
                <Input type="number" value={editing.displayOrder} onChange={(e) => setEditing({ ...editing, displayOrder: Number(e.target.value) })} />
              </Field>
            </div>
            <Field label="Note for students (posts, vacancies, eligibility)">
              <Textarea rows={2} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
            </Field>

            <div>
              <p className="text-sm font-semibold text-ink mb-1">Syllabus from the notification</p>
              <p className="text-xs text-slate mb-3">
                One topic per line. Add sub-topics after a dash: <code>Percentage - successive change, profit</code>. Naming a Data
                Interpretation or figure chapter brings a chart or figure set into the mock.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                {sectionsOf(editing.examType).map((subject) => (
                  <Field key={subject} label={subject}>
                    <Textarea
                      rows={5}
                      value={editing.syllabusText?.[subject] || ""}
                      placeholder="Empty: follows the exam pattern"
                      onChange={(e) => setEditing({ ...editing, syllabusText: { ...editing.syllabusText, [subject]: e.target.value } })}
                    />
                  </Field>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
