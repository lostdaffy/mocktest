import { useEffect, useState } from "react";
import api from "../api/axios";

const LEVELS = ["easy", "medium", "hard", "advanced"];
const LEVEL_COLORS = {
  easy: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  medium: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
  hard: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
  advanced: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
};

export default function PracticeSeries() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Navigation: null = subject grid, else = selected subject's chapters
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [openChapter, setOpenChapter] = useState(null);
  const [chapterTests, setChapterTests] = useState([]);
  const [testsLoading, setTestsLoading] = useState(false);

  const [genBusy, setGenBusy] = useState(null); // "chapter-level" key while generating
  const [message, setMessage] = useState("");

  // Review modal: shows every question of a test so admin can check quality
  const [reviewTest, setReviewTest] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  async function openReview(testId) {
    setReviewLoading(true);
    try {
      const res = await api.get(`/exam-series/mock/${testId}`);
      setReviewTest(res.data.test);
    } catch (err) {
      alert("Review load nahi hua");
    } finally {
      setReviewLoading(false);
    }
  }

  // Remove a single bad question from the test
  async function removeQuestion(testId, questionId) {
    if (!confirm("Ye question hata dein?")) return;
    try {
      await api.delete(`/exam-series/mock/${testId}/question/${questionId}`);
      openReview(testId); // refresh the review
      loadChapterTests(selectedSubject.name, openChapter.name);
    } catch (err) {
      alert("Remove fail");
    }
  }

  async function load(keepSubjectName) {
    setLoading(true);
    try {
      const res = await api.get("/exam-series/subjects/list");
      setSubjects(res.data.subjects);
      const name = keepSubjectName || selectedSubject?.name;
      if (name) {
        const updated = res.data.subjects.find((s) => s.name === name);
        if (updated) setSelectedSubject(updated);
      }
    } catch (err) {
      setMessage("Subjects load nahi hue. Backend chal raha hai?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadChapterTests(subject, chapter) {
    setTestsLoading(true);
    try {
      const res = await api.get(
        `/exam-series/practice/${encodeURIComponent(subject)}/${encodeURIComponent(chapter)}`
      );
      setChapterTests(res.data.tests);
    } catch (err) {
      setChapterTests([]);
    } finally {
      setTestsLoading(false);
    }
  }

  function openChapterPanel(chapter) {
    if (openChapter?.name === chapter.name) {
      setOpenChapter(null);
      setChapterTests([]);
      return;
    }
    setOpenChapter(chapter);
    loadChapterTests(selectedSubject.name, chapter.name);
  }

  async function generate(chapter, difficulty) {
    setGenBusy(`${chapter.name}-${difficulty}`);
    setMessage("");
    try {
      const res = await api.post("/exam-series/practice/generate", {
        subject: selectedSubject.name,
        chapter: chapter.name,
        topics: chapter.topics,
        difficulty,
      });
      setMessage("✅ " + res.data.message);
      loadChapterTests(selectedSubject.name, chapter.name);
      load(selectedSubject.name);
    } catch (err) {
      setMessage("❌ " + (err.response?.data?.message || "Generate fail hua"));
    } finally {
      setGenBusy(null);
    }
  }

  async function publishTest(testId, isFree) {
    try {
      await api.patch(`/exam-series/practice/${testId}/publish`, { isFree });
      loadChapterTests(selectedSubject.name, openChapter.name);
      load(selectedSubject.name);
    } catch (err) {
      alert("Publish fail: " + (err.response?.data?.message || ""));
    }
  }

  async function deleteTest(testId) {
    if (!confirm("Ye test delete karein? Wapas nahi aayega.")) return;
    try {
      await api.delete(`/exam-series/mock/${testId}`);
      loadChapterTests(selectedSubject.name, openChapter.name);
      load(selectedSubject.name);
    } catch (err) {
      alert("Delete fail");
    }
  }

  // ---------- VIEW 1: Subject grid ----------
  if (!selectedSubject) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-ink mb-1">Subject Practice</h1>
        <p className="text-slate-500 mb-8">
          Subject choose karo → chapters dikhenge → har chapter ke Easy/Medium/Hard/Advanced tests banao.
        </p>

        {message && (
          <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg px-4 py-3">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : subjects.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-6 py-8 text-center">
            <p className="font-medium mb-1">Koi subject nahi mila</p>
            <p className="text-sm">
              Terminal mein <code className="bg-white px-1.5 py-0.5 rounded">npm run seed:subjects</code> chalao
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {subjects.map((subj) => {
              const totalPublished = subj.chapters.reduce((sum, c) => sum + (c.publishedTests || 0), 0);
              const totalDrafts = subj.chapters.reduce((sum, c) => sum + (c.draftTests || 0), 0);
              return (
                <button
                  key={subj._id}
                  onClick={() => setSelectedSubject(subj)}
                  className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 text-left hover:border-brand hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{subj.icon || "📘"}</span>
                    <div>
                      <p className="font-semibold text-ink text-lg group-hover:text-brand transition-colors">
                        {subj.name}
                      </p>
                      <p className="text-xs text-slate-400">{subj.chapters.length} chapters</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-emerald-600 font-medium">{totalPublished} published</span>
                    {totalDrafts > 0 && <span className="text-amber-600 font-medium">{totalDrafts} draft</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ---------- VIEW 2: Chapters of the selected subject ----------
  return (
    <div>
      <button
        onClick={() => {
          setSelectedSubject(null);
          setOpenChapter(null);
          setMessage("");
        }}
        className="text-sm text-brand hover:underline mb-3"
      >
        ← Saare Subjects
      </button>

      <div className="flex items-center gap-3 mb-1">
        <span className="text-3xl">{selectedSubject.icon || "📘"}</span>
        <h1 className="font-display text-2xl font-bold text-ink">{selectedSubject.name}</h1>
      </div>
      <p className="text-slate-500 mb-6">
        Chapter pe click karo → uske tests dikhenge aur naye bana sakte ho. Har chapter mein 4 levels: Easy → Advanced.
      </p>

      {message && (
        <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg px-4 py-3">{message}</div>
      )}

      {genBusy && (
        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="inline-block w-4 h-4 border-2 border-amber-300 border-t-amber-700 rounded-full animate-spin"></span>
          Test ban raha hai... 10-30 second lag sakte hain. Page band mat karo.
        </div>
      )}

      <div className="space-y-3">
        {selectedSubject.chapters.map((ch) => {
          const isOpen = openChapter?.name === ch.name;
          return (
            <div key={ch.name} className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => openChapterPanel(ch)}
                className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
              >
                <div>
                  <p className="font-semibold text-ink">{ch.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {ch.publishedTests || 0} published
                    {ch.draftTests > 0 && ` · ${ch.draftTests} draft`}
                    {(ch.topics?.length || 0) > 0 && ` · ${ch.topics.length} topics`}
                  </p>
                </div>
                <span className="text-slate-400">{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 p-5 bg-slate-50">
                  <p className="text-xs font-medium text-slate-600 mb-2">Naya test banao (level choose karo):</p>
                  <div className="flex gap-2 flex-wrap mb-5">
                    {LEVELS.map((level) => {
                      const busy = genBusy === `${ch.name}-${level}`;
                      return (
                        <button
                          key={level}
                          onClick={() => generate(ch, level)}
                          disabled={!!genBusy}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium capitalize transition-colors disabled:opacity-50 inline-flex items-center gap-2 ${LEVEL_COLORS[level]}`}
                        >
                          {busy ? (
                            <>
                              <span className="inline-block w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></span>
                              Ban raha...
                            </>
                          ) : (
                            `+ ${level}`
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-xs font-medium text-slate-600 mb-2">Is chapter ke tests:</p>
                  {testsLoading ? (
                    <p className="text-sm text-slate-400">Loading...</p>
                  ) : chapterTests.length === 0 ? (
                    <p className="text-sm text-slate-400">Koi test nahi. Upar se banao.</p>
                  ) : (
                    <div className="space-y-2">
                      {chapterTests.map((t) => (
                        <div
                          key={t._id}
                          className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap"
                        >
                          <div>
                            <p className="font-medium text-ink text-sm">{t.title}</p>
                            <p className="text-xs text-slate-400">
                              <span className="capitalize">{t.difficultyLevel}</span> ·{" "}
                              <span
                                className={t.publishStatus === "published" ? "text-emerald-600" : "text-amber-600"}
                              >
                                {t.publishStatus}
                              </span>
                              {t.publishStatus === "published" && (
                                <span className={t.isFree ? "text-emerald-600" : "text-brand"}>
                                  {" "}
                                  · {t.isFree ? "FREE" : "Premium"}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openReview(t._id)}
                              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                            >
                              👁 Review
                            </button>
                            {t.publishStatus === "draft" && (
                              <>
                                <button
                                  onClick={() => publishTest(t._id, true)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium"
                                >
                                  Publish FREE
                                </button>
                                <button
                                  onClick={() => publishTest(t._id, false)}
                                  className="px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-xs font-medium"
                                >
                                  Publish Premium
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => deleteTest(t._id)}
                              className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-slate-400 mt-4">
                    💡 Har chapter ke pehle 2 test <b>FREE</b> rakho, baaki <b>Premium</b>.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Review modal - check every question before publishing */}
      {(reviewTest || reviewLoading) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-ink">{reviewTest?.title || "Loading..."}</h3>
                {reviewTest && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {reviewTest.questions?.length || 0} questions · <span className="capitalize">{reviewTest.difficultyLevel}</span> ·{" "}
                    {reviewTest.publishStatus}
                  </p>
                )}
              </div>
              <button onClick={() => setReviewTest(null)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">
                ×
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {reviewLoading ? (
                <p className="text-slate-400 text-sm">Loading questions...</p>
              ) : reviewTest?.questions?.length === 0 ? (
                <p className="text-slate-400 text-sm">Is test mein koi question nahi.</p>
              ) : (
                <div className="space-y-4">
                  {reviewTest?.questions?.map((q, idx) => (
                    <div key={q._id} className="border border-slate-100 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="font-medium text-ink text-sm">
                          <span className="text-slate-400 mr-1.5">Q{idx + 1}.</span>
                          {q.text}
                        </p>
                        <button
                          onClick={() => removeQuestion(reviewTest._id, q._id)}
                          className="shrink-0 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium"
                        >
                          Hatao
                        </button>
                      </div>

                      {q.textHi && <p className="text-xs text-slate-500 mb-2 pl-6">{q.textHi}</p>}

                      <div className="grid grid-cols-2 gap-1.5 mb-2 pl-6">
                        {q.options?.map((opt, i) => (
                          <div
                            key={i}
                            className={`text-sm px-2 py-1 rounded ${
                              i === q.correctIndex
                                ? "bg-emerald-50 text-emerald-800 font-medium"
                                : "text-slate-500"
                            }`}
                          >
                            {String.fromCharCode(65 + i)}. {opt} {i === q.correctIndex && "✓"}
                          </div>
                        ))}
                      </div>

                      {q.solution && (
                        <p className="text-xs text-slate-500 pl-6">
                          <b className="text-slate-700">Solution:</b> {q.solution}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {reviewTest && reviewTest.publishStatus === "draft" && (
              <div className="p-5 border-t border-slate-100 flex gap-3">
                <button
                  onClick={() => {
                    publishTest(reviewTest._id, true);
                    setReviewTest(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium"
                >
                  Publish FREE
                </button>
                <button
                  onClick={() => {
                    publishTest(reviewTest._id, false);
                    setReviewTest(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium"
                >
                  Publish Premium
                </button>
                <button
                  onClick={() => setReviewTest(null)}
                  className="px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium"
                >
                  Band Karo
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}