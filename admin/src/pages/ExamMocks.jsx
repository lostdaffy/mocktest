import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";

export default function ExamMocks() {
  const { examStage } = useParams();
  const [mocks, setMocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState("");
  const [reviewMock, setReviewMock] = useState(null); // full mock being reviewed
  const [reviewLoading, setReviewLoading] = useState(false);
  const [addingTo, setAddingTo] = useState(null); // mock id we're adding questions to
  const [addForm, setAddForm] = useState({ subject: "", count: 10 });
  const [sections, setSections] = useState([]); // real sections of THIS exam
  const [addBusy, setAddBusy] = useState(false); // true while a batch is generating
  const [sectionStatus, setSectionStatus] = useState(null); // per-section progress for the open mock

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

  // Option 2a: create an empty mock to fill gradually
  async function createEmpty() {
    setGenerating(true);
    setGenMessage("");
    try {
      const res = await api.post(`/exam-series/${examStage}/create-empty-mock`);
      setGenMessage(res.data.message);
      load();
    } catch (err) {
      setGenMessage("Error: " + (err.response?.data?.message || "fail"));
    } finally {
      setGenerating(false);
    }
  }

  // Option 2b: add a batch of questions to an existing draft mock
  async function addQuestions(testId) {
    if (!addForm.subject.trim()) {
      alert("Subject daalo (jaise Maths)");
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
      setGenMessage("Error: " + (err.response?.data?.message || "add fail hua"));
    } finally {
      setAddBusy(false);
    }
  }

  async function openReview(testId) {
    setReviewLoading(true);
    try {
      const res = await api.get(`/exam-series/mock/${testId}`);
      setReviewMock(res.data.test);
    } catch (err) {
      alert("Review load nahi hua");
    } finally {
      setReviewLoading(false);
    }
  }

  async function publish(testId, isFree) {
    try {
      await api.patch(`/exam-series/mock/${testId}/publish`, { isFree });
      setReviewMock(null);
      load();
    } catch (err) {
      alert("Publish fail hua");
    }
  }

  async function archive(testId) {
    if (!confirm("Ye mock students se hide kar dein?")) return;
    try {
      await api.patch(`/exam-series/mock/${testId}/archive`);
      load();
    } catch (err) {
      alert("Fail");
    }
  }

  async function deleteMock(testId) {
    if (!confirm("Ye mock aur uske saare questions PERMANENTLY delete kar dein? Wapas nahi aayega.")) return;
    try {
      await api.delete(`/exam-series/mock/${testId}`);
      setReviewMock(null);
      load();
    } catch (err) {
      alert("Delete fail hua");
    }
  }

  async function removeQuestion(testId, questionId) {
    if (!confirm("Ye question is mock se hata dein?")) return;
    try {
      await api.delete(`/exam-series/mock/${testId}/question/${questionId}`);
      openReview(testId); // refresh review view
    } catch (err) {
      alert("Fail");
    }
  }

  const drafts = mocks.filter((m) => m.publishStatus === "draft");
  const published = mocks.filter((m) => m.publishStatus === "published");
  const archived = mocks.filter((m) => m.publishStatus === "archived");

  return (
    <div>
      <Link to="/exam-series" className="text-sm text-brand hover:underline">
        ← Saare Exams
      </Link>
      <div className="flex items-center justify-between mt-2 mb-1">
        <h1 className="font-display text-2xl font-bold text-ink">{examStage} Mock Series</h1>
        <button
          onClick={createEmpty}
          disabled={generating}
          className="px-5 py-2.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium transition-colors disabled:opacity-60"
        >
          {generating ? "Ban raha hai..." : "+ Naya Mock Banao"}
        </button>
      </div>
      <p className="text-slate-500 mb-6">
        Naya mock banao, phir usme <b>"Add Questions"</b> se thoda-thoda karke questions add karo (12-12). 100 questions
        hone par publish kar sakte ho. Sirf is exam ka content — quality guaranteed.
      </p>

      {addBusy && (
        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="inline-block w-4 h-4 border-2 border-amber-300 border-t-amber-700 rounded-full animate-spin"></span>
          Questions generate ho rahe hain... thoda ruko (rate limit ki wajah se 30-60 sec lag sakta hai). Page band mat
          karo.
        </div>
      )}

      {genMessage && (
        <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg px-4 py-3">{genMessage}</div>
      )}

      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : (
        <>
          <Section title={`📝 Drafts (${drafts.length})`} hint="Review karke publish karo (100 questions zaroori)">
            {drafts.map((m) => (
              <div key={m._id} className="mb-3">
                <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-ink">{m.title}</p>
                    <p className={`text-xs mt-0.5 ${(m.questions?.length || 0) >= 100 ? "text-emerald-600" : "text-amber-600"}`}>
                      {m.questions?.length || 0} / 100 questions
                      {(m.questions?.length || 0) < 100 && " — publish ke liye aur chahiye"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const opening = addingTo !== m._id;
                        setAddingTo(opening ? m._id : null);
                        if (opening) loadSectionStatus(m._id);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-brand/10 text-brand text-sm font-medium hover:bg-brand/20"
                    >
                      + Add Questions
                    </button>
                    <button onClick={() => openReview(m._id)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200">
                      Review
                    </button>
                    <button onClick={() => deleteMock(m._id)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100">
                      Delete
                    </button>
                  </div>
                </div>

                {addingTo === m._id && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2">
                    <p className="text-xs text-slate-500 mb-3">
                      Questions real exam pattern (PYQ style) ke hisaab se banenge — asli exam jaisa mix. Is exam ke
                      section choose karo:
                    </p>
                    <div className="flex gap-2 items-end flex-wrap">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Section</label>
                        {sections.length > 0 ? (
                          <select
                            value={addForm.subject}
                            onChange={(e) => setAddForm({ ...addForm, subject: e.target.value })}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm w-44"
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
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm w-44"
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Count (max 12)</label>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={addForm.count}
                          onChange={(e) => setAddForm({ ...addForm, count: Number(e.target.value) })}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm w-20"
                        />
                      </div>
                      <button
                        onClick={() => addQuestions(m._id)}
                        disabled={addBusy}
                        className="px-4 py-1.5 rounded-lg bg-brand text-white text-sm font-medium disabled:opacity-70 flex items-center gap-2"
                      >
                        {addBusy ? (
                          <>
                            <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                            Ban raha hai...
                          </>
                        ) : (
                          "Generate & Add"
                        )}
                      </button>
                    </div>
                    {sectionStatus?.sections?.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-200">
                        <p className="text-xs font-medium text-slate-600 mb-2">
                          Section Progress ({sectionStatus.totalHave}/{sectionStatus.totalRequired} total):
                        </p>
                        <div className="space-y-1.5">
                          {sectionStatus.sections.map((s) => (
                            <div key={s.subject} className="flex items-center gap-2">
                              <span className="text-xs text-slate-600 w-28">{s.subject}</span>
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-2 rounded-full ${s.isFull ? "bg-emerald-500" : "bg-brand"}`}
                                  style={{ width: `${Math.min(100, (s.have / s.required) * 100)}%` }}
                                ></div>
                              </div>
                              <span className={`text-xs w-12 text-right ${s.isFull ? "text-emerald-600 font-medium" : "text-slate-500"}`}>
                                {s.have}/{s.required} {s.isFull && "✓"}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                          Har section utna hi bharo jitna asli exam mein aata hai. Full (✓) section mein aur add nahi hoga.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {drafts.length === 0 && <Empty text="Koi draft nahi. Naya generate karo." />}
          </Section>

          <Section title={`✅ Published / Live (${published.length})`} hint="Students ko ye dikh rahe hain">
            {published.map((m) => (
              <MockRow
                key={m._id}
                mock={m}
                onReview={() => openReview(m._id)}
                onArchive={() => archive(m._id)}
                published
              />
            ))}
            {published.length === 0 && <Empty text="Abhi koi mock live nahi." />}
          </Section>

          {archived.length > 0 && (
            <Section title={`🗑️ Archived (${archived.length})`} hint="Hidden from students">
              {archived.map((m) => (
                <MockRow key={m._id} mock={m} onReview={() => openReview(m._id)} onDelete={() => deleteMock(m._id)} />
              ))}
            </Section>
          )}
        </>
      )}

      {reviewLoading && <p className="text-slate-400 mt-4">Review load ho raha hai...</p>}

      {reviewMock && (
        <ReviewModal
          mock={reviewMock}
          onClose={() => setReviewMock(null)}
          onPublish={publish}
          onDelete={deleteMock}
          onRemoveQuestion={removeQuestion}
        />
      )}
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <div className="mb-8">
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
        <span className="text-xs text-slate-400">{hint}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Empty({ text }) {
  return <p className="text-sm text-slate-400 bg-slate-50 rounded-lg px-4 py-3">{text}</p>;
}

function MockRow({ mock, onReview, onPublish, onArchive, onDelete, published }) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 flex items-center justify-between">
      <div>
        <p className="font-semibold text-ink">{mock.title}</p>
        <p className="text-xs text-slate-400">
          {mock.durationMinutes} min · {mock.isFree ? "Free" : "Premium"}
        </p>
      </div>
      <div className="flex gap-2">
        <button onClick={onReview} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium">
          Review
        </button>
        {onArchive && (
          <button onClick={onArchive} className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-medium">
            Hide
          </button>
        )}
        {onDelete && (
          <button onClick={onDelete} className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium">
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewModal({ mock, onClose, onPublish, onDelete, onRemoveQuestion }) {
  const isDraft = mock.publishStatus === "draft";
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="font-display text-lg font-bold text-ink">{mock.title}</h3>
            <p className="text-xs text-slate-400">{mock.questions.length} questions · Review karke publish karo</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {mock.questions.map((q, idx) => (
            <div key={q._id} className="border border-slate-100 rounded-xl p-4">
              <div className="flex justify-between items-start gap-2">
                <p className="font-medium text-ink text-sm">
                  {idx + 1}. {q.text}
                </p>
                <button
                  onClick={() => onRemoveQuestion(mock._id, q._id)}
                  className="text-red-500 text-xs whitespace-nowrap hover:underline"
                >
                  Hata do
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1 mt-2">
                {q.options.map((opt, i) => (
                  <div
                    key={i}
                    className={`text-xs px-2 py-1 rounded ${
                      i === q.correctIndex ? "bg-emerald-50 text-emerald-800 font-medium" : "text-slate-500"
                    }`}
                  >
                    {String.fromCharCode(65 + i)}. {opt} {i === q.correctIndex && "✓"}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                <b>Sol:</b> {q.solution}
              </p>
              <p className="text-[10px] text-slate-300 mt-1">
                {q.subject} · {q.difficulty}
              </p>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-slate-100 flex gap-3">
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
                className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
              >
                Publish as Free
              </button>
            </>
          ) : (
            <p className="text-sm text-slate-500 flex-1 self-center">
              Status: <b>{mock.publishStatus}</b>
            </p>
          )}
          <button
            onClick={() => onDelete(mock._id)}
            className="px-4 py-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}