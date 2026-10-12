import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { PageHeader } from "../components/ui";
import { useToast } from "../components/Toast";
import QuestionVisual from "../components/QuestionVisual";
import { useGenerationActivity, useGenerationFinished, useJobs } from "../context/GenerationActivity";

const LEVELS = ["easy", "medium", "hard", "advanced"];
// A practice test holds this many questions (the server sends its own number
// with the subject list; this is only the fallback). The server refuses to
// publish one that holds fewer, so the buttons here refuse too - a student
// should never open a test with a hole in it.
let FULL_TEST = 20;
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
  const [shortTests, setShortTests] = useState(0);
  const [loading, setLoading] = useState(true);

  // Three screens - subjects, a subject's chapters, one chapter's tests - kept
  // in the URL (?subject=&chapter=) so the browser's Back button walks back
  // through them and a page can be reloaded or shared where it stands.
  const [params, setParams] = useSearchParams();
  const selectedSubject = subjects.find((s) => s.name === params.get("subject")) || null;
  const openChapter = selectedSubject?.chapters.find((c) => c.name === params.get("chapter")) || null;
  const [chapterSearch, setChapterSearch] = useState("");
  const [chapterTests, setChapterTests] = useState([]);
  const [testsLoading, setTestsLoading] = useState(false);

  const [genBusy, setGenBusy] = useState(null); // "chapter-level" key while generating
  const [message, setMessage] = useState("");

  // Review modal: shows every question of a test so admin can check quality
  const [reviewTest, setReviewTest] = useState(null);
  const [refilling, setRefilling] = useState(false);
  const [fillingShort, setFillingShort] = useState(false);
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
      message:
        `It comes out of this test. If no other test is using it, it is deleted from the bank as well, and a replacement is generated to keep the test at ${FULL_TEST}.`,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    try {
      const res = await api.delete(`/exam-series/mock/${testId}/question/${questionId}`);
      toast.success(res.data?.message || "Question removed");
      openReview(testId); // refresh the review
      setChapterTests((tests) =>
        tests.map((t) => (t._id === testId ? { ...t, questionCount: Math.max(0, (t.questionCount || 1) - 1) } : t))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't remove the question");
    }
  }

  // Generate fresh questions for a test the admin has taken questions out of.
  // They go through the same quality gate as any other, and are checked
  // against what the chapter has already asked - so a replacement is never a
  // reworded copy of a question still sitting in the test.
  async function addReplacements(testId, missing) {
    setRefilling(true);
    try {
      const res = await api.post(`/exam-series/practice/${testId}/add-questions`, { count: missing });
      toast.success(res.data?.message || "Questions added");
      openReview(testId);
      load({ silent: true });
      if (openChapter) loadChapterTests(selectedSubject.name, openChapter.name);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't add questions");
    } finally {
      setRefilling(false);
    }
  }

  // silent: refresh the counts in the background without blanking the page.
  // Every publish/delete used to trigger a full "Loading..." re-render of
  // the whole subject list, which is what made the screen feel slow.
  async function load({ silent = false } = {}) {
    if (!silent) setLoading(true);
    try {
      const res = await api.get("/exam-series/subjects/list");
      if (res.data.testSize) FULL_TEST = res.data.testSize;
      setShortTests(res.data.shortTests || 0);
      setSubjects(res.data.subjects);
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

  // Opening a chapter's page (or landing on one from a reload) fetches its tests.
  const subjectName = selectedSubject?.name;
  const chapterName = openChapter?.name;
  useEffect(() => {
    if (!subjectName || !chapterName) {
      setChapterTests([]);
      return;
    }
    loadChapterTests(subjectName, chapterName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectName, chapterName]);

  function goSubject(name) {
    setMessage("");
    setChapterSearch("");
    setParams({ subject: name });
  }
  function goChapter(name) {
    setMessage("");
    setParams({ subject: selectedSubject.name, chapter: name });
  }

  const visibleChapters = useMemo(() => {
    const q = chapterSearch.trim().toLowerCase();
    const list = selectedSubject?.chapters || [];
    return q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list;
  }, [selectedSubject, chapterSearch]);

  // A new test is built on the Generation queue: twenty questions in two
  // batches of ten is longer than this page should hang for, and the queue
  // waits out the AI allowance instead of failing. What is queued for this
  // chapter shows on the page (useJobs below); when one finishes, the page
  // re-reads itself and a notification says so, wherever the admin is.
  const { activity: queue, refresh: refreshQueue } = useGenerationActivity();
  const queuePaused = !!queue?.paused;
  const subjectJobs = useJobs((j) => (j.kind === "practice" || j.kind === "top_up") && j.subject === subjectName);
  const chapterJobs = subjectJobs.filter((j) => j.chapter === chapterName);
  const topUpJobs = new Map(chapterJobs.filter((j) => j.kind === "top_up" && j.testId).map((j) => [String(j.testId), j]));
  useGenerationFinished((job) => {
    if (job.kind !== "practice" && job.kind !== "top_up") return;
    load({ silent: true });
    if (job.subject === subjectName && job.chapter === chapterName) loadChapterTests(subjectName, chapterName);
  });

  async function generate(chapter, difficulty, subtopic) {
    setGenBusy(`${chapter.name}-${subtopic || ""}-${difficulty}`);
    setMessage("");
    try {
      const res = await api.post("/generation/enqueue-practice", {
        subject: selectedSubject.name,
        chapter: chapter.name,
        subtopic: subtopic || undefined,
        difficulty,
      });
      toast.success(res.data.message);
      refreshQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't queue the test");
    } finally {
      setGenBusy(null);
    }
  }

  // Every practice test below its size - mostly the ones built when a test
  // held 12 - queued to be filled up. A published test stays live meanwhile.
  async function fillShort(testId) {
    setFillingShort(true);
    try {
      const res = await api.post("/generation/enqueue-short", testId ? { testId } : {});
      toast.success(res.data?.message || "Queued");
      refreshQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn’t queue the short tests");
    } finally {
      setFillingShort(false);
    }
  }

  // Back to draft. Questions are untouched - this only decides whether
  // students can see it. Needed because a published test is locked for
  // editing, so without this a test that went out short would stay short.
  async function unpublishTest(testId) {
    try {
      const res = await api.patch(`/exam-series/practice/${testId}/unpublish`);
      toast.success(res.data?.message || "Taken off the app");
      setChapterTests((tests) =>
        tests.map((t) => (t._id === testId ? { ...t, publishStatus: "draft" } : t))
      );
      setReviewTest((r) => (r && r._id === testId ? { ...r, publishStatus: "draft" } : r));
      load({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't take it off the app");
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
      load({ silent: true });
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
      load({ silent: true });
    } catch (err) {
      toast.error("Delete failed");
    }
  }

  // ---------- VIEW 1: Subject grid ----------
  if (!selectedSubject) {
    return (
      <div>
        {shortTests > 0 && <FillShortBanner count={shortTests} onFill={() => fillShort()} busy={fillingShort} />}

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
                  onClick={() => goSubject(subj.name)}
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

  // ---------- VIEW 2: A subject's chapters, as square cards ----------
  // A subject holds up to 20-odd chapters. As rows with the tests opening
  // inline, the page ran on for screens; cards keep a whole subject in view,
  // and a chapter's tests get a page of their own.
  if (!openChapter) {
    return (
      <div>
        <PageHeader
          backTo="/practice-series"
          backLabel="All subjects"
          eyebrow="Subject Practice"
          title={`${selectedSubject.icon || "📘"} ${selectedSubject.name}`}
          subtitle="Open a chapter to see its tests and build new ones. Each chapter has 4 levels: Easy → Advanced."
          actions={
            <input
              value={chapterSearch}
              onChange={(e) => setChapterSearch(e.target.value)}
              placeholder="Search chapters..."
              className="rv-input w-56"
            />
          }
        />

        {message && (
          <div className="mb-6 bg-info-light border border-info-border text-info text-sm rounded-lg px-4 py-3">{message}</div>
        )}

        {visibleChapters.length === 0 ? (
          <p className="text-sm text-slate-soft">No chapter matches “{chapterSearch}”.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {visibleChapters.map((ch) => {
              const number = selectedSubject.chapters.indexOf(ch) + 1;
              const queued = subjectJobs.filter((j) => j.chapter === ch.name);
              return (
                <button
                  key={ch.name}
                  onClick={() => goChapter(ch.name)}
                  className="rv-card aspect-square p-4 flex flex-col text-left hover:border-brand hover:shadow-card transition-all group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="w-8 h-8 rounded-lg bg-brand-light text-brand text-xs font-bold flex items-center justify-center">
                      {String(number).padStart(2, "0")}
                    </span>
                    <span className="flex items-center gap-1">
                      {queued.length > 0 && (
                        <span
                          className="text-[11px] font-medium text-info bg-info-light px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                          title={queued.some((j) => j.position === 0) ? "Being built now" : "Waiting on the Generation queue"}
                        >
                          {queued.some((j) => j.position === 0) && (
                            <span className="inline-block w-2.5 h-2.5 border-2 border-info-border border-t-info rounded-full animate-spin" />
                          )}
                          {queued.length} queued
                        </span>
                      )}
                      {ch.draftTests > 0 && (
                        <span className="text-[11px] font-medium text-warn bg-warn-light px-1.5 py-0.5 rounded">
                          {ch.draftTests} draft
                        </span>
                      )}
                    </span>
                  </div>

                  <p className="mt-3 font-semibold text-ink leading-snug line-clamp-3 group-hover:text-brand transition-colors">
                    {ch.name}
                  </p>
                  <p className="text-xs text-slate-soft mt-1">
                    {ch.publishedTests || 0} published
                    {(ch.topics?.length || 0) > 0 && ` · ${ch.topics.length} topics`}
                  </p>

                  {/* One cell per level, so a gap (no Hard test yet) shows at a glance */}
                  <div className="mt-auto grid grid-cols-4 gap-1">
                    {LEVELS.map((level) => {
                      const c = ch.levels?.[level] || { published: 0, draft: 0 };
                      const total = c.published + c.draft;
                      return (
                        <span
                          key={level}
                          title={`${level}: ${c.published} published, ${c.draft} draft`}
                          className={`text-[10px] font-semibold text-center rounded py-1 capitalize ${
                            total ? LEVEL_BADGES[level] : "bg-slate-light text-slate-soft"
                          }`}
                        >
                          {level.slice(0, 1)} {total}
                        </span>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ---------- VIEW 3: One chapter's tests, level by level ----------
  const ch = openChapter;
  const openLevel = LEVELS.includes(params.get("level")) ? params.get("level") : "easy";
  // Tests arrive newest first; show them in the order they were built,
  // "… - Easy #1" first, so the card number matches the title.
  const testNumber = (t) => Number((t.title || "").match(/#(\d+)\s*$/)?.[1]) || 0;
  // Which series is open: the whole chapter, or one of its topics (the
  // chapter's topics as set in Subjects). Each has its own four levels.
  // A topic named like the chapter itself ("Percentage" in Percentage) is
  // the whole chapter again, not a series of its own.
  const subtopics = (ch.topics || []).filter((t) => t.trim().toLowerCase() !== ch.name.trim().toLowerCase());
  const openSub = subtopics.includes(params.get("sub")) ? params.get("sub") : "";
  const inSeries = (sub) => chapterTests.filter((t) => (t.subtopic || "") === sub);
  const seriesTests = inSeries(openSub);
  const levelTests = seriesTests
    .filter((t) => t.difficultyLevel === openLevel)
    .sort((x, y) => testNumber(x) - testNumber(y));
  function goLevel(level, sub = openSub) {
    setParams({ subject: selectedSubject.name, chapter: ch.name, ...(sub ? { sub } : {}), level }, { replace: true });
  }
  return (
    <div>
      <PageHeader
        backTo={`/practice-series?subject=${encodeURIComponent(selectedSubject.name)}`}
        backLabel={`${selectedSubject.name} chapters`}
        eyebrow={selectedSubject.name}
        title={ch.name}
        subtitle={`${ch.publishedTests || 0} published${ch.draftTests > 0 ? ` · ${ch.draftTests} draft` : ""}${
          (ch.topics?.length || 0) > 0 ? ` · topics: ${ch.topics.join(", ")}` : ""
        }`}
      />

      {message && (
        <div className="mb-6 bg-info-light border border-info-border text-info text-sm rounded-lg px-4 py-3">{message}</div>
      )}

      {chapterJobs.length > 0 && (
        <div className="mb-6 rounded-lg border border-info-border bg-info-light px-4 py-3">
          <p className="text-sm font-semibold text-info mb-2">
            In the queue for this chapter ({chapterJobs.length}) - each appears below when it is done; you can leave this page.
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
            {chapterJobs.map((j) => (
              <li key={j._id} className="flex items-center gap-2 text-sm text-ink-soft">
                {j.position === 0 ? (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-info-border border-t-info rounded-full animate-spin shrink-0" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-info-border shrink-0" />
                )}
                <span className="flex-1 min-w-0 truncate">
                  {j.kind === "top_up"
                    ? `Top up: ${j.testTitle || j.label}`
                    : `New ${j.difficulty || ""} test · ${j.subtopic || "Mixed Practice"}`}
                </span>
                <span className={`text-xs font-semibold shrink-0 ${j.position === 0 ? "text-info" : "text-slate-soft"}`}>
                  {j.position === 0 ? "Building now" : queuePaused ? `#${j.position} · paused` : `#${j.position} in line`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Whole chapter, or one of its topics. Each is its own series of tests. */}
      {subtopics.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-soft uppercase tracking-wide mb-2">Series</p>
          <div className="flex flex-wrap gap-2">
            {["", ...subtopics].map((sub) => {
              const n = inSeries(sub).length;
              const active = sub === openSub;
              return (
                <button
                  key={sub || "__chapter"}
                  onClick={() => goLevel(openLevel, sub)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    active ? "bg-brand text-white border-brand" : "bg-surface text-ink-soft border-border-soft hover:border-brand"
                  }`}
                >
                  {sub || "Whole chapter"}
                  <span className={`ml-1.5 text-xs ${active ? "text-white/80" : "text-slate-soft"}`}>{n}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* The four levels as cards - pick one, its tests open below as cards.
          A busy chapter holds 10+ tests a level; listing all four levels at
          once ran to several screens. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {LEVELS.map((level) => {
          const levelTests = seriesTests.filter((t) => t.difficultyLevel === level);
          const published = levelTests.filter((t) => t.publishStatus === "published").length;
          const active = level === openLevel;
          return (
            <button
              key={level}
              onClick={() => goLevel(level)}
              className={`rv-card p-4 text-left transition-all ${
                active ? "border-brand ring-2 ring-brand/40" : "hover:border-brand"
              }`}
            >
              <span className={`text-xs font-semibold px-2 py-0.5 rounded capitalize ${LEVEL_BADGES[level]}`}>{level}</span>
              <p className="font-display text-2xl font-extrabold text-ink mt-3">
                {testsLoading ? "…" : levelTests.length}
                <span className="text-sm font-medium text-slate-soft"> test{levelTests.length === 1 ? "" : "s"}</span>
              </p>
              <p className="text-xs text-slate-soft mt-0.5">
                {published} published{levelTests.length - published > 0 && ` · ${levelTests.length - published} draft`}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-display text-lg font-bold text-ink">
          <span className="capitalize">{openLevel}</span> tests{openSub && <span className="text-slate"> · {openSub}</span>}
        </h2>
        <button
          onClick={() => generate(ch, openLevel, openSub)}
          disabled={!!genBusy}
          className="px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-xs font-medium disabled:opacity-50 inline-flex items-center gap-2"
        >
          {genBusy === `${ch.name}-${openSub}-${openLevel}` ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
              Queueing...
            </>
          ) : (
            `+ Build ${openLevel} test (${FULL_TEST} Qs)`
          )}
        </button>
      </div>

      {testsLoading ? (
        <p className="text-sm text-slate-soft">Loading tests...</p>
      ) : levelTests.length === 0 ? (
        <p className="text-sm text-slate-soft">No {openLevel} test yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {levelTests.map((t, i) => {
            const short = typeof t.questionCount === "number" && t.questionCount < FULL_TEST;
            const topUp = topUpJobs.get(String(t._id));
            const btn = "px-2 py-1.5 rounded-lg text-[11px] font-medium text-center";
            return (
              <div key={t._id} className="rv-card aspect-square p-4 flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <span className="w-8 h-8 rounded-lg bg-brand-light text-brand text-xs font-bold flex items-center justify-center">
                    #{testNumber(t) || i + 1}
                  </span>
                  <span
                    className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                      t.publishStatus === "published"
                        ? t.isFree
                          ? "bg-success-light text-success"
                          : "bg-brand-light text-brand"
                        : "bg-warn-light text-warn"
                    }`}
                  >
                    {t.publishStatus === "published" ? (t.isFree ? "FREE" : "Premium") : "Draft"}
                  </span>
                </div>

                <p className="mt-3 font-semibold text-ink text-sm leading-snug line-clamp-2">{t.title}</p>
                <p className={`text-xs mt-1 ${short ? "text-warn" : "text-slate-soft"}`}>
                  {typeof t.questionCount === "number" ? `${t.questionCount} / ${FULL_TEST} questions` : ""}
                </p>
                {topUp && (
                  <p className="mt-1 text-[11px] font-semibold text-info flex items-center gap-1.5">
                    {topUp.position === 0 && (
                      <span className="inline-block w-3 h-3 border-2 border-info-border border-t-info rounded-full animate-spin" />
                    )}
                    {topUp.position === 0 ? "Topping up now…" : `Waiting to top up (#${topUp.position}${queuePaused ? ", paused" : ""})`}
                  </p>
                )}

                <div className="mt-auto grid grid-cols-2 gap-1.5">
                  <button onClick={() => openReview(t._id)} className={`${btn} bg-slate-light hover:bg-border-strong text-ink-soft`}>
                    👁 Review
                  </button>
                  <button onClick={() => deleteTest(t._id)} className={`${btn} bg-danger-light hover:opacity-80 text-danger`}>
                    Delete
                  </button>
                  {t.publishStatus === "draft" &&
                    (short ? (
                      <button
                        onClick={() => openReview(t._id)}
                        className={`${btn} col-span-2 bg-warn-light text-warn`}
                        title={`A test goes out with all ${FULL_TEST} questions. Open it and add the missing ones.`}
                      >
                        Add {FULL_TEST - t.questionCount} to publish
                      </button>
                    ) : (
                      <>
                        <button onClick={() => publishTest(t._id, true)} className={`${btn} bg-success hover:opacity-90 text-white`}>
                          Publish FREE
                        </button>
                        <button onClick={() => publishTest(t._id, false)} className={`${btn} bg-brand hover:bg-brand-dark text-white`}>
                          Premium
                        </button>
                      </>
                    ))}
                  {t.publishStatus === "published" && short && (
                    <button
                      onClick={() => fillShort(t._id)}
                      disabled={fillingShort || !!topUp}
                      className={`${btn} bg-warn-light text-warn disabled:opacity-60`}
                      title="Queues the missing questions on the Generation page; the test stays live meanwhile"
                    >
                      Top up to {FULL_TEST}
                    </button>
                  )}
                  {t.publishStatus === "published" && (
                    <button
                      onClick={() => unpublishTest(t._id)}
                      className={`${btn} ${short ? "" : "col-span-2"} bg-slate-light hover:bg-border-strong text-ink-soft`}
                      title="Take it off the app so its questions can be changed"
                    >
                      Unpublish
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-soft mt-6">
        💡 Keep the first 2 tests in each chapter <b>FREE</b>, the rest <b>Premium</b>.
      </p>

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
                    {(reviewTest.questions?.length || 0) < FULL_TEST && (
                      <span className="text-warn font-medium">
                        {" "}· {FULL_TEST - (reviewTest.questions?.length || 0)} short
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {reviewTest && reviewTest.publishStatus === "published" && (
                  <button
                    onClick={() => unpublishTest(reviewTest._id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-light hover:bg-border-strong text-ink-soft text-sm font-medium"
                  >
                    Unpublish to edit
                  </button>
                )}
                {reviewTest && (reviewTest.questions?.length || 0) < FULL_TEST && reviewTest.publishStatus !== "published" && (
                  <button
                    onClick={() => addReplacements(reviewTest._id, FULL_TEST - (reviewTest.questions?.length || 0))}
                    disabled={refilling}
                    className="px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium disabled:opacity-60"
                  >
                    {refilling ? "Adding..." : `+ Add ${FULL_TEST - (reviewTest.questions?.length || 0)} replacement(s)`}
                  </button>
                )}
                <button onClick={() => setReviewTest(null)} className="text-slate-soft hover:text-slate text-2xl leading-none">
                  ×
                </button>
              </div>
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
                      <QuestionVisual q={q} className="mb-2 pl-6" />

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
                {(reviewTest.questions?.length || 0) < FULL_TEST ? (
                  <p className="flex-1 text-sm text-warn self-center">
                    Add the last {FULL_TEST - (reviewTest.questions?.length || 0)} question
                    {FULL_TEST - (reviewTest.questions?.length || 0) === 1 ? "" : "s"} before publishing - a test goes out full.
                  </p>
                ) : (
                  <>
                <button
                  onClick={() => {
                    publishTest(reviewTest._id, true);
                    setReviewTest(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-success hover:opacity-90 text-white text-sm font-medium"
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
                  </>
                )}
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
// A test that is short says so here, with the one button that fixes it.
// Removal fills its own hole now, so this only ever holds the older ones -
// the purge of 127 untrustworthy answer keys left 26 live tests wanting.
function FillShortBanner({ count, onFill, busy }) {
  return (
    <div className="rv-card p-4 mb-6 flex items-center justify-between gap-4 flex-wrap border-l-4 border-l-warn">
      <p className="text-sm text-ink-soft">
        <b>
          {count} practice test{count === 1 ? "" : "s"} hold{count === 1 ? "s" : ""} fewer than {FULL_TEST} questions
        </b>{" "}
        - mostly ones built when a test held 12. Each press queues the next 10 on the Generation page, live tests
        first; a published test stays live while it fills. New questions pass the same quality gate and are checked
        against what the chapter has already asked.
      </p>
      <button onClick={onFill} disabled={busy} className="rv-btn-primary disabled:opacity-60 shrink-0">
        {busy ? "Queueing..." : `Top up next ${Math.min(10, count)} to ${FULL_TEST}`}
      </button>
    </div>
  );
}
