import { useState } from "react";
import api from "../api/axios";
import { useToast } from "./Toast";

// One chapter against the plan: ten tests per topic per level, each full and
// live, no question repeated, every live question passing the rule gate.
// Everything it finds can be fixed with the practice spreadsheet - it hands
// out the sheet with the test and the question to replace already filled in.

const LEVEL_NAMES = { easy: "Easy", medium: "Medium", hard: "Hard", advanced: "Advanced" };
const WHOLE = "Whole chapter";
// The spreadsheet's columns (see PracticeCsvUpload), then two to read from.
const COLUMNS = [
  "test", "subject", "topic", "difficulty", "question", "optionA", "optionB", "optionC", "optionD", "correct",
  "formula", "solution", "questionHi", "optionAHi", "optionBHi", "optionCHi", "optionDHi", "solutionHi",
  "replaces", "replaceReason", "current", "problem",
];
const GRADE = { easy: "easy", medium: "medium", hard: "hard", advanced: "hard" };

function toCsv(rows) {
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [COLUMNS.join(","), ...rows.map((r) => COLUMNS.map((c) => esc(r[c])).join(","))].join("\r\n");
}
function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// "Number System · Unit Digit · Easy #3" - the title a spreadsheet row uses
// to make a test that does not exist yet.
const titleOf = (chapter, topic, level, n) =>
  `${chapter} · ${topic === WHOLE ? "Mixed Practice" : topic} · ${LEVEL_NAMES[level]} #${n}`;

export default function ChapterHealth({ subject, chapter }) {
  const toast = useToast();
  const [h, setH] = useState(null);
  const [busy, setBusy] = useState(false);

  async function check() {
    setBusy(true);
    try {
      const res = await api.get("/questions/chapter-health", { params: { chapter } });
      setH(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't check the chapter");
    } finally {
      setBusy(false);
    }
  }

  const missingTitles = () => {
    const out = [];
    for (const [topic, row] of Object.entries(h.grid)) {
      for (const level of h.levels) {
        const have = new Set(row[level]?.numbers || []);
        for (let n = 1; n <= h.testsPerLevel; n++) if (!have.has(n)) out.push({ topic, level, title: titleOf(chapter, topic, level, n) });
      }
    }
    return out;
  };

  // Twenty empty rows for every missing test, test column filled in.
  function sheetForMissing() {
    const rows = missingTitles().flatMap(({ topic, level, title }) =>
      Array.from({ length: h.testSize }, () => ({ test: title, subject, topic: topic === WHOLE ? chapter : topic, difficulty: GRADE[level] }))
    );
    download(`${chapter} - missing tests.csv`, toCsv(rows));
  }

  // One row per question to replace: test and id filled in, the old question
  // alongside so the new one can be written against it.
  function sheetForFixes() {
    const rows = [];
    for (const r of h.repeats) {
      if (!r.replace.tests.length) continue;
      rows.push({ test: r.replace.tests[0], subject, replaces: r.replace._id, replaceReason: "Repeat", current: r.replace.text, problem: `repeats: ${r.keep.text}` });
    }
    for (const q of h.ruleFailures) {
      if (!q.tests.length) continue;
      rows.push({ test: q.tests[0], subject, replaces: q._id, replaceReason: "Failed the quality check", current: q.text, problem: q.issues.join("; ") });
    }
    download(`${chapter} - questions to replace.csv`, toCsv(rows));
  }

  const cellClass = (c) =>
    !c || c.tests === 0 ? "text-danger" : c.missing || c.full < c.tests || c.live < c.tests ? "text-warn" : "text-success";

  return (
    <div className="rv-card p-5 mb-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <p className="font-semibold text-ink">Chapter health</p>
          <p className="text-xs text-slate-soft">
            {`${chapter} against the plan: 10 tests per topic per level, ${h?.testSize || 20} questions each, nothing repeated.`}
          </p>
        </div>
        <button onClick={check} disabled={busy} className="rv-btn-primary disabled:opacity-60">
          {busy ? "Checking..." : h ? "Check again" : "Check chapter"}
        </button>
      </div>

      {h && (
        <>
          <div className="overflow-x-auto mt-4">
            <table className="text-sm min-w-full">
              <thead>
                <tr className="text-left text-slate-soft">
                  <th className="pr-4 py-1 font-medium">Topic</th>
                  {h.levels.map((l) => (
                    <th key={l} className="pr-4 py-1 font-medium">{LEVEL_NAMES[l]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(h.grid).map(([topic, row]) => (
                  <tr key={topic} className="border-t border-border">
                    <td className="pr-4 py-1 text-ink">{topic}</td>
                    {h.levels.map((l) => {
                      const c = row[l];
                      return (
                        <td key={l} className={`pr-4 py-1 ${cellClass(c)}`} title={c ? `${c.full} full, ${c.live} live` : "none"}>
                          {c ? `${c.tests}/${h.testsPerLevel}` : `0/${h.testsPerLevel}`}
                          {c && (c.full < c.tests || c.live < c.tests) ? " !" : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-ink-soft flex flex-wrap gap-x-5 gap-y-1">
            <span className={h.missingTests ? "text-danger font-medium" : ""}>Tests missing {h.missingTests}</span>
            <span className={h.testProblems.length ? "text-warn font-medium" : ""}>Tests with a problem {h.testProblems.length}</span>
            <span className={h.repeats.length ? "text-danger font-medium" : ""}>Repeated questions {h.repeats.length}</span>
            <span className={h.ruleFailures.length ? "text-danger font-medium" : ""}>Failing the quality check {h.ruleFailures.length}</span>
            <span className={h.notation.length ? "text-warn font-medium" : ""}>Keyboard maths (2^5, *) {h.notation.length}</span>
            <span>Live questions {h.liveQuestions}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {h.missingTests > 0 && (
              <button onClick={sheetForMissing} className="rv-btn-secondary text-sm">
                Download sheet for the {h.missingTests} missing tests
              </button>
            )}
            {h.repeats.length + h.ruleFailures.length > 0 && (
              <button onClick={sheetForFixes} className="rv-btn-secondary text-sm">
                Download sheet of questions to replace
              </button>
            )}
          </div>
          <p className="text-xs text-slate-soft mt-2">
            Fill the sheet in and upload it with "Fill practice tests from a spreadsheet". A row with "replaces" takes that
            question's place; the check refuses a question the chapter already has.
          </p>

          {[
            ["Tests with a problem", h.testProblems.map((t) => ({ k: t._id, a: t.title, b: t.problems.join("; ") }))],
            ["Repeated questions", h.repeats.map((r) => ({ k: r.replace._id, a: r.replace.text, b: `repeats: ${r.keep.text}${r.replace.tests.length ? ` · in ${r.replace.tests.join(", ")}` : ""}` }))],
            ["Failing the quality check", h.ruleFailures.map((q) => ({ k: q._id, a: q.text, b: q.issues.join("; ") }))],
            ["Keyboard maths", h.notation.map((q) => ({ k: q._id, a: q.text, b: q.tests.join(", ") }))],
          ]
            .filter(([, items]) => items.length)
            .map(([title, items]) => (
              <details key={title} className="mt-3">
                <summary className="text-sm cursor-pointer text-ink">{`${title} (${items.length})`}</summary>
                <ul className="mt-2 space-y-2 text-xs text-ink-soft max-h-72 overflow-y-auto">
                  {items.map((x) => (
                    <li key={x.k} className="border-l-2 border-border-strong pl-2">
                      <p>{x.a}</p>
                      <p className="text-slate-soft">{x.b}</p>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
        </>
      )}
    </div>
  );
}
