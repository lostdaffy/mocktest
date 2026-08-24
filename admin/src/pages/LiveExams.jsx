import { useEffect, useState } from "react";
import {
  RiRadioButtonLine,
  RiCalendarEventLine,
  RiAddLine,
  RiPencilLine,
  RiDeleteBinLine,
  RiCloseLine,
  RiCheckLine,
  RiTrophyLine,
  RiAlarmWarningLine,
} from "@remixicon/react";
import api from "../api/axios";
import { PageHeader } from "../components/ui";
import { useToast } from "../components/Toast";

// <input type="datetime-local"> hands back a bare string like
// "2026-08-24T14:30" with NO timezone attached. Sending that as-is caused a
// real bug: the server parses it as whatever timezone IT runs in (UTC on
// Render), not the IST the admin actually picked - a silent 5.5 hour shift
// every time. Attaching the real IST offset here makes the string
// unambiguous no matter where the server runs.
function toIstIso(localDateTimeValue) {
  if (!localDateTimeValue) return localDateTimeValue;
  return `${localDateTimeValue}:00+05:30`;
}

function toLocalInputValue(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  // Render as IST wall-clock for the <input>, not the browser's local zone.
  const ist = new Date(d.getTime() + (5.5 * 60 - d.getTimezoneOffset()) * 60000);
  return ist.toISOString().slice(0, 16);
}

const STATUS_LABEL = {
  draft: "Building",
  published: "Scheduled",
  archived: "Cancelled",
};

export default function LiveExams() {
  const toast = useToast();
  const [exams, setExams] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create-new-live-exam form
  const [showCreate, setShowCreate] = useState(false);
  const [examType, setExamType] = useState("");
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [creating, setCreating] = useState(false);

  // Builder state (Add Questions panel per draft)
  const [addingTo, setAddingTo] = useState(null); // live exam id
  const [sections, setSections] = useState([]);
  const [addForm, setAddForm] = useState({ subject: "", count: 10 });
  const [addBusy, setAddBusy] = useState(false);
  const [sectionStatus, setSectionStatus] = useState(null);
  const [genMessage, setGenMessage] = useState("");

  // Reschedule state
  const [reschedulingId, setReschedulingId] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({ title: "", scheduledAt: "" });
  const [rescheduleBusy, setRescheduleBusy] = useState(false);

  // Review modal
  const [reviewExam, setReviewExam] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Results & integrity modal (ended exams)
  const [resultsExam, setResultsExam] = useState(null);
  const [resultsAttempts, setResultsAttempts] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [examsRes, patternsRes] = await Promise.all([api.get("/live-exams"), api.get("/exams")]);
      setExams(examsRes.data.exams);
      setPatterns(patternsRes.data.patterns);
      if (!examType && patternsRes.data.patterns.length) setExamType(patternsRes.data.patterns[0].examType);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSections(forExamType) {
    try {
      const res = await api.get(`/exam-series/${forExamType}/sections`);
      setSections(res.data.sections || []);
      if (res.data.sections?.length) setAddForm((f) => ({ ...f, subject: res.data.sections[0].subject }));
    } catch (err) {
      setSections([]);
    }
  }

  async function loadSectionStatus(liveExamId) {
    try {
      const res = await api.get(`/live-exams/${liveExamId}/section-status`);
      setSectionStatus(res.data);
    } catch (err) {
      setSectionStatus(null);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!examType || !scheduledAt) {
      toast.error("Exam aur date/time dono chuno");
      return;
    }
    setCreating(true);
    try {
      await api.post("/live-exams", { examType, scheduledAt: toIstIso(scheduledAt), title: title.trim() || undefined });
      toast.success("Live exam draft ban gaya - ab questions add karo");
      setTitle("");
      setScheduledAt("");
      setShowCreate(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function openAddQuestions(exam) {
    const opening = addingTo !== exam._id;
    setAddingTo(opening ? exam._id : null);
    setGenMessage("");
    if (opening) {
      loadSections(exam.examType);
      loadSectionStatus(exam._id);
    }
  }

  async function addQuestions(liveExamId) {
    if (!addForm.subject.trim()) {
      toast.error("Section chuno");
      return;
    }
    setAddBusy(true);
    setGenMessage("");
    try {
      const res = await api.post(`/live-exams/${liveExamId}/add-questions`, addForm);
      setGenMessage("✅ " + res.data.message);
      load();
      loadSectionStatus(liveExamId);
    } catch (err) {
      setGenMessage("Error: " + (err.response?.data?.message || "Couldn't add questions"));
    } finally {
      setAddBusy(false);
    }
  }

  function startReschedule(exam) {
    setReschedulingId(exam._id);
    setRescheduleForm({ title: exam.title, scheduledAt: toLocalInputValue(exam.scheduledAt) });
  }

  async function saveReschedule(liveExamId) {
    setRescheduleBusy(true);
    try {
      await api.patch(`/live-exams/${liveExamId}`, {
        title: rescheduleForm.title,
        scheduledAt: toIstIso(rescheduleForm.scheduledAt),
      });
      toast.success("Update ho gaya");
      setReschedulingId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setRescheduleBusy(false);
    }
  }

  async function publishExam(liveExamId) {
    try {
      const res = await api.patch(`/live-exams/${liveExamId}/publish`);
      toast.success(res.data.message);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Schedule failed");
    }
  }

  async function cancelExam(liveExamId) {
    const ok = await toast.confirm({
      title: "Ye live exam cancel karein?",
      message: "Students ko ab ye nahi dikhega. Draft mein wapas nahi jayega, lekin data safe rahega.",
      confirmLabel: "Cancel karo",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.patch(`/live-exams/${liveExamId}/cancel`);
      toast.success("Live exam cancel ho gaya");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Cancel failed");
    }
  }

  async function deleteExam(liveExamId) {
    const ok = await toast.confirm({
      title: "Permanently delete karein?",
      message: "Ye live exam aur iske saare questions delete ho jayenge. Ye undo nahi ho sakta.",
      confirmLabel: "Delete permanently",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/live-exams/${liveExamId}`);
      toast.success("Live exam delete ho gaya");
      setReviewExam(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  }

  async function openReview(liveExamId) {
    setReviewLoading(true);
    try {
      const res = await api.get(`/live-exams/${liveExamId}`);
      setReviewExam(res.data.test);
    } catch (err) {
      toast.error("Couldn't load the review");
    } finally {
      setReviewLoading(false);
    }
  }

  async function removeQuestion(liveExamId, questionId) {
    const ok = await toast.confirm({
      title: "Ye question hataayein?",
      message: "Question permanently delete ho jayega.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/live-exams/${liveExamId}/question/${questionId}`);
      openReview(liveExamId);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    }
  }

  async function updateQuestion(questionId, updates) {
    try {
      await api.put(`/questions/${questionId}`, updates);
      toast.success("Question update ho gaya");
      openReview(reviewExam._id);
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  }

  async function openResults(exam) {
    setResultsExam(exam);
    setResultsLoading(true);
    try {
      const res = await api.get(`/live-exams/${exam._id}/attempts`);
      setResultsAttempts(res.data.attempts || []);
    } catch (err) {
      toast.error("Couldn't load results");
    } finally {
      setResultsLoading(false);
    }
  }

  const drafts = exams.filter((e) => e.publishStatus === "draft");
  const scheduled = exams.filter((e) => e.publishStatus === "published" && e.liveState !== "ended");
  const ended = exams.filter((e) => e.publishStatus === "published" && e.liveState === "ended");
  const cancelled = exams.filter((e) => e.publishStatus === "archived");

  return (
    <div>
      <PageHeader
        eyebrow="Exams"
        title="Live Exams"
        actions={
          <button onClick={() => setShowCreate((v) => !v)} className="rv-btn-primary">
            <RiAddLine size={16} /> New Live Exam
          </button>
        }
      />
      <p className="text-slate -mt-4 mb-6">
        Har live exam ka apna question set hota hai, seedha isi ke liye generate kiya gaya — koi purana Mock Tests
        series test assign nahi karna padta. Draft banao, questions add/edit/delete karo, phir schedule karo.
      </p>

      {showCreate && (
        <form onSubmit={handleCreate} className="rv-card p-6 mb-8 space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-1.5">Exam</label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className="rv-input min-w-[220px]"
              >
                {patterns.map((p) => (
                  <option key={p._id} value={p.examType}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-1.5">Date & Time</label>
              <input
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="rv-input"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-ink-soft mb-1.5">Title (optional)</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Auto-generated agar khali chhoda"
                className="rv-input w-full"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="rv-btn-primary"
            >
              {creating ? "Creating..." : "Create Draft"}
            </button>
          </div>
        </form>
      )}

      {addBusy && (
        <div className="mb-6 bg-warn-light border border-warn-border text-warn text-sm rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="inline-block w-4 h-4 border-2 border-warn-border border-t-warn rounded-full animate-spin"></span>
          Generating questions... this can take 30-60 seconds. Please don't close this page.
        </div>
      )}
      {genMessage && (
        <div className="mb-6 bg-info-light border border-info-border text-info text-sm rounded-lg px-4 py-3">{genMessage}</div>
      )}

      {loading ? (
        <p className="text-slate-soft">Loading...</p>
      ) : (
        <>
          <Section title={`📝 Building (${drafts.length})`} hint="Add questions, then schedule once ready">
            {drafts.map((exam) => (
              <div key={exam._id} className="mb-3">
                <div className="rv-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-ink">{exam.title}</p>
                      <p className={`text-xs mt-0.5 ${exam.questionCount >= 100 ? "text-success" : "text-warn"}`}>
                        {exam.questionCount} questions · {new Date(exam.scheduledAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openAddQuestions(exam)}
                        className="px-3 py-1.5 rounded-lg bg-brand/10 text-brand text-sm font-medium hover:bg-brand/20"
                      >
                        + Add Questions
                      </button>
                      <button onClick={() => openReview(exam._id)} className="px-3 py-1.5 rounded-lg bg-slate-light text-ink-soft text-sm font-medium hover:bg-border-strong">
                        Review
                      </button>
                      <button onClick={() => startReschedule(exam)} className="px-3 py-1.5 rounded-lg bg-slate-light text-ink-soft text-sm font-medium hover:bg-border-strong">
                        Edit
                      </button>
                      <button
                        onClick={() => publishExam(exam._id)}
                        className="px-3 py-1.5 rounded-lg bg-success-light text-success text-sm font-medium hover:bg-success-light"
                      >
                        Schedule
                      </button>
                      <button onClick={() => deleteExam(exam._id)} className="px-3 py-1.5 rounded-lg bg-danger-light text-danger text-sm font-medium hover:bg-danger-light">
                        Delete
                      </button>
                    </div>
                  </div>

                  {reschedulingId === exam._id && (
                    <RescheduleForm
                      form={rescheduleForm}
                      setForm={setRescheduleForm}
                      onCancel={() => setReschedulingId(null)}
                      onSave={() => saveReschedule(exam._id)}
                      busy={rescheduleBusy}
                    />
                  )}
                </div>

                {addingTo === exam._id && (
                  <div className="bg-slate-light border border-border rounded-xl p-4 mt-2">
                    <p className="text-xs text-slate mb-3">
                      Questions generated fresh for this live exam only — real exam pattern (PYQ style) follow karte
                      hue.
                    </p>
                    <div className="flex gap-2 items-end flex-wrap">
                      <div>
                        <label className="block text-xs text-slate mb-1">Section</label>
                        {sections.length > 0 ? (
                          <select
                            value={addForm.subject}
                            onChange={(e) => setAddForm({ ...addForm, subject: e.target.value })}
                            className="rv-input !py-1.5 text-sm w-44"
                          >
                            {sections.map((s) => (
                              <option key={s.subject} value={s.subject}>
                                {s.subject} ({s.questionCount} in exam)
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            value={addForm.subject}
                            onChange={(e) => setAddForm({ ...addForm, subject: e.target.value })}
                            placeholder="Maths"
                            className="rv-input !py-1.5 text-sm w-44"
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-slate mb-1">Count (max 12)</label>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={addForm.count}
                          onChange={(e) => setAddForm({ ...addForm, count: Number(e.target.value) })}
                          className="rv-input !py-1.5 text-sm w-20"
                        />
                      </div>
                      <button
                        onClick={() => addQuestions(exam._id)}
                        disabled={addBusy}
                        className="px-4 py-1.5 rounded-lg bg-brand text-white text-sm font-medium disabled:opacity-70 flex items-center gap-2"
                      >
                        {addBusy ? (
                          <>
                            <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                            Generating...
                          </>
                        ) : (
                          "Generate & Add"
                        )}
                      </button>
                    </div>
                    {sectionStatus?.sections?.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-border">
                        <p className="text-xs font-medium text-slate mb-2">
                          Section progress ({sectionStatus.totalHave}/{sectionStatus.totalRequired} total):
                        </p>
                        <div className="space-y-1.5">
                          {sectionStatus.sections.map((s) => (
                            <div key={s.subject} className="flex items-center gap-2">
                              <span className="text-xs text-slate w-28">{s.subject}</span>
                              <div className="flex-1 h-2 bg-slate-light rounded-full overflow-hidden">
                                <div
                                  className={`h-2 rounded-full ${s.isFull ? "bg-success-light0" : "bg-brand"}`}
                                  style={{ width: `${Math.min(100, (s.have / s.required) * 100)}%` }}
                                ></div>
                              </div>
                              <span className={`text-xs w-12 text-right ${s.isFull ? "text-success font-medium" : "text-slate"}`}>
                                {s.have}/{s.required} {s.isFull && "✓"}
                              </span>
                            </div>
                          ))}
                        </div>
                        {sectionStatus.isComplete && (
                          <p className="text-xs text-success font-medium mt-2">
                            ✓ Ready to schedule — hit "Schedule" above.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {drafts.length === 0 && <Empty text='No live exam being built. Click "New Live Exam" to start.' />}
          </Section>

          <Section title={`🔴 Scheduled (${scheduled.length})`} hint="Visible to students, waiting to start or currently live">
            {scheduled.map((exam) => (
              <div key={exam._id} className="mb-2">
                <div className="rv-card p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${exam.liveState === "ongoing" ? "bg-success-light text-success" : "bg-danger-light text-danger"}`}>
                      <RiCalendarEventLine size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-ink">{exam.title}</p>
                      <p className="text-sm text-slate">
                        {new Date(exam.scheduledAt).toLocaleString("en-IN")} · {exam.questionCount} questions
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1.5 ${
                        exam.liveState === "ongoing" ? "bg-success-light text-success" : "bg-danger-light text-danger"
                      }`}
                    >
                      <RiRadioButtonLine size={12} /> {exam.liveState === "ongoing" ? "Live now" : "Upcoming"}
                    </span>
                    <button onClick={() => openReview(exam._id)} className="px-3 py-1.5 rounded-lg bg-slate-light text-ink-soft text-sm font-medium hover:bg-border-strong">
                      Review
                    </button>
                    {exam.liveState === "upcoming" && (
                      <>
                        <button onClick={() => startReschedule(exam)} className="px-3 py-1.5 rounded-lg bg-slate-light text-ink-soft text-sm font-medium hover:bg-border-strong">
                          Reschedule
                        </button>
                        <button onClick={() => cancelExam(exam._id)} className="px-3 py-1.5 rounded-lg bg-danger-light text-danger text-sm font-medium hover:bg-danger-light">
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {reschedulingId === exam._id && (
                  <div className="rv-card p-4 mt-1">
                    <RescheduleForm
                      form={rescheduleForm}
                      setForm={setRescheduleForm}
                      onCancel={() => setReschedulingId(null)}
                      onSave={() => saveReschedule(exam._id)}
                      busy={rescheduleBusy}
                    />
                  </div>
                )}
              </div>
            ))}
            {scheduled.length === 0 && <Empty text="No live exams scheduled yet." />}
          </Section>

          {ended.length > 0 && (
            <Section title={`✅ Ended (${ended.length})`} hint="Results released to students">
              {ended.map((exam) => (
                <div key={exam._id} className="rv-card p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-ink">{exam.title}</p>
                    <p className="text-xs text-slate-soft">{new Date(exam.scheduledAt).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openResults(exam)} className="px-3 py-1.5 rounded-lg bg-brand/10 text-brand text-sm font-medium hover:bg-brand/20 flex items-center gap-1.5">
                      <RiTrophyLine size={14} /> Results
                    </button>
                    <button onClick={() => openReview(exam._id)} className="px-3 py-1.5 rounded-lg bg-slate-light text-ink-soft text-sm font-medium hover:bg-border-strong">
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </Section>
          )}

          {cancelled.length > 0 && (
            <Section title={`🗑️ Cancelled (${cancelled.length})`} hint="Hidden from students">
              {cancelled.map((exam) => (
                <div key={exam._id} className="rv-card p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-ink">{exam.title}</p>
                    <p className="text-xs text-slate-soft">{new Date(exam.scheduledAt).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openReview(exam._id)} className="px-3 py-1.5 rounded-lg bg-slate-light text-ink-soft text-sm font-medium hover:bg-border-strong">
                      Review
                    </button>
                    <button onClick={() => deleteExam(exam._id)} className="px-3 py-1.5 rounded-lg bg-danger-light text-danger text-sm font-medium hover:bg-danger-light">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </Section>
          )}
        </>
      )}

      {reviewLoading && <p className="text-slate-soft mt-4">Loading review...</p>}

      {reviewExam && (
        <ReviewModal
          exam={reviewExam}
          onClose={() => setReviewExam(null)}
          onRemoveQuestion={removeQuestion}
          onUpdateQuestion={updateQuestion}
          editable={reviewExam.publishStatus === "draft"}
        />
      )}

      {resultsExam && (
        <ResultsModal
          exam={resultsExam}
          attempts={resultsAttempts}
          loading={resultsLoading}
          onClose={() => setResultsExam(null)}
        />
      )}
    </div>
  );
}

function RescheduleForm({ form, setForm, onCancel, onSave, busy }) {
  return (
    <div className="bg-slate-light border border-border rounded-xl p-4 mt-2 flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[180px]">
        <label className="block text-xs text-slate mb-1">Title</label>
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="rv-input !py-1.5 text-sm w-full"
        />
      </div>
      <div>
        <label className="block text-xs text-slate mb-1">Date & Time</label>
        <input
          type="datetime-local"
          value={form.scheduledAt}
          onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
          className="rv-input !py-1.5 text-sm"
        />
      </div>
      <button
        onClick={onSave}
        disabled={busy}
        className="px-4 py-1.5 rounded-lg bg-brand text-white text-sm font-medium disabled:opacity-70"
      >
        {busy ? "Saving..." : "Save"}
      </button>
      <button onClick={onCancel} className="px-4 py-1.5 rounded-lg bg-slate-light text-slate text-sm font-medium">
        Cancel
      </button>
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <div className="mb-8">
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
        <span className="text-xs text-slate-soft">{hint}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Empty({ text }) {
  return <p className="text-sm text-slate-soft bg-slate-light rounded-lg px-4 py-3">{text}</p>;
}

function ReviewModal({ exam, onClose, onRemoveQuestion, onUpdateQuestion, editable }) {
  const [editingId, setEditingId] = useState(null);

  return (
    <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border-soft">
          <div>
            <h3 className="font-display text-lg font-bold text-ink">{exam.title}</h3>
            <p className="text-xs text-slate-soft">
              {exam.questions.length} questions · Status: {STATUS_LABEL[exam.publishStatus] || exam.publishStatus}
              {!editable && " · read-only (schedule inactive to edit)"}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-soft hover:text-ink-soft text-xl">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {exam.questions.map((q, idx) =>
            editingId === q._id ? (
              <QuestionEditForm
                key={q._id}
                question={q}
                onCancel={() => setEditingId(null)}
                onSave={(updates) => {
                  onUpdateQuestion(q._id, updates);
                  setEditingId(null);
                }}
              />
            ) : (
              <div key={q._id} className="border border-border-soft rounded-xl p-4">
                <div className="flex justify-between items-start gap-2">
                  <p className="font-medium text-ink text-sm">
                    {idx + 1}. {q.text}
                  </p>
                  {editable && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => setEditingId(q._id)} className="text-slate-soft hover:text-brand" title="Edit">
                        <RiPencilLine size={16} />
                      </button>
                      <button onClick={() => onRemoveQuestion(exam._id, q._id)} className="text-slate-soft hover:text-danger" title="Delete">
                        <RiDeleteBinLine size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1 mt-2">
                  {q.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`text-xs px-2 py-1 rounded ${
                        i === q.correctIndex ? "bg-success-light text-success font-medium" : "text-slate"
                      }`}
                    >
                      {String.fromCharCode(65 + i)}. {opt} {i === q.correctIndex && "✓"}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate mt-2">
                  <b>Solution:</b> {q.solution}
                </p>
                <p className="text-[10px] text-slate-soft mt-1">
                  {q.subject} · {q.difficulty}
                </p>
              </div>
            )
          )}
          {exam.questions.length === 0 && <Empty text="Abhi tak koi question add nahi hua." />}
        </div>
      </div>
    </div>
  );
}

function ResultsModal({ exam, attempts, loading, onClose }) {
  return (
    <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border-soft">
          <div>
            <h3 className="font-display text-lg font-bold text-ink">{exam.title} — Results</h3>
            <p className="text-xs text-slate-soft">
              {attempts.length} attempt{attempts.length === 1 ? "" : "s"} · sorted by rank
            </p>
          </div>
          <button onClick={onClose} className="text-slate-soft hover:text-ink-soft text-xl">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-2 flex-1">
          {loading ? (
            <p className="text-slate-soft">Loading...</p>
          ) : attempts.length === 0 ? (
            <Empty text="Koi student ne ye live exam attempt nahi kiya." />
          ) : (
            attempts.map((a) => (
              <div key={a.attemptId} className="flex items-center justify-between border border-border-soft rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-light flex items-center justify-center text-xs font-bold text-slate shrink-0">
                    #{a.rank ?? "-"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink flex items-center gap-2">
                      {a.name}
                      {a.autoSubmitted && (
                        <span className="text-[10px] font-bold bg-warn-light text-warn px-2 py-0.5 rounded-full">
                          AUTO-SUBMITTED
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-soft">
                      {a.phone || "—"} · Score {a.score} · {a.accuracy}% accuracy
                    </p>
                  </div>
                </div>
                {a.backgroundCount > 0 && (
                  <div
                    className="flex items-center gap-1.5 text-xs font-medium bg-danger-light text-danger px-2.5 py-1 rounded-full shrink-0"
                    title={`Left the app ${a.backgroundCount} time(s), ~${a.backgroundSeconds}s total`}
                  >
                    <RiAlarmWarningLine size={13} /> left app {a.backgroundCount}x
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionEditForm({ question, onCancel, onSave }) {
  const [text, setText] = useState(question.text);
  const [options, setOptions] = useState([...question.options]);
  const [correctIndex, setCorrectIndex] = useState(question.correctIndex);
  const [solution, setSolution] = useState(question.solution);

  function setOption(i, val) {
    const next = [...options];
    next[i] = val;
    setOptions(next);
  }

  return (
    <div className="border border-brand/40 bg-brand/5 rounded-xl p-4 space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="w-full rv-input text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              checked={correctIndex === i}
              onChange={() => setCorrectIndex(i)}
              title="Mark as correct"
            />
            <input
              value={opt}
              onChange={(e) => setOption(i, e.target.value)}
              className="flex-1 rv-input !py-1.5 !px-2 text-xs"
            />
          </div>
        ))}
      </div>
      <textarea
        value={solution}
        onChange={(e) => setSolution(e.target.value)}
        rows={2}
        placeholder="Solution"
        className="rv-input text-xs"
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ text, options, correctIndex, solution })}
          className="px-4 py-1.5 rounded-lg bg-brand text-white text-sm font-medium flex items-center gap-1.5"
        >
          <RiCheckLine size={14} /> Save
        </button>
        <button onClick={onCancel} className="px-4 py-1.5 rounded-lg bg-slate-light text-slate text-sm font-medium flex items-center gap-1.5">
          <RiCloseLine size={14} /> Cancel
        </button>
      </div>
    </div>
  );
}
