import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { useToast } from "./Toast";

// One practice question typed in by hand - into an existing test, or into a
// new test made on the spot. It goes through the same endpoint and the same
// checks as the spreadsheet upload (practice/manual-csv): a row whose test is
// "Chapter · Topic · Level #N" creates that test if it does not exist yet.
// Every question is checked first and saved only when the admin says so.

const LEVELS = ["Easy", "Medium", "Hard", "Advanced"];
// Practice levels -> the question's own difficulty (no "advanced" there).
const DIFFICULTY = { Easy: "easy", Medium: "medium", Hard: "hard", Advanced: "hard" };
const MIXED = "Mixed Practice";
const EMPTY_Q = {
  question: "", optionA: "", optionB: "", optionC: "", optionD: "", correct: "A", solution: "",
  questionHi: "", optionAHi: "", optionBHi: "", optionCHi: "", optionDHi: "", solutionHi: "",
};

export default function PracticeManualAdd({ subjects = [], fullSize = 20 }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [topic, setTopic] = useState(MIXED);
  const [level, setLevel] = useState("Easy");
  const [testTitle, setTestTitle] = useState(""); // "" = a new test
  const [tests, setTests] = useState([]);
  const [q, setQ] = useState(EMPTY_Q);
  const [showHindi, setShowHindi] = useState(false);
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState("");

  const subjectDoc = subjects.find((s) => s.name === subject);
  const chapterDoc = subjectDoc?.chapters?.find((c) => c.name === chapter);
  // The server hides a topic named like its chapter; it is the chapter itself.
  const topics = useMemo(() => [MIXED, ...((chapterDoc?.topics || []).filter((t) => t !== chapter))], [chapterDoc, chapter]);

  useEffect(() => {
    setTests([]);
    setTestTitle("");
    if (!subject || !chapter) return;
    api
      .get(`/exam-series/practice/${encodeURIComponent(subject)}/${encodeURIComponent(chapter)}`)
      .then((r) => setTests(r.data.tests || []))
      .catch(() => setTests([]));
  }, [subject, chapter]);

  // The tests of this topic and level, and the number a new one would get.
  const lv = level.toLowerCase();
  const sameKind = tests.filter(
    (t) => t.difficultyLevel === lv && (topic === MIXED ? !t.subtopic : t.subtopic === topic)
  );
  const nextNumber = sameKind.reduce((m, t) => Math.max(m, t.seriesNumber || 0), 0) + 1;
  const newTitle = `${chapter} · ${topic} · ${level} #${nextNumber}`;
  const target = testTitle || newTitle;
  const targetTest = sameKind.find((t) => t.title === testTitle);

  useEffect(() => setTestTitle(""), [topic, level]);

  const set = (k) => (e) => {
    setQ((x) => ({ ...x, [k]: e.target.value }));
    setReport(null);
  };

  const row = () => ({
    test: target,
    subject,
    topic: topic === MIXED ? chapter : topic,
    difficulty: DIFFICULTY[level],
    ...q,
  });

  const ready = subject && chapter && q.question.trim() && q.optionA.trim() && q.optionB.trim() && q.optionC.trim() && q.optionD.trim();

  async function send(dryRun) {
    setBusy(dryRun ? "check" : "add");
    try {
      const res = await api.post("/exam-series/practice/manual-csv", { rows: [row()], dryRun });
      setReport(res.data);
      if (!dryRun) {
        if (res.data.added) {
          toast.success(`Added to ${target}`);
          setQ(EMPTY_Q);
          setReport(null);
          setTestTitle(target); // keep adding to the same test
          const r = await api.get(`/exam-series/practice/${encodeURIComponent(subject)}/${encodeURIComponent(chapter)}`);
          setTests(r.data.tests || []);
        } else toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "The check failed");
    } finally {
      setBusy("");
    }
  }

  const field = "rv-input !py-2 text-sm";
  const canAdd = report?.dryRun && report.wouldAdd > 0 && !report.rejected?.length;

  return (
    <div className="rv-card p-5 mb-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <p className="font-semibold text-ink">Add a practice question by hand</p>
          <p className="text-sm text-slate">Type one question into an existing test or start a new test. Checked first, added only when you say.</p>
        </div>
        <button className="rv-btn-primary !px-3 !py-1.5 !text-[13px]" onClick={() => setOpen(!open)}>
          {open ? "Close" : "Add manually"}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-4">
          {/* Where it goes */}
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            <select className={field} value={subject} onChange={(e) => { setSubject(e.target.value); setChapter(""); setTopic(MIXED); }}>
              <option value="">Subject...</option>
              {subjects.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
            <select className={field} value={chapter} onChange={(e) => { setChapter(e.target.value); setTopic(MIXED); }} disabled={!subject}>
              <option value="">Chapter...</option>
              {(subjectDoc?.chapters || []).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <select className={field} value={topic} onChange={(e) => setTopic(e.target.value)} disabled={!chapter}>
              {topics.map((t) => <option key={t} value={t}>{t === MIXED ? "Whole chapter (Mixed Practice)" : t}</option>)}
            </select>
            <select className={field} value={level} onChange={(e) => setLevel(e.target.value)} disabled={!chapter}>
              {LEVELS.map((l) => <option key={l}>{l}</option>)}
            </select>
            <select className={field} value={testTitle} onChange={(e) => setTestTitle(e.target.value)} disabled={!chapter}>
              <option value="">+ New test (#{nextNumber})</option>
              {sameKind.map((t) => (
                <option key={t._id} value={t.title}>
                  #{t.seriesNumber} · {t.questionCount}/{fullSize} · {t.publishStatus}
                </option>
              ))}
            </select>
          </div>
          {chapter && (
            <p className="text-xs text-slate">
              Goes to <b className="text-ink">{target}</b>
              {targetTest ? ` — ${targetTest.questionCount} of ${fullSize} questions so far` : " — a new draft test"}. A draft is published by
              itself when it reaches {fullSize} questions.
            </p>
          )}

          {/* The question */}
          <div className="grid gap-2.5">
            <textarea className={`${field} min-h-[70px]`} placeholder="Question (English)" value={q.question} onChange={set("question")} />
            <div className="grid gap-2.5 sm:grid-cols-2">
              {["A", "B", "C", "D"].map((k) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="radio" name="correct" checked={q.correct === k} onChange={() => { setQ((x) => ({ ...x, correct: k })); setReport(null); }} />
                  <input className={field} placeholder={`Option ${k}`} value={q[`option${k}`]} onChange={set(`option${k}`)} />
                </label>
              ))}
            </div>
            <p className="text-xs text-slate -mt-1">Select the circle next to the correct option.</p>
            <textarea className={`${field} min-h-[60px]`} placeholder="Solution (step by step)" value={q.solution} onChange={set("solution")} />

            <button type="button" className="text-left text-sm font-medium text-brand" onClick={() => setShowHindi(!showHindi)}>
              {showHindi ? "▾" : "▸"} Hindi version (recommended)
            </button>
            {showHindi && (
              <div className="grid gap-2.5">
                <textarea className={`${field} min-h-[60px]`} placeholder="प्रश्न (हिंदी)" value={q.questionHi} onChange={set("questionHi")} />
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {["A", "B", "C", "D"].map((k) => (
                    <input key={k} className={field} placeholder={`विकल्प ${k}`} value={q[`option${k}Hi`]} onChange={set(`option${k}Hi`)} />
                  ))}
                </div>
                <textarea className={`${field} min-h-[50px]`} placeholder="हल (हिंदी)" value={q.solutionHi} onChange={set("solutionHi")} />
              </div>
            )}
          </div>

          {report && (
            <div className="text-sm space-y-2">
              <p className="font-medium text-ink">{report.message}</p>
              {report.rejected?.length > 0 && (
                <div className="bg-danger-light text-danger rounded p-2">{report.rejected.map((x, i) => <div key={i}>{x.errors.join("; ")}</div>)}</div>
              )}
              {report.warned?.length > 0 && (
                <div className="bg-warn-light text-warn rounded p-2">{report.warned.map((x, i) => <div key={i}>{x.warnings.join("; ")}</div>)}</div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button className="rv-btn-secondary !px-3 !py-1.5 !text-[13px]" disabled={!ready || !!busy} onClick={() => send(true)}>
              {busy === "check" ? "Checking..." : "Check question"}
            </button>
            <button className="rv-btn-primary !px-3 !py-1.5 !text-[13px]" disabled={!canAdd || !!busy} onClick={() => send(false)}>
              {busy === "add" ? "Adding..." : "Add to test"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
