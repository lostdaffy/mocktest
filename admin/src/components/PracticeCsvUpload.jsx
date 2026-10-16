import { useState } from "react";
import api from "../api/axios";
import { useToast } from "./Toast";
import { parseCsv } from "./ManualQuestions";

// Practice tests filled from one spreadsheet. Each row says which test it
// goes to ("test" column: the test's id or exact title), so one file can
// fill a whole chapter. The file is always checked first; nothing is saved
// until the admin has seen what the check found.

const COLUMNS = [
  "test", "subject", "topic", "difficulty", "question", "optionA", "optionB", "optionC", "optionD", "correct",
  "formula", "solution", "questionHi", "optionAHi", "optionBHi", "optionCHi", "optionDHi", "solutionHi",
];
const norm = (h) => COLUMNS.find((c) => c.toLowerCase() === String(h).toLowerCase().replace(/[^a-z]/g, "")) || null;

function toCsv(header, rows) {
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [header.join(","), ...rows.map((r) => header.map((c) => esc(r[c])).join(","))].join("\r\n");
}

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PracticeCsvUpload() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState("");
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState("");

  async function downloadShortList() {
    setBusy("list");
    try {
      const res = await api.get("/generation/gaps");
      const short = (res.data.short || []).filter((s) => s.level !== "mock");
      const header = ["test", "title", "have", "need", ...COLUMNS.slice(1)];
      download("practice-tests-to-fill.csv", toCsv(header, short.map((s) => ({ test: s.testId, title: s.title, have: s.have, need: s.of - s.have }))));
    } catch {
      toast.error("Could not load the list");
    } finally {
      setBusy("");
    }
  }

  async function pick(file) {
    setReport(null);
    const text = await file.text();
    const table = parseCsv(text);
    const header = table[0].map(norm);
    if (!header.includes("test") || !header.includes("question")) {
      toast.error('The file needs at least a "test" and a "question" column');
      return;
    }
    const data = table.slice(1).map((cells) => Object.fromEntries(header.map((h, i) => [h, cells[i]]).filter(([h]) => h)));
    setRows(data);
    setFileName(file.name);
    check(data);
  }

  async function check(data = rows) {
    setBusy("check");
    try {
      const res = await api.post("/exam-series/practice/manual-csv", { rows: data, dryRun: true });
      setReport(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "The check failed");
    } finally {
      setBusy("");
    }
  }

  async function add() {
    setBusy("add");
    try {
      const res = await api.post("/exam-series/practice/manual-csv", { rows });
      setReport(res.data);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not add them");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="rv-card p-5 mb-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <p className="font-semibold text-ink">Fill practice tests from a spreadsheet</p>
          <p className="text-sm text-slate">One CSV for a whole chapter: each row names its test. Checked first, added only when you say.</p>
        </div>
        <div className="flex gap-2">
          <button className="rv-btn-secondary !px-3 !py-1.5 !text-[13px]" onClick={downloadShortList} disabled={!!busy}>
            {busy === "list" ? "Loading..." : "Download tests to fill"}
          </button>
          <button className="rv-btn-primary !px-3 !py-1.5 !text-[13px]" onClick={() => setOpen(!open)}>{open ? "Close" : "Upload CSV"}</button>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files[0] && pick(e.target.files[0])} className="block text-sm" />
          {busy === "check" && <p className="text-sm text-slate">Checking {fileName}...</p>}
          {report && (
            <div className="text-sm space-y-2">
              <p className="font-medium text-ink">{report.message}</p>
              <div className="max-h-40 overflow-auto border border-border rounded p-2">
                {report.tests.map((t) => (
                  <div key={t.testId} className="flex justify-between gap-2">
                    <span className="text-slate truncate">{t.title}</span>
                    <span className="text-ink shrink-0">{t.had} → {t.after} / {t.of}</span>
                  </div>
                ))}
              </div>
              {report.rejected.length > 0 && (
                <div className="max-h-48 overflow-auto bg-danger-light text-danger rounded p-2">
                  {report.rejected.map((x, i) => (
                    <div key={i}>Row {x.row}{x.test ? ` (${x.test})` : ""}: {x.errors.join("; ")}</div>
                  ))}
                </div>
              )}
              {report.warned.length > 0 && (
                <div className="max-h-32 overflow-auto bg-warn-light text-warn rounded p-2">
                  {report.warned.map((x, i) => (
                    <div key={i}>Row {x.row}: {x.warnings.join("; ")}</div>
                  ))}
                </div>
              )}
              {report.dryRun && report.wouldAdd > 0 && (
                <button className="rv-btn-primary !px-3 !py-1.5 !text-[13px]" onClick={add} disabled={!!busy}>
                  {busy === "add" ? "Adding..." : `Add ${report.wouldAdd} question(s)`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
