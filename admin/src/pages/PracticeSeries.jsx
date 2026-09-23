import { useEffect, useState } from "react";
import api from "../api/axios";
import { PageHeader } from "../components/ui";
import { useToast } from "../components/Toast";

const LEVELS = ["easy", "medium", "hard", "advanced"];
// Badge colours for the level headings in the grouped test list.
const LEVEL_BADGES = {
  easy: "bg-easy-bg text-easy",
  medium: "bg-medium-bg text-medium",
  hard: "bg-hard-bg text-hard",
  advanced: "bg-advanced-bg text-advanced",
};

export default function PracticeSeries() {
  const toast = useToast();
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
      toast.error("Couldn't load the review");
    } finally {
      setReviewLoading(false);
    }
  }

  // Remove a single bad question from the test
  async function removeQuestion(testId, questionId) {
    const ok = await toast.confirm({
      title: "Remove this question?",
      message: "It will be taken out of this test.",
      confirmLabel: "Remove",
    });
    if (!ok) return;
    try {
      await api.delete(`/exam-series/mock/${testId}/question/${questionId}`);
      openReview(testId); // refresh the review
      setChapterTests((tests) =>
        tests.map((t) => (t._id === testId ? { ...t, questionCount: Math.max(0, (t.questionCount || 1) - 1) } : t))
      );
    } catch (err) {
      toast.error("Couldn't remove the question");
    }
  }

  // silent: refresh the counts in the background without blanking the page.
  // Every publish/delete used to trigger a full "Loading..." re-render of
  // the whole subject list, which is what made the screen feel slow.
  async function load(keepSubjectName, { silent = false } = {}) {
    if (!silent) setLoading(true);
    try {
      const res = await api.get("/exam-series/subjects/list");
      setSubjects(res.data.subjects);
      const name = keepSubjectName || selectedSubject?.name;
      if (name) {
        const updated = res.data.subjects.find((s) => s.name === name);
        if (updated) setSelectedSubject(updated);
      }
    } catch (err) {
      if (!silent) setMessage("Couldn't load subjects. Is the backend running?");
    } finally {
      if (!silent) setLoading(false);
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
      load(selectedSubject.name, { silent: true });
    } catch (err) {
      setMessage("❌ " + (err.response?.data?.message || "Couldn't generate the test"));
    } finally {
      setGenBusy(null);
    }
  }

  async function publishTest(testId, isFree) {
    try {
      await api.patch(`/exam-series/practice/${testId}/publish`, { isFree });
      toast.success("Test published");
      // Update the row we already have instead of refetching the list.
      setChapterTests((tests) =>
        tests.map((t) => (t._id === testId ? { ...t, publishStatus: "published", isFree: !!isFree } : t))
      );
      load(selectedSubject.name, { silent: true });
    } catch (err) {
      toast.error("Publish failed: " + (err.response?.data?.message || ""));
    }
  }

  async function deleteTest(testId) {
    const ok = await toast.confirm({
      title: "Delete this test?",
      message: "This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/exam-series/mock/${testId}`);
      toast.success("Test deleted");
      setChapterTests((tests) => tests.filter((t) => t._id !== testId));
      load(selectedSubject.name, { silent: true });
    } catch (err) {
      toast.error("Delete failed");
    }
  }

  // ---------- VIEW 1: Subject grid ----------
  if (!selectedSubject) {
    return (
      <div>
        <PageHeader
          eyebrow="Content"
          title="Subject Practice"
          subtitle="Pick a subject to see its chapters, then build Easy/Medium/Hard/Advanced tests for each one."
        />

        {message && (
          <div className="mb-6 bg-info-light border border-info-border text-info text-sm rounded-lg px-4 py-3">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-slate-soft">Loading...</p>
        ) : subjects.length === 0 ? (
          <div className="bg-warn-light border border-warn-border text-warn rounded-lg px-6 py-8 text-center">
            <p className="font-medium mb-1">No subjects found</p>
            <p className="text-sm">
              Run <code className="bg-surface px-1.5 py-0.5 rounded">npm run seed:subjects</code> in the terminal
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
                  className="rv-card p-6 text-left hover:border-brand hover:shadow-card transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{subj.icon || "📘"}</span>
                    <div>
                      <p className="font-semibold text-ink text-lg group-hover:text-brand transition-colors">
                        {subj.name}
                      </p>
                      <p className="text-xs text-slate-soft">{subj.chapters.length} chapters</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-success font-medium">{totalPublished} published</span>
                    {totalDrafts > 0 && <span className="text-warn font-medium">{totalDrafts} draft</span>}
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
        ← All Subjects
      </button>

      <div className="flex items-center gap-3 mb-1">
        <span className="text-3xl">{selectedSubject.icon || "📘"}</span>
        <h1 className="font-display text-2xl font-bold text-ink">{selectedSubject.name}</h1>
      </div>
      <p className="text-slate mb-6">
        Click a chapter to see its tests and build new ones. Each chapter has 4 levels: Easy → Advanced.
      </p>

      {message && (
        <div className="mb-6 bg-info-light border border-info-border text-info text-sm rounded-lg px-4 py-3">{message}</div>
      )}

      {genBusy && (
        <div className="mb-6 bg-warn-light border border-warn-border text-warn text-sm rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="inline-block w-4 h-4 border-2 border-warn-border border-t-warn rounded-full animate-spin"></span>
          Building the test... this can take 10-30 seconds. Please don't close this page.
        </div>
      )}

      <div className="space-y-3">
        {selectedSubject.chapters.map((ch) => {
          const isOpen = openChapter?.name === ch.name;
          return (
            <div key={ch.name} className="rv-card overflow-hidden">
              <button
                onClick={() => openChapterPanel(ch)}
                className="w-full p-5 flex items-center justify-between hover:bg-slate-light transition-colors text-left"
              >
                <div>
                  <p className="font-semibold text-ink">{ch.name}</p>
                  <p className="text-xs text-slate-soft mt-0.5">
                    {ch.publishedTests || 0} published
                    {ch.draftTests > 0 && ` · ${ch.draftTests} draft`}
                    {(ch.topics?.length || 0) > 0 && ` · ${ch.topics.length} topics`}
                  </p>
                  {ch.levels && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {LEVELS.map((level) => {
                        const c = ch.levels[level] || { published: 0, draft: 0 };
                        const total = c.published + c.draft;
                        return (
                          <span
                            key={level}
                            className={`text-[11px] px-1.5 py-0.5 rounded capitalize ${
                              total ? LEVEL_BADGES[level] : "bg-slate-light text-slate-soft"
                            }`}
                            title={`${c.published} published, ${c.draft} draft`}
                          >
                            {level} {total}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <span className="text-slate-soft">{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div className="border-t border-border-soft p-5 bg-slate-light">
                  {testsLoading ? (
                    <p className="text-sm text-slate-soft">Loading tests...</p>
                  ) : (
                    <div className="space-y-4">
                      {/* One block per level, in the order students climb them,
                          instead of one list with all four mixed together. */}
                      {LEVELS.map((level) => {
                        const levelTests = chapterTests.filter((t) => t.difficultyLevel === level);
                        const busy = genBusy === `${ch.name}-${level}`;
                        return (
                          <div key={level} className="bg-surface border border-border rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border-soft">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded capitalize ${LEVEL_BADGES[level]}`}>
                                  {level}
                                </span>
                                <span className="text-xs text-slate-soft">
                                  {levelTests.length} test{levelTests.length === 1 ? "" : "s"}
                                  {levelTests.filter((t) => t.publishStatus === "published").length > 0 &&
                                    ` · ${levelTests.filter((t) => t.publishStatus === "published").length} published`}
                                </span>
                              </div>
                              <button
                                onClick={() => generate(ch, level)}
                                disabled={!!genBusy}
                                className="px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-xs font-medium disabled:opacity-50 inline-flex items-center gap-2"
                              >
                                {busy ? (
                                  <>
                                    <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                                    Building...
                                  </>
                                ) : (
                                  "+ Build test"
                                )}
                              </button>
                            </div>

                            {levelTests.length === 0 ? (
                              <p className="text-xs text-slate-soft px-4 py-3">No {level} test yet.</p>
                            ) : (
                              <div className="divide-y divide-border-soft">
                                {levelTests.map((t) => (
                                  <div key={t._id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                                    <div className="min-w-0">
                                      <p className="font-medium text-ink text-sm">{t.title}</p>
                                      <p className="text-xs text-slate-soft">
                                        {typeof t.questionCount === "number" && `${t.questionCount} questions · `}
                                        <span className={t.publishStatus === "published" ? "text-success" : "text-warn"}>
                                          {t.publishStatus}
                                        </span>
                                        {t.publishStatus === "published" && (
                                          <span className={t.isFree ? "text-success" : "text-brand"}>
                                            {" "}
                                            · {t.isFree ? "FREE" : "Premium"}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => openReview(t._id)}
                                        className="px-3 py-1.5 rounded-lg bg-slate-light hover:bg-border-strong text-ink-soft text-xs font-medium"
                                      >
                                        👁 Review
                                      </button>
                                      {t.publishStatus === "draft" && (
                                        <>
                                          <button
                                            onClick={() => publishTest(t._id, true)}
                                            className="px-3 py-1.5 rounded-lg bg-success-light0 hover:bg-success text-white text-xs font-medium"
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
                                        className="px-3 py-1.5 rounded-lg bg-danger-light hover:opacity-80 text-danger text-xs font-medium"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-xs text-slate-soft mt-4">
                    💡 Keep the first 2 tests in each chapter <b>FREE</b>, the rest <b>Premium</b>.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Review modal - check every question before publishing */}
      {(reviewTest || reviewLoading) && (
        <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border-soft">
              <div>
                <h3 className="font-semibold text-ink">{reviewTest?.title || "Loading..."}</h3>
                {reviewTest && (
                  <p className="text-xs text-slate-soft mt-0.5">
                    {reviewTest.questions?.length || 0} questions · <span className="capitalize">{reviewTest.difficultyLevel}</span> ·{" "}
                    {reviewTest.publishStatus}
                  </p>
                )}
              </div>
              <button onClick={() => setReviewTest(null)} className="text-slate-soft hover:text-slate text-2xl leading-none">
                ×
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {reviewLoading ? (
                <p className="text-slate-soft text-sm">Loading questions...</p>
              ) : reviewTest?.questions?.length === 0 ? (
                <p className="text-slate-soft text-sm">This test has no questions.</p>
              ) : (
                <div className="space-y-4">
                  {reviewTest?.questions?.map((q, idx) => (
                    <div key={q._id} className="border border-border-soft rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="font-medium text-ink text-sm">
                          <span className="text-slate-soft mr-1.5">Q{idx + 1}.</span>
                          {q.text}
                        </p>
                        <button
                          onClick={() => removeQuestion(reviewTest._id, q._id)}
                          className="shrink-0 px-2.5 py-1 rounded-lg bg-danger-light hover:bg-danger-light text-danger text-xs font-medium"
                        >
                          Remove
                        </button>
                      </div>

                      {q.textHi && <p className="text-xs text-slate mb-2 pl-6">{q.textHi}</p>}

                      <div className="grid grid-cols-2 gap-1.5 mb-2 pl-6">
                        {q.options?.map((opt, i) => (
                          <div
                            key={i}
                            className={`text-sm px-2 py-1 rounded ${
                              i === q.correctIndex
                                ? "bg-success-light text-success font-medium"
                                : "text-slate"
                            }`}
                          >
                            {String.fromCharCode(65 + i)}. {opt} {i === q.correctIndex && "✓"}
                          </div>
                        ))}
                      </div>

                      {q.solution && (
                        <p className="text-xs text-slate pl-6">
                          <b className="text-ink-soft">Solution:</b> {q.solution}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {reviewTest && reviewTest.publishStatus === "draft" && (
              <div className="p-5 border-t border-border-soft flex gap-3">
                <button
                  onClick={() => {
                    publishTest(reviewTest._id, true);
                    setReviewTest(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-success-light0 hover:bg-success text-white text-sm font-medium"
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
                  className="px-4 py-2.5 rounded-lg bg-slate-light hover:bg-border-strong text-slate text-sm font-medium"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}