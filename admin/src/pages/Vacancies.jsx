import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { PageHeader, Badge, Button, Modal, Field, Input, Select, Textarea, EmptyState, LoadingState } from "../components/ui";
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

  async function load() {
    const res = await api.get("/vacancies");
    setData(res.data);
  }
  useEffect(() => {
    load().catch(() => toast.error("Couldn't load vacancies"));
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

  const groups = ["upcoming", "previous", "hidden"].map((s) => [s, (data?.vacancies || []).filter((v) => v.status === s)]);
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
        groups.map(([status, list]) =>
          list.length ? (
            <section key={status} className="mb-8">
              <h2 className="font-display text-lg font-bold text-ink mb-3">
                {status === "upcoming" ? "Upcoming exam mock series" : status === "previous" ? "Previous exam mock series" : "Hidden"}
              </h2>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {list.map((v) => (
                  <div key={v._id} className="rv-card p-5 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{v.name}</p>
                        <p className="text-xs text-slate mt-0.5">
                          {examName(v.examType)} · {v.year}
                        </p>
                      </div>
                      <Badge tone={STATUS[v.status].tone}>{STATUS[v.status].label}</Badge>
                    </div>
                    <p className="text-sm text-ink-soft mt-2">{v.seriesName}</p>
                    {v.status === "upcoming" && v.shownAs === "previous" && (
                      <p className="text-xs text-warn bg-warn-light rounded-md px-2.5 py-1.5 mt-2">
                        Exam date has passed - students now see this series under &quot;Exam held&quot;, below the newer one.
                      </p>
                    )}
                    <p className="text-xs text-slate-soft mt-1">
                      {v.syllabus?.length ? `Own syllabus for ${v.syllabus.map((s) => s.subject).join(", ")}` : "Follows the exam pattern's syllabus"}
                    </p>
                    <p className="text-xs mt-2">
                      <span className="text-success font-medium">{v.mocks.published} published</span>
                      {v.mocks.draft > 0 && <span className="text-warn font-medium"> · {v.mocks.draft} draft</span>}
                      {(() => {
                        const jobs = vacancyJobs.filter((j) => String(j.vacancy) === String(v._id));
                        if (!jobs.length) return null;
                        const now = jobs.some((j) => j.position === 0);
                        const next = Math.min(...jobs.map((j) => j.position));
                        return (
                          <span className="text-brand font-medium">
                            {" "}
                            · {now ? `building now${jobs.length > 1 ? ` (+${jobs.length - 1} waiting)` : ""}` : `${jobs.length} waiting (#${next} in line)`}
                          </span>
                        );
                      })()}
                    </p>
                    <div className="mt-auto pt-4 flex flex-wrap gap-2">
                      <Button size="sm" loading={busy === v._id} onClick={() => queueMock(v)}>
                        + Queue a mock
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => adopt(v)}>
                        Bring in older mocks
                      </Button>
                      <Link to={`/exam-series/${v.examType}`} className="rv-btn-secondary !py-1.5 !px-3 text-xs">
                        Review mocks
                      </Link>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(v)}>
                        Edit
                      </Button>
                      {v.status !== "upcoming" && (
                        <Button size="sm" variant="ghost" onClick={() => setStatus(v, "upcoming")}>
                          Make upcoming
                        </Button>
                      )}
                      {v.status === "upcoming" && (
                        <Button size="sm" variant="ghost" onClick={() => setStatus(v, "previous")}>
                          Move to previous
                        </Button>
                      )}
                      {v.mocks.published + v.mocks.draft === 0 && (
                        <Button size="sm" variant="ghost" onClick={() => remove(v)}>
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null
        )
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
