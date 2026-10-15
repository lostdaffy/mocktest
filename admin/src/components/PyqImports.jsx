import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RiDownload2Line, RiUpload2Line, RiImageAddLine, RiRefreshLine, RiDeleteBinLine, RiEyeLine } from "@remixicon/react";
import api from "../api/axios";
import { Badge, Button, Alert, Modal } from "./ui";
import { useToast } from "./Toast";
import { imageUrl } from "./QuestionVisual";

// Past papers uploaded as PDFs: their reading, and the review before they go
// live. The server does the reading (a queue job) and decides what still
// needs a person - see server/services/pyqImport.js. This page only shows it
// and sends the admin's decisions back.

const FLAG_TEXT = {
  answer_mismatch: { label: "Paper key ≠ AI", tone: "warn", help: "The paper's answer and the AI's own solve disagree. Pick the right one." },
  no_answer: { label: "No answer key", tone: "danger", help: "The paper gives no answer. The AI's answer is only a suggestion - confirm or change it." },
  needs_figure: { label: "Needs picture", tone: "info", help: "Needs the figure from the paper. Upload a screenshot of it, or remove the question." },
  option_count: { label: "Not 4 options", tone: "danger", help: "The paper printed other than four options. Edit to exactly four, or remove it." },
  incomplete: { label: "Incomplete", tone: "danger", help: "The question or an option is empty." },
  mixed_script: { label: "Garbled text", tone: "danger", help: "Letters from another script got in. Correct the text." },
  passage_missing: { label: "Passage missing", tone: "danger", help: "It refers to a passage that is not with it. Paste the passage in, or remove it." },
};
const STEP_TEXT = { info: "Reading the cover", pages: "Reading pages", solve: "Checking answers", translate: "Translating", tag: "Tagging topics", done: "Finishing" };
const LETTERS = ["A", "B", "C", "D", "E"];
const letter = (i) => (i === null || i === undefined ? "-" : LETTERS[i]);
const dateText = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

/** The uploads of one exam, refreshing themselves while any is being read. */
export function PyqImportList({ examStage, reloadKey, onPublished }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    if (!examStage) return;
    try {
      const res = await api.get(`/pyq/imports`, { params: { examStage } });
      setItems(res.data.imports || []);
    } catch {
      /* the next refresh tries again */
    }
  }, [examStage]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const busy = items.some((i) => i.status === "queued" || i.status === "reading");
  useEffect(() => {
    if (!busy) return undefined;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [busy, load]);

  async function retry(id) {
    try {
      const res = await api.post(`/pyq/import/${id}/retry`);
      toast.success(res.data.message);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not retry");
    }
  }

  async function remove(item) {
    const ok = await toast.confirm({
      title: "Delete this upload?",
      message: "The PDF and everything read from it is deleted. Nothing published is touched.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/pyq/import/${item._id}`);
      toast.success("Upload deleted");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not delete");
    }
  }

  if (!items.length) return null;
  const active = items.filter((i) => i.status !== "published");

  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-slate mb-3">PDF uploads ({active.length} not yet published)</h2>
      <div className="space-y-3">
        {active.map((i) => (
          <div key={i._id} className="rv-card p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-ink truncate">{i.title || i.fileName || "Untitled paper"}</p>
              <p className="text-xs text-slate mt-0.5">
                {[dateText(i.examDate), i.shift, i.year, `${i.pages} pages`].filter(Boolean).join(" · ")}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                {i.status === "queued" && <Badge tone="neutral" dot>Waiting in the queue</Badge>}
                {i.status === "reading" && (
                  <Badge tone="info" dot>
                    {STEP_TEXT[i.step] || "Reading"}
                    {i.step === "pages" ? ` - page ${i.pagesDone} of ${i.pages}` : ""}
                  </Badge>
                )}
                {i.status === "failed" && <Badge tone="danger">Failed{i.error ? `: ${i.error.slice(0, 90)}` : ""}</Badge>}
                {i.status === "review" && (
                  <>
                    <Badge tone="success">{i.questions} questions read</Badge>
                    {i.needLook > 0 ? <Badge tone="warn">{i.needLook} need a look</Badge> : <Badge tone="success">Ready to publish</Badge>}
                    {i.missingNumbers?.length > 0 && <Badge tone="danger">Not found: Q {i.missingNumbers.slice(0, 8).join(", ")}{i.missingNumbers.length > 8 ? "…" : ""}</Badge>}
                  </>
                )}
                {i.error && i.status !== "failed" && <span className="text-xs text-warn">Paused: {i.error.slice(0, 80)}</span>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {i.status === "review" && (
                <Button size="sm" icon={RiEyeLine} onClick={() => setOpen(i._id)}>
                  Review
                </Button>
              )}
              {i.status === "failed" && (
                <Button size="sm" variant="secondary" icon={RiRefreshLine} onClick={() => retry(i._id)}>
                  Retry
                </Button>
              )}
              <Button size="sm" variant="ghost" icon={RiDeleteBinLine} onClick={() => remove(i)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
      {open && (
        <ImportReview
          id={open}
          onClose={() => {
            setOpen(null);
            load();
          }}
          onPublished={() => {
            setOpen(null);
            load();
            onPublished?.();
          }}
        />
      )}
    </div>
  );
}

// --------------------------------------------------------------------- review

function readFile(file, as) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("The file could not be read"));
    if (as === "text") r.readAsText(file, "utf-8");
    else r.readAsDataURL(file);
  });
}

// A screenshot shrunk to at most 1200px, WebP (or JPEG), before it is sent.
async function shrinkImage(file) {
  const src = await readFile(file, "dataUrl");
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("That file could not be read as a picture"));
    i.src = src;
  });
  const scale = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  let dataUrl = c.toDataURL("image/webp", 0.88);
  if (!dataUrl.startsWith("data:image/webp")) dataUrl = c.toDataURL("image/jpeg", 0.88);
  return { dataUrl, width: w, height: h };
}

function ImportReview({ id, onClose, onPublished }) {
  const toast = useToast();
  const [imp, setImp] = useState(null);
  const [filter, setFilter] = useState("look");
  const [busy, setBusy] = useState(null);
  const [problems, setProblems] = useState(null); // what the last publish / CSV said was wrong
  const csvInput = useRef(null);

  const load = useCallback(async () => {
    const res = await api.get(`/pyq/import/${id}`);
    setImp(res.data.import);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = imp?.rows || [];
  const counts = useMemo(() => {
    const c = { all: 0, look: 0, removed: 0 };
    for (const r of rows) {
      if (r.removed) {
        c.removed++;
        continue;
      }
      c.all++;
      if (r.flags.length) c.look++;
      for (const f of r.flags) c[f] = (c[f] || 0) + 1;
    }
    return c;
  }, [rows]);
  const shown = rows.filter((r) =>
    filter === "removed" ? r.removed : !r.removed && (filter === "all" || (filter === "look" ? r.flags.length : r.flags.includes(filter)))
  );

  function replaceRow(row) {
    setImp((cur) => ({ ...cur, rows: cur.rows.map((r) => (r._id === row._id ? row : r)) }));
  }

  async function saveRow(rowId, patch) {
    try {
      const res = await api.patch(`/pyq/import/${id}/row/${rowId}`, patch);
      replaceRow(res.data.row);
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save");
      return false;
    }
  }

  async function bulk(use, flag, label) {
    const ok = await toast.confirm({
      title: label,
      message:
        use === "paper"
          ? "Each of these takes the answer printed in the paper. Look at any you are unsure of first."
          : "Each of these takes the AI's own answer - the paper gives none. Look at any you are unsure of first.",
      confirmLabel: "Confirm all",
    });
    if (!ok) return;
    setBusy("bulk");
    try {
      const res = await api.post(`/pyq/import/${id}/confirm`, { use, flag });
      toast.success(res.data.message);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not confirm");
    } finally {
      setBusy(null);
    }
  }

  async function saveMeta(patch) {
    try {
      await api.patch(`/pyq/import/${id}`, patch);
      await load();
      toast.success("Saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save");
    }
  }

  async function downloadCsv() {
    setBusy("csv-down");
    try {
      const res = await api.get(`/pyq/import/${id}/csv`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(imp.title || "paper").replace(/[^\w\- ]+/g, "").trim() || "paper"}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download the sheet");
    } finally {
      setBusy(null);
    }
  }

  async function uploadCsv(file) {
    if (!file) return;
    setBusy("csv-up");
    setProblems(null);
    try {
      const csv = await readFile(file, "text");
      const check = await api.post(`/pyq/import/${id}/csv`, { csv, dryRun: true });
      const ok = await toast.confirm({
        title: "Apply this sheet?",
        message: `${check.data.rows} row(s) read cleanly. Apply the changes to the paper?`,
        confirmLabel: "Apply",
      });
      if (!ok) return;
      const res = await api.post(`/pyq/import/${id}/csv`, { csv });
      toast.success(res.data.message);
      await load();
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) setProblems({ title: data.message, lines: data.errors.map((e) => `Line ${e.line}: ${e.error}`) });
      else toast.error(data?.message || "Could not read the sheet");
    } finally {
      setBusy(null);
      if (csvInput.current) csvInput.current.value = "";
    }
  }

  async function publish() {
    setBusy("publish");
    setProblems(null);
    try {
      const res = await api.post(`/pyq/import/${id}/publish`);
      toast.success(res.data.message);
      onPublished();
    } catch (err) {
      const data = err.response?.data || {};
      const lines = data.open
        ? data.open.map((o) => `Q${o.number ?? "?"}: ${o.flags.map((f) => FLAG_TEXT[f]?.label || f).join(", ")}`)
        : data.rowErrors
        ? data.rowErrors.map((o) => `Q${o.number ?? "?"}: ${o.errors.join("; ")}`)
        : [];
      setProblems({ title: data.message || "Publish failed", lines });
      if (data.open) setFilter("look");
    } finally {
      setBusy(null);
    }
  }

  if (!imp) {
    return (
      <Modal open onClose={onClose} title="Loading..." size="lg">
        <p className="text-slate-soft">Loading...</p>
      </Modal>
    );
  }

  const chips = [
    ["look", "Need a look"],
    ...Object.keys(FLAG_TEXT).filter((f) => counts[f]).map((f) => [f, FLAG_TEXT[f].label]),
    ["all", "All"],
    ["removed", "Removed"],
  ];

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={imp.title || "Review paper"}
      subtitle={`${counts.all} questions · ${counts.look} need a look${imp.expectedCount ? ` · the paper says ${imp.expectedCount}` : ""}`}
      footer={
        <>
          <Button variant="secondary" size="sm" icon={RiDownload2Line} loading={busy === "csv-down"} onClick={downloadCsv}>
            Download CSV
          </Button>
          <Button variant="secondary" size="sm" icon={RiUpload2Line} loading={busy === "csv-up"} onClick={() => csvInput.current?.click()}>
            Upload edited CSV
          </Button>
          <input ref={csvInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => uploadCsv(e.target.files?.[0])} />
          <Button className="ml-auto" loading={busy === "publish"} disabled={counts.look > 0 || counts.all === 0} onClick={publish}>
            {counts.look > 0 ? `${counts.look} left to check` : "Publish paper"}
          </Button>
        </>
      }
    >
      <MetaEditor imp={imp} onSave={saveMeta} />

      {imp.missingNumbers?.length > 0 && (
        <Alert tone="danger" className="mb-4">
          Not found in the PDF: Q {imp.missingNumbers.join(", ")}. If the paper has them, add them through the CSV (a row without an id
          is a new question).
        </Alert>
      )}
      {problems && (
        <Alert tone="danger" className="mb-4">
          <b>{problems.title}</b>
          {problems.lines.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {problems.lines.slice(0, 20).map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        {chips.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${filter === key ? "bg-brand text-white border-brand" : "bg-surface text-slate border-border"}`}
          >
            {label} ({counts[key] || 0})
          </button>
        ))}
      </div>

      {(counts.answer_mismatch > 0 || counts.no_answer > 0) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {counts.answer_mismatch > 0 && (
            <Button size="sm" variant="secondary" loading={busy === "bulk"} onClick={() => bulk("paper", "answer_mismatch", `Use the paper's key for all ${counts.answer_mismatch}?`)}>
              Use paper's key for all {counts.answer_mismatch} mismatches
            </Button>
          )}
          {counts.no_answer > 0 && (
            <Button size="sm" variant="secondary" loading={busy === "bulk"} onClick={() => bulk("ai", "no_answer", `Use the AI's answer for all ${counts.no_answer}?`)}>
              Use AI's answer for all {counts.no_answer} without a key
            </Button>
          )}
        </div>
      )}

      <div className="space-y-3">
        {shown.length === 0 && <p className="text-sm text-slate-soft">Nothing here.</p>}
        {shown.map((r) => (
          <RowCard key={r._id} row={r} importId={id} onSave={(patch) => saveRow(r._id, patch)} onReplace={replaceRow} />
        ))}
      </div>
    </Modal>
  );
}

function MetaEditor({ imp, onSave }) {
  const [title, setTitle] = useState(imp.title || "");
  const [examDate, setExamDate] = useState(imp.examDate ? String(imp.examDate).slice(0, 10) : "");
  const [shift, setShift] = useState(imp.shift || "");
  const [year, setYear] = useState(imp.year || "");
  const dirty =
    title !== (imp.title || "") || examDate !== (imp.examDate ? String(imp.examDate).slice(0, 10) : "") || shift !== (imp.shift || "") || String(year) !== String(imp.year || "");
  return (
    <div className="rv-card p-3 mb-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-slate">
          Paper name
          <input className="rv-input mt-1 w-64" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="text-xs text-slate">
          Exam date
          <input type="date" className="rv-input mt-1 w-40" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        </label>
        <label className="text-xs text-slate">
          Shift
          <input className="rv-input mt-1 w-32" value={shift} onChange={(e) => setShift(e.target.value)} />
        </label>
        <label className="text-xs text-slate">
          Year
          <input type="number" className="rv-input mt-1 w-24" value={year} onChange={(e) => setYear(e.target.value)} />
        </label>
        {dirty && (
          <Button size="sm" onClick={() => onSave({ title, examDate: examDate || null, shift, year: year || null })}>
            Save
          </Button>
        )}
      </div>
      {imp.detected && (
        <p className="text-[11px] text-slate-soft mt-2">
          Read from the paper: {[imp.detected.examName, imp.detected.examDate, imp.detected.shift, imp.detected.language, imp.detected.totalQuestions && `${imp.detected.totalQuestions} questions`].filter(Boolean).join(" · ") || "nothing printed"}
        </p>
      )}
    </div>
  );
}

function RowCard({ row, importId, onSave, onReplace }) {
  const toast = useToast();
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null);

  function startEdit() {
    setDraft({
      text: row.text || "",
      textHi: row.textHi || "",
      passage: row.passage || "",
      options: [...(row.options || [])],
      optionsHi: [...(row.optionsHi || [])],
      solution: row.solution || "",
    });
    setEdit(true);
  }

  async function saveEdit() {
    const patch = {
      ...draft,
      options: draft.options.map((o) => o.trim()).filter(Boolean),
      optionsHi: draft.optionsHi.map((o) => o.trim()).filter(Boolean),
    };
    if (await onSave(patch)) setEdit(false);
  }

  async function uploadPicture(file) {
    if (!file) return;
    setUploading(true);
    try {
      const img = await shrinkImage(file);
      const res = await api.post(`/pyq/import/${importId}/row/${row._id}/image`, img);
      onReplace(res.data.row);
      toast.success("Picture added");
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Could not upload");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const options = row.options || [];
  const look = row.flags.length > 0;

  return (
    <div className={`border rounded-xl p-4 ${row.removed ? "opacity-60 border-border" : look ? "border-warn-border bg-warn-light/30" : "border-border-soft"}`}>
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span className="text-xs font-bold text-ink">Q{row.number ?? "?"}</span>
        {row.page && <span className="text-[11px] text-slate-soft">page {row.page}</span>}
        {row.subject && <Badge tone="neutral">{row.subject}{row.topic && row.topic !== row.subject ? ` · ${row.topic}` : ""}</Badge>}
        {row.translated && <Badge tone="info">{row.translated === "hi" ? "Hindi translated" : "English translated"}</Badge>}
        {row.flags.map((f) => (
          <Badge key={f} tone={FLAG_TEXT[f]?.tone || "warn"}>
            {FLAG_TEXT[f]?.label || f}
          </Badge>
        ))}
        <div className="ml-auto flex gap-2">
          {!row.removed && !edit && (
            <button onClick={startEdit} className="text-xs font-semibold text-brand hover:underline">
              Edit
            </button>
          )}
          <button onClick={() => onSave({ removed: !row.removed })} className="text-xs font-semibold text-danger hover:underline">
            {row.removed ? "Restore" : "Remove"}
          </button>
        </div>
      </div>

      {row.flags.length > 0 && <p className="text-xs text-warn mb-2">{row.flags.map((f) => FLAG_TEXT[f]?.help).filter(Boolean).join(" ")}</p>}

      {!edit ? (
        <>
          {row.passage && <p className="text-xs text-slate bg-slate-light rounded-lg p-2 mb-2 whitespace-pre-wrap">{row.passage}</p>}
          <p className="text-sm text-ink whitespace-pre-wrap">{row.text}</p>
          {row.textHi && <p className="text-sm text-ink-soft whitespace-pre-wrap mt-1">{row.textHi}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            {options.map((o, i) => (
              <button
                key={i}
                disabled={row.removed}
                onClick={() => onSave({ correctIndex: i })}
                className={`text-left text-sm border rounded-lg px-2.5 py-2 ${
                  row.answerConfirmed && row.correctIndex === i ? "border-success bg-success-light" : row.correctIndex === i ? "border-success" : "border-border hover:border-brand"
                }`}
                title="Click to make this the answer"
              >
                <span className="font-semibold mr-1.5">{LETTERS[i]}.</span>
                {o}
                {row.optionsHi?.[i] && <span className="block text-xs text-slate">{row.optionsHi[i]}</span>}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate mt-2">
            Paper's answer: <b>{letter(row.paperAnswer)}</b> · AI's answer: <b>{letter(row.aiAnswer)}</b>
            {row.answerConfirmed ? <span className="text-success font-semibold"> · confirmed {letter(row.correctIndex)}</span> : " · click an option to confirm the answer"}
          </p>
          {row.aiWorking && <p className="text-[11px] text-slate-soft mt-1">AI's working: {row.aiWorking}</p>}
          {(row.needsFigure || row.imageId) && !row.removed && (
            <div className="mt-3 flex items-center gap-3">
              {row.imageId && <img src={imageUrl(row.imageId)} alt="figure" className="max-h-40 border border-border rounded" />}
              <Button size="sm" variant="secondary" icon={RiImageAddLine} loading={uploading} onClick={() => fileInput.current?.click()}>
                {row.imageId ? "Replace picture" : "Upload the figure"}
              </Button>
              <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => uploadPicture(e.target.files?.[0])} />
            </div>
          )}
        </>
      ) : (
        <div className="space-y-2">
          <label className="block text-xs text-slate">
            Passage (if the question depends on one)
            <textarea className="rv-input w-full mt-1" rows={2} value={draft.passage} onChange={(e) => setDraft({ ...draft, passage: e.target.value })} />
          </label>
          <label className="block text-xs text-slate">
            Question (English)
            <textarea className="rv-input w-full mt-1" rows={2} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
          </label>
          <label className="block text-xs text-slate">
            Question (Hindi)
            <textarea className="rv-input w-full mt-1" rows={2} value={draft.textHi} onChange={(e) => setDraft({ ...draft, textHi: e.target.value })} />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-1.5">
                <span className="text-xs font-semibold pt-2">{LETTERS[i]}</span>
                <input
                  className="rv-input flex-1"
                  placeholder="English"
                  value={draft.options[i] || ""}
                  onChange={(e) => {
                    const next = [...draft.options];
                    next[i] = e.target.value;
                    setDraft({ ...draft, options: next.slice(0, 4) });
                  }}
                />
                <input
                  className="rv-input flex-1"
                  placeholder="Hindi"
                  value={draft.optionsHi[i] || ""}
                  onChange={(e) => {
                    const next = [...draft.optionsHi];
                    next[i] = e.target.value;
                    setDraft({ ...draft, optionsHi: next.slice(0, 4) });
                  }}
                />
              </div>
            ))}
          </div>
          {options.length > 4 && (
            <p className="text-xs text-warn">
              The paper printed {options.length} options; only the first four are kept when you save. Put the right ones in these four boxes.
            </p>
          )}
          <label className="block text-xs text-slate">
            Solution (optional)
            <textarea className="rv-input w-full mt-1" rows={2} value={draft.solution} onChange={(e) => setDraft({ ...draft, solution: e.target.value })} />
          </label>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveEdit}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEdit(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
