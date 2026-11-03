import { Fragment, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";
import { PageHeader, Card } from "../components/ui";
import { useToast } from "../components/Toast";
import QuestionEditor from "../components/QuestionEditor";
import ManualQuestions from "../components/ManualQuestions";
import QuestionVisual from "../components/QuestionVisual";
import { useGenerationActivity, useGenerationFinished, useJobs } from "../context/GenerationActivity";

export default function ExamMocks() {
  const toast = useToast();
  const { examStage } = useParams();
  const [mocks, setMocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState("");
  const [reviewMock, setReviewMock] = useState(null); // full mock being reviewed
  const [reviewLoading, setReviewLoading] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [addingTo, setAddingTo] = useState(null); // mock id we're adding questions to
  const [addForm, setAddForm] = useState({ subject: "", count: 10 });
  const [sections, setSections] = useState([]); // real sections of THIS exam
  const [addBusy, setAddBusy] = useState(false); // true while a batch is generating
  const [sectionStatus, setSectionStatus] = useState(null); // per-section progress for the open mock
  const [manualFor, setManualFor] = useState(null); // mock a person is writing questions into
  const [tab, setTab] = useState("draft");
  const [displayName, setDisplayName] = useState("");

  // A full paper is whatever this exam's pattern says - 80 for SSC GD, 150
  // for CTET and UP Police - not a flat 100. The card said "80 / 100, needs
  // more before it can be published" about a finished SSC GD mock.
  const fullSize = sections.reduce((n, s) => n + (s.questionCount || 0), 0) || 100;

  async function loadSectionStatus(testId) {
    try {
      const res = await api.get(`/exam-series/mock/${testId}/section-status`);
      setSectionStatus(res.data);
    } catch (err) {
      setSectionStatus(null);
    }
  }

  // Load the exam's real sections so admin picks from actual sections (not free text)
  useEffect(() => {
    async function loadSections() {
      try {
        const res = await api.get(`/exam-series/${examStage}/sections`);
        setSections(res.data.sections || []);
        setDisplayName(res.data.displayName || "");
        if (res.data.sections?.length) {
          setAddForm((f) => ({ ...f, subject: res.data.sections[0].subject }));
        }
      } catch (err) {
        // pattern missing - admin will see a hint
      }
    }
    loadSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examStage]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/exam-series/${examStage}/mocks`);
      setMocks(res.data.mocks);
    } catch (err) {
      // fail quietly
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examStage]);

  // Mocks for this exam on the Generation queue (from Vacancies or the
  // Generation page): shown here, and the list re-read when one finishes.
  const queuePaused = !!useGenerationActivity().activity?.paused;
  const mockJobs = useJobs((j) => j.kind === "mock" && j.examType === examStage);
  useGenerationFinished((job) => job.kind === "mock" && job.examType === examStage && load());

  // Option 2a: create an empty mock to fill gradually
  async function createEmpty() {
    setGenerating(true);
    setGenMessage("");
    try {
      const res = await api.post(`/exam-series/${examStage}/create-empty-mock`, {});
      setGenMessage(res.data.message);
      load();
    } catch (err) {
      setGenMessage("Error: " + (err.response?.data?.message || "Something went wrong"));
    } finally {
      setGenerating(false);
    }
  }

  // Option 2b: add a batch of questions to an existing draft mock
  async function addQuestions(testId) {
    if (!addForm.subject.trim()) {
      toast.error("Enter a subject (e.g. Maths)");
      return;
    }
    setAddBusy(true);
    setGenMessage("");
    try {
      const res = await api.post(`/exam-series/mock/${testId}/add-questions`, addForm);
      setGenMessage("✅ " + res.data.message);
      load();
      loadSectionStatus(testId); // refresh per-section counts
    } catch (err) {
      setGenMessage("Error: " + (err.response?.data?.message || "Couldn't add questions"));
    } finally {
      setAddBusy(false);
    }
  }

  async function openReview(testId) {
    // Called again after an edit to pull the corrected question back in,
    // so the modal never shows the version that was just fixed.
    setReviewLoading(true);
    try {
      const res = await api.get(`/exam-series/mock/${testId}`);
      setReviewMock(res.data.test);
    } catch (err) {
      toast.error("Couldn't load the review");
    } finally {
      setReviewLoading(false);
    }
  }

  async function publish(testId, isFree) {
    try {
      await api.patch(`/exam-series/mock/${testId}/publish`, { isFree });
      toast.success("Mock published");
      setReviewMock(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Publish failed");
    }
  }

  async function archive(testId) {
    const ok = await toast.confirm({
      title: "Hide this mock from students?",
      message: "It will be moved to Archived and won't show in the Mock Tests tab anymore.",
      confirmLabel: "Hide it",
    });
    if (!ok) return;
    try {
      await api.patch(`/exam-series/mock/${testId}/archive`);
      toast.success("Mock hidden from students");
      load();
    } catch (err) {
      toast.error("Something went wrong");
    }
  }

  async function deleteMock(testId) {
    const ok = await toast.confirm({
      title: "Permanently delete this mock?",
      message: "This deletes the mock and all its questions. This can't be undone.",
      confirmLabel: "Delete permanently",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/exam-series/mock/${testId}`);
      toast.success("Mock deleted");
      setReviewMock(null);
      load();
    } catch (err) {
      toast.error("Delete failed");
    }
  }

  async function removeQuestion(testId, questionId) {
    const ok = await toast.confirm({
      title: "Remove this question from the mock?",
      message: "The question stays in the bank, just removed from this specific mock.",
      confirmLabel: "Remove",
    });
    if (!ok) return;
    try {
      await api.delete(`/exam-series/mock/${testId}/question/${questionId}`);
      openReview(testId); // refresh review view
    } catch (err) {
      toast.error("Something went wrong");
    }
  }

  const drafts = mocks.filter((m) => m.publishStatus === "draft");
  const published = mocks.filter((m) => m.publishStatus === "published");
  const archived = mocks.filter((m) => m.publishStatus === "archived");
  const lists = { draft: drafts, published, archived };
  const shown = lists[tab] || [];

  return (
    <div>
      <PageHeader
        backTo="/exam-series"
        backLabel="All Exams"
        eyebrow="Mock series"
        title={displayName || examStage}
        subtitle={
          sections.length
            ? `${sections.map((s) => `${s.subject} ${s.questionCount}`).join(" · ")} — ${fullSize} questions a paper`
            : undefined
        }
        actions={
          <button onClick={createEmpty} disabled={generating} className="rv-btn-primary">
            {generating ? "Creating..." : "+ New mock"}
          </button>
        }
      />

      {addBusy && (
        <div className="mb-5 bg-warn-light border border-warn-border text-warn text-sm rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="inline-block w-4 h-4 border-2 border-warn-border border-t-warn rounded-full animate-spin"></span>
          Generating questions... this can take 30-60 seconds. Please don't close this page.
        </div>
      )}

      {mockJobs.length > 0 && (
        <div className="mb-5 rounded-lg border border-info-border bg-info-light px-4 py-3">
          <p className="text-sm font-semibold text-info mb-2">
            On the Generation queue ({mockJobs.length}) - each appears under Drafts when it is done.
          </p>
          {queuePaused && (
            <p className="text-xs text-warn mb-2">
              The queue is paused, so nothing is being built.{" "}
              <Link to="/generation" className="underline font-semibold">
                Resume it on the Generation page
              </Link>
              .
            </p>
          )}
          <ul className="space-y-1.5">
            {mockJobs.map((j) => (
              <li key={j._id} className="flex items-center gap-2 text-sm text-ink-soft">
                {j.position === 0 ? (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-info-border border-t-info rounded-full animate-spin shrink-0" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-info-border shrink-0" />
                )}
                <span className="flex-1 min-w-0 truncate">{j.testTitle || j.label}</span>
                <span className={`text-xs font-semibold shrink-0 ${j.position === 0 ? "text-info" : "text-slate-soft"}`}>
                  {j.position === 0 ? "Building now" : queuePaused ? `#${j.position} · paused` : `#${j.position} in line`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {genMessage && <div className="mb-5 bg-info-light border border-info-border text-info text-sm rounded-lg px-4 py-3">{genMessage}</div>}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border mb-4">
        {[
          ["draft", "Drafts", drafts.length, "bg-warn-light text-warn"],
          ["published", "Published", published.length, "bg-success-light text-success"],
          ["archived", "Archived", archived.length, "bg-slate-light text-slate"],
        ].map(([key, label, n, tone]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 -mb-px text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              tab === key ? "border-brand text-brand" : "border-transparent text-slate hover:text-ink"
            }`}
          >
            {label}
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full tabular-nums ${tone}`}>{n}</span>
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-soft pb-2">
          {tab === "draft" ? "Not visible to students" : tab === "published" ? "In the students' Mock Tests tab" : "Hidden from students"}
        </span>
      </div>

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <p className="text-slate-soft text-center py-10">Loading...</p>
        ) : shown.length === 0 ? (
          <p className="text-slate-soft text-center py-10">
            {tab === "draft" ? "No drafts. Press “+ New mock” to start one." : tab === "published" ? "No mocks published yet." : "Nothing archived."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-light/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate">
                  <th className="px-4 py-3 w-12">#</th>
                  <th className="px-4 py-3">Mock</th>
                  <th className="px-4 py-3 min-w-[170px]">Questions</th>
                  <th className="px-4 py-3">Access</th>
                  <th className="px-4 py-3 whitespace-nowrap">{tab === "published" ? "Published" : "Created"}</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {shown.map((m) => {
                  const have = m.questions?.length || 0;
                  const full = have >= fullSize;
                  return (
                    <Fragment key={m._id}>
                      <tr className="align-middle hover:bg-slate-light/40 transition-colors">
                        <td className="px-4 py-3 text-slate-soft tabular-nums">{m.seriesNumber ?? "—"}</td>
                        <td className="px-4 py-3 min-w-[220px]">
                          <button onClick={() => openReview(m._id)} className="font-semibold text-ink hover:text-brand text-left">
                            {m.title}
                          </button>
                          <p className="text-xs text-slate-soft">{m.durationMinutes} min</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-slate-light overflow-hidden min-w-[70px]">
                              <div className={`h-full rounded-full ${full ? "bg-success" : "bg-warn"}`} style={{ width: `${Math.min(100, (have / fullSize) * 100)}%` }} />
                            </div>
                            <span className={`text-xs tabular-nums whitespace-nowrap ${full ? "text-success font-semibold" : "text-warn"}`}>
                              {have}/{fullSize}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {m.publishStatus === "published" ? (
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${m.isFree ? "bg-success-light text-success" : "bg-brand/10 text-brand"}`}>
                              {m.isFree ? "Free" : "Premium"}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-soft">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate whitespace-nowrap tabular-nums text-xs">
                          {new Date((tab === "published" && m.publishedAt) || m.createdAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5 flex-wrap">
                            {tab === "draft" && (
                              <>
                                <Act
                                  tone="brand"
                                  onClick={() => {
                                    const opening = addingTo !== m._id;
                                    setAddingTo(opening ? m._id : null);
                                    if (opening) loadSectionStatus(m._id);
                                  }}
                                >
                                  + AI questions
                                </Act>
                                <Act tone="brand" onClick={() => setManualFor(m)} title="Type questions in, or upload a spreadsheet">
                                  + Write / upload
                                </Act>
                              </>
                            )}
                            <Act onClick={() => openReview(m._id)}>Review</Act>
                            {tab === "published" && (
                              <Act tone="warn" onClick={() => archive(m._id)}>
                                Hide
                              </Act>
                            )}
                            {tab !== "published" && (
                              <Act tone="danger" onClick={() => deleteMock(m._id)}>
                                Delete
                              </Act>
                            )}
                          </div>
                        </td>
                      </tr>

                      {tab === "draft" && addingTo === m._id && (
                        <tr>
                          <td colSpan={6} className="px-4 pb-4 pt-0">
                            <AddPanel
                              sections={sections}
                              addForm={addForm}
                              setAddForm={setAddForm}
                              addBusy={addBusy}
                              onAdd={() => addQuestions(m._id)}
                              sectionStatus={sectionStatus}
                            />
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
      </Card>

      {reviewLoading && <p className="text-slate-soft mt-4">Loading review...</p>}

      {reviewMock && (
        <ReviewModal
          mock={reviewMock}
          onClose={() => setReviewMock(null)}
          onPublish={publish}
          onDelete={deleteMock}
          onRemoveQuestion={removeQuestion}
          onEditQuestion={setEditingQuestion}
        />
      )}

      {manualFor && (
        <ManualQuestions
          endpoint={`/exam-series/mock/${manualFor._id}/manual-questions`}
          sections={sections.map((s) => s.subject)}
          title={manualFor.title}
          onClose={() => setManualFor(null)}
          onAdded={() => {
            load();
            if (reviewMock?._id === manualFor._id) openReview(manualFor._id);
          }}
        />
      )}

      {editingQuestion && (
        <QuestionEditor
          question={editingQuestion}
          canApprove
          note="This question lives in the shared bank, so the fix applies everywhere it is used."
          onClose={() => setEditingQuestion(null)}
          onSaved={() => openReview(reviewMock._id)}
        />
      )}
    </div>
  );
}

function Act({ tone, children, ...rest }) {
  const cls = {
    brand: "bg-brand/5 hover:bg-brand/10 text-brand",
    warn: "bg-warn-light hover:opacity-80 text-warn",
    danger: "bg-danger-light hover:opacity-80 text-danger",
  }[tone] || "bg-slate-light hover:bg-border-strong text-ink-soft";
  return (
    <button {...rest} className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${cls}`}>
      {children}
    </button>
  );
}

function AddPanel({ sections, addForm, setAddForm, addBusy, onAdd, sectionStatus }) {
  return (
    <div className="bg-slate-light/60 border border-border rounded-lg p-4">
      <p className="text-xs text-slate mb-3">Questions are written to this exam's pattern. Pick a section:</p>
      <div className="flex gap-2 items-end flex-wrap">
        <div>
          <label className="block text-xs text-slate mb-1">Section</label>
          {sections.length > 0 ? (
            <select value={addForm.subject} onChange={(e) => setAddForm({ ...addForm, subject: e.target.value })} className="rv-input !py-1.5 text-sm w-48">
              {sections.map((s) => (
                <option key={s.subject} value={s.subject}>
                  {s.subject} ({s.questionCount} in exam)
                </option>
              ))}
            </select>
          ) : (
            <input value={addForm.subject} onChange={(e) => setAddForm({ ...addForm, subject: e.target.value })} placeholder="Maths" className="rv-input !py-1.5 text-sm w-48" />
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
        <button onClick={onAdd} disabled={addBusy} className="rv-btn-primary !py-1.5 !text-sm disabled:opacity-70">
          {addBusy ? "Generating..." : "Generate & add"}
        </button>
      </div>
      {sectionStatus?.sections?.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs font-medium text-slate mb-2">
            Section progress ({sectionStatus.totalHave}/{sectionStatus.totalRequired}):
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {sectionStatus.sections.map((s) => (
              <div key={s.subject} className="flex items-center gap-2">
                <span className="text-xs text-slate w-28 truncate">{s.subject}</span>
                <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                  <div className={`h-2 rounded-full ${s.isFull ? "bg-success" : "bg-brand"}`} style={{ width: `${Math.min(100, (s.have / s.required) * 100)}%` }} />
                </div>
                <span className={`text-xs w-14 text-right tabular-nums ${s.isFull ? "text-success font-medium" : "text-slate"}`}>
                  {s.have}/{s.required} {s.isFull && "✓"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewModal({ mock, onClose, onPublish, onDelete, onRemoveQuestion, onEditQuestion }) {
  const isDraft = mock.publishStatus === "draft";
  return (
    <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border-soft">
          <div>
            <h3 className="font-display text-lg font-bold text-ink">{mock.title}</h3>
            <p className="text-xs text-slate-soft">{mock.questions.length} questions · Review before publishing</p>
          </div>
          <button onClick={onClose} className="text-slate-soft hover:text-ink-soft text-xl">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {mock.questions.map((q, idx) => (
            <div key={q._id} className="border border-border-soft rounded-xl p-4">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-ink text-sm">
                    {idx + 1}. {q.text}
                  </p>
                  <QuestionVisual q={q} className="mt-2" />
                </div>
                <div className="flex gap-3 shrink-0">
                  {/* Fixing beats removing: a removed question has to be paid
                      for again, and most of them are one digit out. */}
                  <button
                    onClick={() => onEditQuestion(q)}
                    className="text-brand text-xs whitespace-nowrap hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onRemoveQuestion(mock._id, q._id)}
                    className="text-danger text-xs whitespace-nowrap hover:underline"
                  >
                    Remove
                  </button>
                </div>
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
          ))}
        </div>

        <div className="p-5 border-t border-border-soft flex gap-3">
          {isDraft ? (
            <>
              <button
                onClick={() => onPublish(mock._id, false)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium"
              >
                Publish (Premium)
              </button>
              <button
                onClick={() => onPublish(mock._id, true)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-success hover:bg-success text-white text-sm font-medium"
              >
                Publish as Free
              </button>
            </>
          ) : (
            <p className="text-sm text-slate flex-1 self-center">
              Status: <b>{mock.publishStatus}</b>
            </p>
          )}
          <button
            onClick={() => onDelete(mock._id)}
            className="px-4 py-2.5 rounded-lg bg-danger-light hover:bg-danger-light text-danger text-sm font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}