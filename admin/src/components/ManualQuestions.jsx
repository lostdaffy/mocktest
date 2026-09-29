import { useMemo, useState } from "react";
import api from "../api/axios";
import { useToast } from "./Toast";

// Questions a person wrote - a human-made mock, or a past paper typed in
// because the PDF extractor could not read the scan. Opened from the mock
// review and from a past paper's review; the server does the same thing for
// both (server/services/manualQuestions.js).
//
// Two ways in. One at a time for a correction or a handful; a spreadsheet for
// a whole paper. The spreadsheet is always checked first and nothing is saved
// until the admin has seen what the check found - a 100-row file with a
// mistake in row 63 should be fixed in the file, not discovered in the app.

const COLUMNS = [
  "subject", "topic", "question", "optionA", "optionB", "optionC", "optionD", "correct",
  "solution", "difficulty", "questionHi", "optionAHi", "optionBHi", "optionCHi", "optionDHi", "solutionHi",
];

const EXAMPLE_ROWS = [
  {
    subject: "Maths", topic: "Percentage",
    question: "What is 15% of 240?", optionA: "36", optionB: "32", optionC: "40", optionD: "30",
    correct: "A", solution: "15% of 240 = 0.15 x 240 = 36", difficulty: "easy",
    questionHi: "240 का 15% कितना है?", optionAHi: "36", optionBHi: "32", optionCHi: "40", optionDHi: "30",
    solutionHi: "240 का 15% = 0.15 x 240 = 36",
  },
  {
    subject: "English", topic: "Spelling",
    question: "Choose the correctly spelt word.", optionA: "Accomodate", optionB: "Accommodate",
    optionC: "Acommodate", optionD: "Acomodate", correct: "B", solution: "", difficulty: "medium",
  },
];

// RFC 4180: quoted fields may hold commas, quotes ("") and line breaks - a
// question with a comma in it is the normal case, not an edge case.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

function toCsv(rows) {
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [COLUMNS.join(","), ...rows.map((r) => COLUMNS.map((c) => esc(r[c])).join(","))].join("\r\n");
}

// Headers are matched loosely: "Option A", "option_a" and "optionA" are the
// same column to a person filling in a sheet.
const normaliseHeader = (h) => {
  const k = String(h).toLowerCase().replace(/[^a-z]/g, "");
  return COLUMNS.find((c) => c.toLowerCase() === k) || null;
};

export default function ManualQuestions({ endpoint, sections = [], title, onClose, onAdded }) {
  const toast = useToast();
  const [mode, setMode] = useState("one");

  return (
    <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-surface rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border-soft">
          <div>
            <h3 className="font-semibold text-ink">Add questions by hand</h3>
            <p className="text-xs text-slate-soft mt-0.5">{title}</p>
          </div>
          <button onClick={onClose} className="text-slate-soft hover:text-slate text-2xl leading-none">×</button>
        </div>

        <div className="px-5 pt-4 flex gap-2">
          {[["one", "One at a time"], ["file", "Upload a spreadsheet"]].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setMode(k)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${mode === k ? "bg-brand text-white" : "bg-slate-light text-slate"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {mode === "one" ? (
            <OneQuestion endpoint={endpoint} sections={sections} toast={toast} onAdded={onAdded} />
          ) : (
            <FromFile endpoint={endpoint} sections={sections} toast={toast} onAdded={onAdded} />
          )}
        </div>
      </div>
    </div>
  );
}

const blank = (subject = "") => ({
  subject, topic: "", question: "", optionA: "", optionB: "", optionC: "", optionD: "",
  correct: "A", solution: "", difficulty: "medium",
  questionHi: "", optionAHi: "", optionBHi: "", optionCHi: "", optionDHi: "", solutionHi: "",
});

function OneQuestion({ endpoint, sections, toast, onAdded }) {
  const [q, setQ] = useState(blank(sections[0] || ""));
  const [showHindi, setShowHindi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const set = (patch) => { setFeedback(null); setQ((x) => ({ ...x, ...patch })); };

  async function save() {
    setSaving(true);
    try {
      const res = await api.post(endpoint, { questions: [q] });
      const d = res.data;
      if (d.rejected?.length) {
        setFeedback({ kind: "error", lines: d.rejected[0].errors });
        return;
      }
      onAdded?.();
      if (d.warned?.length) {
        // Saved - it was the admin's call - but say what the gate would have.
        setFeedback({ kind: "warn", lines: d.warned[0].warnings });
        toast.success("Added - have a look at the notes below");
      } else {
        toast.success("Question added");
      }
      // Keep the subject and topic: the next question is usually the same section.
      setQ((x) => ({ ...blank(x.subject), topic: x.topic }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't add the question");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {feedback && (
        <div className={`text-xs rounded-lg px-3 py-2 space-y-0.5 ${feedback.kind === "error" ? "bg-danger-light text-danger" : "bg-warn-light text-warn"}`}>
          <p className="font-semibold">{feedback.kind === "error" ? "Not saved:" : "Saved, but check:"}</p>
          {feedback.lines.map((l, i) => <p key={i}>• {l}</p>)}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Labelled label="Section / subject">
          {sections.length ? (
            <select value={q.subject} onChange={(e) => set({ subject: e.target.value })} className="rv-input">
              {sections.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <input value={q.subject} onChange={(e) => set({ subject: e.target.value })} className="rv-input" placeholder="Maths" />
          )}
        </Labelled>
        <Labelled label="Topic">
          <input value={q.topic} onChange={(e) => set({ topic: e.target.value })} className="rv-input" placeholder="Percentage" />
        </Labelled>
      </div>

      <Labelled label="Question">
        <textarea rows={3} value={q.question} onChange={(e) => set({ question: e.target.value })} className="rv-input !py-2" />
      </Labelled>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {["A", "B", "C", "D"].map((k) => (
          <Labelled key={k} label={`Option ${k}${q.correct === k ? " ✓ correct" : ""}`}>
            <input value={q[`option${k}`]} onChange={(e) => set({ [`option${k}`]: e.target.value })} className="rv-input" />
          </Labelled>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Labelled label="Correct option">
          <select value={q.correct} onChange={(e) => set({ correct: e.target.value })} className="rv-input">
            {["A", "B", "C", "D"].map((k) => <option key={k}>{k}</option>)}
          </select>
        </Labelled>
        <Labelled label="Difficulty">
          <select value={q.difficulty} onChange={(e) => set({ difficulty: e.target.value })} className="rv-input">
            {["easy", "medium", "hard"].map((k) => <option key={k}>{k}</option>)}
          </select>
        </Labelled>
      </div>

      <Labelled label="Solution (leave blank if the paper has none)">
        <textarea rows={2} value={q.solution} onChange={(e) => set({ solution: e.target.value })} className="rv-input !py-2" />
      </Labelled>

      <button onClick={() => setShowHindi((v) => !v)} className="text-sm text-brand hover:underline">
        {showHindi ? "Hide Hindi" : "+ Add Hindi version"}
      </button>
      {showHindi && (
        <div className="space-y-3 border-l-2 border-border-soft pl-3">
          <Labelled label="Question (Hindi)">
            <textarea rows={2} value={q.questionHi} onChange={(e) => set({ questionHi: e.target.value })} className="rv-input !py-2" />
          </Labelled>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {["A", "B", "C", "D"].map((k) => (
              <Labelled key={k} label={`Option ${k} (Hindi)`}>
                <input value={q[`option${k}Hi`]} onChange={(e) => set({ [`option${k}Hi`]: e.target.value })} className="rv-input" />
              </Labelled>
            ))}
          </div>
          <Labelled label="Solution (Hindi)">
            <textarea rows={2} value={q.solutionHi} onChange={(e) => set({ solutionHi: e.target.value })} className="rv-input !py-2" />
          </Labelled>
        </div>
      )}

      <button onClick={save} disabled={saving} className="rv-btn-primary w-full disabled:opacity-60">
        {saving ? "Adding..." : "Add question"}
      </button>
    </div>
  );
}

function FromFile({ endpoint, sections, toast, onAdded }) {
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState("");
  const [headerProblem, setHeaderProblem] = useState("");
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState("");

  function downloadTemplate() {
    const example = EXAMPLE_ROWS.map((r) => ({ ...r, subject: sections.includes(r.subject) ? r.subject : sections[0] || r.subject }));
    // The BOM is what makes Excel open Hindi as Hindi rather than as mojibake.
    const blob = new Blob(["﻿" + toCsv(example)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "rankveer-questions-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function readFile(file) {
    setReport(null);
    setHeaderProblem("");
    setFileName(file.name);
    const text = await file.text();
    const table = parseCsv(text);
    if (table.length < 2) { setRows([]); setHeaderProblem("The file has no rows under the header."); return; }
    const header = table[0].map(normaliseHeader);
    const missing = ["question", "optionA", "optionB", "optionC", "optionD", "correct"].filter((c) => !header.includes(c));
    if (missing.length) {
      setRows(null);
      setHeaderProblem(`These columns are missing: ${missing.join(", ")}. Start from the template.`);
      return;
    }
    setRows(table.slice(1).map((cells) => Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""]).filter(([h]) => h))));
  }

  async function send(dryRun) {
    setBusy(dryRun ? "check" : "save");
    try {
      const res = await api.post(endpoint, { questions: rows, dryRun });
      setReport(res.data);
      if (!dryRun) {
        toast.success(res.data.message);
        onAdded?.();
        setRows(null);
        setFileName("");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "That didn't work");
    } finally {
      setBusy("");
    }
  }

  const checked = report?.dryRun;

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate space-y-1">
        <p>
          Fill the template in Excel or Google Sheets, one question per row, in the order they should appear.
          <b> Correct</b> is A, B, C or D (or 1-4, where 1 is the first option).
        </p>
        <p className="text-xs text-slate-soft">
          With Hindi in it, save from Excel as <b>CSV UTF-8</b> - a plain CSV turns Hindi into question marks.
          Leave <b>solution</b> blank for a real paper that has none; students will be told so.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={downloadTemplate} className="rv-btn-secondary">Download template</button>
        <label className="rv-btn-secondary cursor-pointer">
          {fileName ? "Choose another file" : "Choose CSV file"}
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files[0] && readFile(e.target.files[0])} />
        </label>
        {fileName && <span className="text-sm text-slate-soft">{fileName} · {rows?.length ?? 0} rows</span>}
      </div>

      {headerProblem && <p className="text-sm bg-danger-light text-danger rounded-lg px-3 py-2">{headerProblem}</p>}

      {rows?.length > 0 && (
        <div className="flex gap-2">
          <button onClick={() => send(true)} disabled={!!busy} className="rv-btn-secondary disabled:opacity-60">
            {busy === "check" ? "Checking..." : `Check ${rows.length} rows`}
          </button>
          {checked && report.wouldAdd > 0 && (
            <button onClick={() => send(false)} disabled={!!busy} className="rv-btn-primary disabled:opacity-60">
              {busy === "save" ? "Adding..." : `Add ${report.wouldAdd} question${report.wouldAdd === 1 ? "" : "s"}`}
            </button>
          )}
        </div>
      )}

      {report && <Report report={report} />}
    </div>
  );
}

function Report({ report }) {
  const verb = report.dryRun ? "would be added" : "added";
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-soft">Row numbers match your spreadsheet - the header is row 1.</p>
      <p className="text-sm font-medium text-ink">
        {report.dryRun ? report.wouldAdd : report.added} of {report.checked} {verb}
        {report.dryRun && report.rejected.length > 0 && " - fix the rows below in your file, or add the rest now and those later"}
      </p>

      {report.rejected.length > 0 && (
        <div className="border border-danger/30 rounded-lg overflow-hidden">
          <p className="text-xs font-semibold bg-danger-light text-danger px-3 py-1.5">Can't be saved ({report.rejected.length})</p>
          <RowList items={report.rejected.map((r) => ({ ...r, notes: r.errors }))} />
        </div>
      )}

      {report.warned.length > 0 && (
        <div className="border border-warn/30 rounded-lg overflow-hidden">
          <p className="text-xs font-semibold bg-warn-light text-warn px-3 py-1.5">
            {report.dryRun ? "Will be added, but worth a look" : "Added, but worth a look"} ({report.warned.length})
          </p>
          <RowList items={report.warned.map((r) => ({ ...r, notes: r.warnings }))} />
        </div>
      )}
    </div>
  );
}

function RowList({ items }) {
  const shown = useMemo(() => items.slice(0, 50), [items]);
  return (
    <div className="divide-y divide-border-soft max-h-64 overflow-y-auto">
      {shown.map((r) => (
        <div key={r.row} className="px-3 py-2 text-xs">
          <p className="text-ink"><b>Row {r.row + 1}</b> · {r.text || "—"}</p>
          <p className="text-slate">{r.notes.join(" · ")}</p>
        </div>
      ))}
      {items.length > shown.length && <p className="px-3 py-2 text-xs text-slate-soft">…and {items.length - shown.length} more</p>}
    </div>
  );
}

function Labelled({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink-soft mb-1.5">{label}</label>
      {children}
    </div>
  );
}
