import { useEffect, useState } from "react";
import api from "../api/axios";
import { useToast } from "./Toast";
import { Badge, Modal } from "./ui";

// The AI quality desk: the AI checks every uploaded or edited question, and
// the whole bank on request. What it finds wrong it explains, then mends or
// replaces with a new question of the same topic and level. In "Admin
// approval" mode each correction waits here for Apply / Dismiss; in
// "Automatic" mode it is applied on its own. Every change is in the
// question's history and can be undone.
const L = "ABCD";

export default function QualityDesk({ refreshKey = 0 }) {
  const toast = useToast();
  const [s, setS] = useState(null);
  const [fixes, setFixes] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [chapter, setChapter] = useState("");
  const [deleted, setDeleted] = useState(null);
  const [applied, setApplied] = useState(null);

  async function load() {
    try {
      const r = await api.get("/quality/settings");
      setS(r.data);
      if (open || r.data.pending) {
        const f = await api.get("/quality/fixes", { params: { status: "pending", limit: 50 } });
        setFixes(f.data.fixes || []);
      }
    } catch (err) {
      // The rest of the page still works without the desk.
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  async function setMode(mode) {
    if (mode === "auto") {
      const ok = await toast.confirm({
        title: "Let the AI correct questions on its own?",
        message:
          "Each correction is still checked by the quality gate before it goes live, and every change is kept in the question's history so you can undo it.",
        confirmLabel: "Turn on",
      });
      if (!ok) return;
    }
    try {
      const r = await api.put("/quality/settings", { mode });
      toast.success(r.data.message || "Saved");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't save");
    }
  }

  async function setChecks(on) {
    try {
      await api.put("/quality/settings", { checkCsvUploads: on });
      load();
    } catch (err) {
      toast.error("Couldn't save");
    }
  }

  async function decide(fix, how) {
    setBusy(fix._id);
    try {
      const r = await api.post(`/quality/fixes/${fix._id}/${how}`);
      toast.success(r.data.message || (how === "apply" ? "Applied" : "Dismissed"));
      setFixes((f) => f.filter((x) => x._id !== fix._id));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "That didn't work");
    } finally {
      setBusy("");
    }
  }

  async function audit(restart) {
    setBusy("audit");
    try {
      const r = await api.post("/quality/audit-bank", { restart });
      toast.success(r.data.message);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't start the audit");
    } finally {
      setBusy("");
    }
  }

  async function exportCsv() {
    setBusy("export");
    try {
      const r = await api.get("/quality/export", { params: chapter.trim() ? { chapter: chapter.trim() } : {} });
      const rows = r.data.rows || [];
      if (!rows.length) return toast.error("No questions to export");
      downloadCsv(rows, `questions-${(chapter.trim() || "all").replace(/\W+/g, "-")}.csv`);
      toast.success(`${rows.length} questions exported`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Export failed");
    } finally {
      setBusy("");
    }
  }

  async function showApplied() {
    try {
      const r = await api.get("/quality/fixes", { params: { status: "applied", limit: 100 } });
      setApplied(r.data.fixes || []);
    } catch (err) {
      toast.error("Couldn't load the corrections");
    }
  }
  async function undo(fix) {
    const ok = await toast.confirm({
      title: "Undo this correction?",
      message: fix.kind === "replace" ? "The original question goes back into its tests and the new one is retired." : "The question goes back to how it was before the correction.",
      confirmLabel: "Undo",
    });
    if (!ok) return;
    try {
      const r = await api.post(`/quality/fixes/${fix._id}/undo`);
      toast.success(r.data.message || "Undone");
      setApplied((list) => list.filter((x) => x._id !== fix._id));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't undo it");
    }
  }

  async function showDeleted() {
    try {
      const r = await api.get("/quality/deleted");
      setDeleted(r.data.deleted || []);
    } catch (err) {
      toast.error("Couldn't load deleted questions");
    }
  }
  async function bringBack(d) {
    try {
      const r = await api.post(`/quality/questions/${d.question}/restore`, { revisionId: d.revisionId });
      toast.success(r.data.message || "Brought back - it is in Needs review");
      setDeleted((list) => list.filter((x) => x.revisionId !== d.revisionId));
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't bring it back");
    }
  }

  if (!s) return null;
  const a = s.audit || {};

  return (
    <div className="rv-card p-5 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-ink">AI quality desk</h3>
          <p className="text-xs text-slate-soft mt-0.5 max-w-xl">
            The AI checks every uploaded and edited question: the answer, the solution, the language and repeats. What
            is wrong it explains and corrects, or replaces with a new question of the same topic and level.
          </p>
        </div>
        <div className="flex rounded-lg bg-slate-light p-0.5 text-xs font-medium">
          {[
            ["approval", "Admin approval"],
            ["auto", "Automatic"],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => s.mode !== k && setMode(k)}
              className={`px-3 py-1.5 rounded-md ${s.mode === k ? "bg-brand text-white" : "text-slate hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-slate mt-3">
        <input type="checkbox" checked={!!s.checkCsvUploads} onChange={(e) => setChecks(e.target.checked)} />
        AI checks every question uploaded by spreadsheet or edited (in the background, with the generation queue)
      </label>

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <button onClick={() => { setOpen(!open); if (!open) load(); }} className="rv-btn-secondary !text-xs">
          {s.pending ? `${s.pending} correction(s) waiting for you` : "No corrections waiting"}
        </button>
        <button onClick={() => audit(false)} disabled={busy === "audit" || a.running} className="rv-btn-secondary !text-xs disabled:opacity-50">
          {a.running ? `Bank audit running · ${a.checked || 0} checked` : a.finishedAt ? "Audit the bank again" : a.checked ? `Continue bank audit (${a.checked} checked)` : "Audit the whole bank"}
        </button>
        {a.checked > 0 && !a.running && (
          <button onClick={() => audit(true)} disabled={busy === "audit"} className="text-xs text-slate underline">
            start over
          </button>
        )}
        <span className="mx-1 h-5 w-px bg-border-soft" />
        <input value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="Chapter (blank = all)" className="rv-input !py-1.5 !text-xs max-w-[170px]" />
        <button onClick={exportCsv} disabled={busy === "export"} className="rv-btn-secondary !text-xs disabled:opacity-50">
          {busy === "export" ? "Exporting..." : "Export CSV"}
        </button>
        <button onClick={showApplied} className="rv-btn-secondary !text-xs">
          Corrections made
        </button>
        <button onClick={showDeleted} className="rv-btn-secondary !text-xs">
          Deleted questions
        </button>
      </div>
      {a.finishedAt && !a.running && (
        <p className="text-xs text-success mt-2">Last bank audit finished {new Date(a.finishedAt).toLocaleString("en-IN")} · {a.checked} checked</p>
      )}

      {open && (
        <div className="mt-4 space-y-3">
          {fixes.length === 0 && <p className="text-sm text-slate-soft">Nothing waiting.</p>}
          {fixes.map((f) => (
            <FixCard key={f._id} fix={f} busy={busy === f._id} onApply={() => decide(f, "apply")} onDismiss={() => decide(f, "dismiss")} />
          ))}
        </div>
      )}

      <Modal open={!!applied} onClose={() => setApplied(null)} title="Corrections made" subtitle="Applied by you or, in automatic mode, by the AI. Any of them can be undone.">
        {applied?.length === 0 && <p className="text-sm text-slate-soft">No corrections yet.</p>}
        <div className="space-y-3">
          {(applied || []).map((f) => (
            <div key={f._id} className="border border-border-soft rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-soft">
                  {f.kind === "replace" ? "Replaced" : "Corrected"} by {f.decidedBy === "ai" ? "the AI" : "the admin"} · {new Date(f.decidedAt || f.updatedAt).toLocaleString("en-IN")}
                </p>
                <button onClick={() => undo(f)} className="rv-btn-secondary !text-xs shrink-0">
                  Undo
                </button>
              </div>
              <p className="text-xs text-danger mt-1">{(f.problems || []).join("; ")}</p>
              <p className="text-sm text-ink mt-1"><span className="text-slate-soft">Was: </span>{f.question?.text}</p>
              {f.replacement && <p className="text-sm text-ink mt-1"><span className="text-slate-soft">Now: </span>{f.replacement.text}</p>}
            </div>
          ))}
        </div>
      </Modal>

      <Modal open={!!deleted} onClose={() => setDeleted(null)} title="Deleted questions" subtitle="A copy of each is kept. Bring one back and it goes to Needs review.">
        {deleted?.length === 0 && <p className="text-sm text-slate-soft">Nothing deleted.</p>}
        <div className="space-y-2">
          {(deleted || []).map((d) => (
            <div key={d.revisionId} className="border border-border-soft rounded-lg p-3">
              <p className="text-sm text-ink">{d.text}</p>
              <div className="flex items-center justify-between mt-2 gap-2">
                <p className="text-xs text-slate-soft">
                  {d.topic} · {new Date(d.at).toLocaleString("en-IN")} · {d.note}
                </p>
                <button onClick={() => bringBack(d)} className="rv-btn-secondary !text-xs shrink-0">
                  Bring back
                </button>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function FixCard({ fix, busy, onApply, onDismiss }) {
  const q = fix.question;
  const n = fix.replacement;
  const label = fix.kind === "replace" ? "Replace with a new question" : fix.kind === "fix" ? "Correct it" : "Needs you";
  return (
    <div className="border border-border-soft rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Badge tone={fix.kind === "flag" ? "warn" : "brand"}>{label}</Badge>
        <span className="text-xs text-slate-soft">from {fix.source} · {new Date(fix.createdAt).toLocaleString("en-IN")}</span>
      </div>
      <ul className="text-xs text-danger space-y-0.5 mb-2">
        {(fix.problems || []).map((p, i) => (
          <li key={i}>• {p}</li>
        ))}
      </ul>
      {fix.aiSaid && <p className="text-xs text-slate mb-2"><b>AI:</b> {fix.aiSaid}</p>}

      {q ? (
        <div className="text-sm bg-slate-light/60 rounded p-2.5">
          <p className="text-xs text-slate-soft mb-1">Now · {q.topic} · {q.difficulty} · {q.status}</p>
          <p className="text-ink">{q.text}</p>
          <p className="text-xs text-slate mt-1">{(q.options || []).map((o, i) => `${L[i]}. ${o}${i === q.correctIndex ? " ✓" : ""}`).join("   ")}</p>
          {fix.kind === "fix" && <p className="text-xs text-slate mt-1"><b>Solution:</b> {q.solution}</p>}
        </div>
      ) : (
        <p className="text-xs text-slate-soft">The question no longer exists.</p>
      )}

      {fix.kind === "fix" && fix.proposed && (
        <div className="text-sm bg-success-light/50 rounded p-2.5 mt-2 space-y-1">
          <p className="text-xs text-success font-semibold">Corrected</p>
          {Object.entries(fix.proposed).map(([k, v]) => (
            <p key={k} className="text-xs text-ink">
              <b>{k}:</b> {Array.isArray(v) ? v.join(" | ") : String(v)}
            </p>
          ))}
        </div>
      )}
      {fix.kind === "replace" && n && (
        <div className="text-sm bg-success-light/50 rounded p-2.5 mt-2">
          <p className="text-xs text-success font-semibold mb-1">New question · {n.topic} · {n.difficulty}</p>
          <p className="text-ink">{n.text}</p>
          <p className="text-xs text-slate mt-1">{(n.options || []).map((o, i) => `${L[i]}. ${o}${i === n.correctIndex ? " ✓" : ""}`).join("   ")}</p>
          <p className="text-xs text-slate mt-1"><b>Solution:</b> {n.solution}</p>
        </div>
      )}

      <div className="flex gap-2 mt-3">
        {fix.kind !== "flag" && (
          <button onClick={onApply} disabled={busy} className="rv-btn-primary !text-xs disabled:opacity-50">
            Apply
          </button>
        )}
        <button onClick={onDismiss} disabled={busy} className="rv-btn-secondary !text-xs disabled:opacity-50">
          {fix.kind === "flag" ? "Seen" : "Dismiss"}
        </button>
      </div>
    </div>
  );
}

// A cell a spreadsheet would run as a formula (=, @, or + / - not followed by
// a plain number) is written with a leading ' so it opens as text.
function safeCell(v) {
  let s = v == null ? "" : String(v);
  if (/^[=@\t\r]/.test(s) || (/^[+-]/.test(s) && !/^[+-]\d+(\.\d+)?$/.test(s))) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(rows, name) {
  const cols = Object.keys(rows[0]);
  const text = "﻿" + [cols.join(","), ...rows.map((r) => cols.map((c) => safeCell(r[c])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
