import { useEffect, useState } from "react";
import {
  RiUploadCloud2Line,
  RiFileTextLine,
  RiCheckLine,
  RiCloseLine,
  RiAlertLine,
  RiDeleteBinLine,
  RiEyeLine,
} from "@remixicon/react";
import api from "../api/axios";
import { PageHeader } from "../components/ui";
import { useToast } from "../components/Toast";
import ManualQuestions from "../components/ManualQuestions";
import { PyqImportList } from "../components/PyqImports";

export default function PyqBank() {
  const toast = useToast();
  const [patterns, setPatterns] = useState([]);
  const [examStage, setExamStage] = useState("");
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [paperName, setPaperName] = useState("");
  const [year, setYear] = useState("");
  const [importsKey, setImportsKey] = useState(0);
  const [shift, setShift] = useState("");
  const [examDate, setExamDate] = useState("");
  const [language, setLanguage] = useState("auto");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null); // { type: 'success'|'error', text }

  const [reviewing, setReviewing] = useState(null); // testId being reviewed
  const [writingInto, setWritingInto] = useState(null); // paper being typed in by hand
  const [starting, setStarting] = useState(false);
  const [tab, setTab] = useState("draft");
  const [showUpload, setShowUpload] = useState(false);

  // Sections of the chosen exam, so a typed-in question is filed under a
  // section the paper really has.
  const sectionNames = (patterns.find((x) => x.examType === examStage)?.sections || []).map((x) => x.subject);

  // For a paper the extractor cannot read - a poor scan, a photo, a paper
  // that exists only in print. Same year / shift / date as the upload above.
  async function startByHand() {
    if (!examStage || !year) return toast.error("Pick the exam and type the year first");
    setStarting(true);
    try {
      const res = await api.post("/pyq/paper", { examStage, year, shift, examDate, language: language === "auto" ? "bilingual" : language });
      toast.success(res.data.message);
      await loadPapers();
      setWritingInto(res.data.test);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't start the paper");
    } finally {
      setStarting(false);
    }
  }

  async function loadPatterns() {
    const res = await api.get("/exams");
    setPatterns(res.data.patterns || []);
    if (!examStage && res.data.patterns?.length) setExamStage(res.data.patterns[0].examType);
  }

  // pickTab: on opening an exam, show its drafts if it has any, else what is live.
  async function loadPapers({ pickTab = false } = {}) {
    if (!examStage) return;
    setLoading(true);
    try {
      const res = await api.get(`/pyq/${examStage}`);
      const list = res.data.papers || [];
      setPapers(list);
      if (pickTab) setTab(list.some((x) => x.publishStatus === "draft") ? "draft" : "published");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatterns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadPapers({ pickTab: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examStage]);

  function fileToBase64(f) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  }

  function onDateChange(value) {
    setExamDate(value);
    if (value) setYear(new Date(value).getFullYear());
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
      toast.error("Choose a PDF first");
      return;
    }
    setUploading(true);
    setUploadMsg(null);
    try {
      const pdfBase64 = await fileToBase64(file);
      const res = await api.post("/pyq/import", {
        examStage,
        pdfBase64,
        fileName: file.name,
        title: paperName,
        year: year || undefined,
        shift,
        examDate: examDate || undefined,
        language: language === "auto" ? undefined : language,
      });
      setUploadMsg({ type: "success", text: res.data.message });
      setFile(null);
      setPaperName("");
      setExamDate("");
      setShift("");
      setYear("");
      setImportsKey((k) => k + 1);
    } catch (err) {
      setUploadMsg({ type: "error", text: err.response?.data?.message || "Upload failed" });
    } finally {
      setUploading(false);
    }
  }

  async function archivePaper(testId) {
    await api.patch(`/pyq/paper/${testId}/archive`);
    loadPapers();
  }

  async function deletePaper(testId) {
    const ok = await toast.confirm({
      title: "Permanently delete this paper?",
      message: "This deletes the paper and all its extracted questions. This can't be undone.",
      confirmLabel: "Delete permanently",
      danger: true,
    });
    if (!ok) return;
    await api.delete(`/pyq/paper/${testId}`);
    toast.success("Paper deleted");
    loadPapers();
  }

  const drafts = papers.filter((p) => p.publishStatus === "draft");
  const published = papers.filter((p) => p.publishStatus === "published");
  const archived = papers.filter((p) => p.publishStatus === "archived");
  const lists = { draft: drafts, published, archived };
  const shown = lists[tab] || [];
  const examName = patterns.find((p) => p.examType === examStage)?.displayName || examStage;
  const liveQuestions = published.reduce((n, p) => n + (p.questions?.length || 0), 0);
  const field = "block text-xs font-medium text-slate mb-1";

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="PYQ Bank"
        subtitle="Real previous-year papers. Upload a PDF (English, Hindi or both, typed or scanned) - it is read page by page, translated and every answer checked against an independent solve. You review what is flagged, then publish. Nothing reaches students before you publish."
        actions={
          <>
            <select value={examStage} onChange={(e) => setExamStage(e.target.value)} className="rv-input !py-1.5 text-sm min-w-[210px]" aria-label="Exam">
              {patterns.map((p) => (
                <option key={p._id} value={p.examType}>
                  {p.displayName}
                </option>
              ))}
            </select>
            <button onClick={() => setShowUpload((v) => !v)} className="rv-btn-primary !text-[13px] !py-1.5">
              <RiUploadCloud2Line size={16} /> {showUpload ? "Close" : "Add a paper"}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <Tile label={`${examName} papers live`} value={loading ? null : published.length} tone="bg-success" />
        <Tile label="Questions live" value={loading ? null : liveQuestions} tone="bg-brand" />
        <Tile label="Drafts to review" value={loading ? null : drafts.length} tone={drafts.length ? "bg-warn" : "bg-slate-soft"} />
        <Tile label="Archived" value={loading ? null : archived.length} tone="bg-slate-soft" />
      </div>

      {showUpload && (
        <div className="rv-card p-5 mb-5">
          <p className="font-semibold text-ink mb-3">Add a {examName} paper</p>
          <form onSubmit={handleUpload} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 items-end">
            <div className="lg:col-span-2">
              <label className={field}>Paper name (blank = from the PDF)</label>
              <input type="text" value={paperName} onChange={(e) => setPaperName(e.target.value)} placeholder="Auto from PDF" className="rv-input" />
            </div>
            <div>
              <label className={field}>Exam date</label>
              <input type="date" value={examDate} onChange={(e) => onDateChange(e.target.value)} className="rv-input" />
            </div>
            <div>
              <label className={field}>Year</label>
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="Auto" className="rv-input" />
            </div>
            <div>
              <label className={field}>Shift</label>
              <input type="text" value={shift} onChange={(e) => setShift(e.target.value)} placeholder="Auto" className="rv-input" />
            </div>
            <div>
              <label className={field}>Language</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rv-input">
                <option value="auto">Auto-detect</option>
                <option value="bilingual">Bilingual (EN + HI)</option>
                <option value="english">English only</option>
                <option value="hindi">Hindi only</option>
              </select>
            </div>
            <label className="sm:col-span-2 lg:col-span-4 flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-border-strong hover:border-brand cursor-pointer text-sm text-slate">
              <RiUploadCloud2Line size={18} className="text-brand" />
              <span className="truncate">{file ? file.name : "Choose the paper's PDF"}</span>
              <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
            </label>
            <div className="sm:col-span-2 flex gap-2 lg:justify-end">
              <button type="submit" disabled={uploading} className="rv-btn-primary">
                {uploading ? "Uploading..." : "Upload PDF"}
              </button>
              <button
                type="button"
                onClick={startByHand}
                disabled={starting || uploading}
                className="rv-btn-secondary disabled:opacity-60"
                title="No PDF, or one the extractor can't read? Start the paper empty and type or paste its questions in."
              >
                {starting ? "Starting..." : "Type it in instead"}
              </button>
            </div>
          </form>

          {uploading && (
            <div className="mt-4 bg-warn-light border border-warn-border text-warn text-sm rounded-lg px-4 py-3 flex items-center gap-3">
              <span className="inline-block w-4 h-4 border-2 border-warn-border border-t-warn rounded-full animate-spin" />
              Uploading the PDF. Reading happens in the queue after this - you can close the page once it says uploaded.
            </div>
          )}
        </div>
      )}

      {uploadMsg && (
        <div
          className={`mb-5 text-sm rounded-lg px-4 py-3 border ${
            uploadMsg.type === "success" ? "bg-success-light border-success-border text-success" : "bg-danger-light border-danger-border text-danger"
          }`}
        >
          {uploadMsg.text}
        </div>
      )}

      <PyqImportList examStage={examStage} reloadKey={importsKey} onPublished={() => loadPapers()} />

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border mb-4">
        {[
          ["draft", "Drafts", drafts.length, "bg-warn-light text-warn"],
          ["published", "Published", published.length, "bg-success-light text-success"],
          ["archived", "Archived", archived.length, "bg-slate-light text-slate"],
        ].map(([key, label, n, tone]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 -mb-px text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              tab === key ? "border-brand text-brand" : "border-transparent text-slate hover:text-ink"
            }`}
          >
            {label}
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full tabular-nums ${tone}`}>{n}</span>
          </button>
        ))}
      </div>

      <div className="rv-card !p-0 overflow-hidden">
        {loading ? (
          <p className="text-slate-soft text-center py-10">Loading...</p>
        ) : shown.length === 0 ? (
          <p className="text-slate-soft text-center py-10">
            {tab === "draft" ? `No draft ${examName} papers.` : tab === "published" ? `No ${examName} paper published yet.` : "Nothing archived."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-light/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate">
                  <th className="px-4 py-3">Paper</th>
                  <th className="px-4 py-3 whitespace-nowrap">Year · Shift</th>
                  <th className="px-4 py-3 text-right">Questions</th>
                  <th className="px-4 py-3">Language</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {shown.map((p) => (
                  <tr key={p._id} className="align-middle hover:bg-slate-light/40 transition-colors">
                    <td className="px-4 py-3 min-w-[240px]">
                      <button onClick={() => setReviewing(p._id)} className="flex items-center gap-2.5 text-left">
                        <span className="w-8 h-8 rounded-md bg-brand/10 text-brand grid place-items-center shrink-0">
                          <RiFileTextLine size={16} />
                        </span>
                        <span className="font-semibold text-ink hover:text-brand">{p.title}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate whitespace-nowrap">
                      {p.pyqYear || "—"}
                      {p.pyqShift ? ` · ${p.pyqShift}` : ""}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-ink">{p.questions?.length || 0}</td>
                    <td className="px-4 py-3">
                      {p.pyqLanguage ? (
                        <span className="text-[11px] font-semibold bg-slate-light text-slate px-2 py-0.5 rounded-full">
                          {p.pyqLanguage === "bilingual" ? "EN + HI" : p.pyqLanguage === "hindi" ? "Hindi" : "English"}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-soft">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => setReviewing(p._id)} className="px-2.5 py-1 rounded-md bg-slate-light hover:bg-border-strong text-ink-soft text-xs font-semibold inline-flex items-center gap-1">
                          <RiEyeLine size={13} /> Review
                        </button>
                        {tab === "draft" && (
                          <button onClick={() => setWritingInto(p)} className="px-2.5 py-1 rounded-md bg-brand/5 hover:bg-brand/10 text-brand text-xs font-semibold whitespace-nowrap">
                            + Write / upload
                          </button>
                        )}
                        {tab === "published" && (
                          <button onClick={() => archivePaper(p._id)} className="px-2.5 py-1 rounded-md bg-warn-light hover:opacity-80 text-warn text-xs font-semibold">
                            Hide
                          </button>
                        )}
                        {tab === "draft" && (
                          <button onClick={() => deletePaper(p._id)} className="px-2.5 py-1 rounded-md bg-danger-light hover:opacity-80 text-danger text-xs font-semibold">
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {writingInto && (
        <ManualQuestions
          endpoint={`/pyq/paper/${writingInto._id}/manual-questions`}
          sections={sectionNames}
          title={writingInto.title}
          onClose={() => setWritingInto(null)}
          onAdded={() => loadPapers()}
        />
      )}

      {reviewing && (
        <ReviewModal
          testId={reviewing}
          onClose={() => setReviewing(null)}
          onChanged={() => {
            loadPapers();
          }}
        />
      )}
    </div>
  );
}

function Tile({ label, value, tone }) {
  return (
    <div className="rv-card p-4 flex items-center gap-3">
      <span className={`w-1.5 self-stretch rounded-full ${tone}`} />
      <div className="min-w-0">
        {value == null ? <div className="h-6 w-10 rounded bg-slate-light animate-pulse" /> : <p className="font-display text-xl font-extrabold text-ink tabular-nums">{value}</p>}
        <p className="text-xs text-slate truncate">{label}</p>
      </div>
    </div>
  );
}

function ReviewModal({ testId, onClose, onChanged }) {
  const toast = useToast();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");

  async function load() {
    setLoading(true);
    const res = await api.get(`/pyq/paper/${testId}`);
    setTest(res.data.test);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  async function saveQuestion(questionId, patch) {
    await api.patch(`/pyq/question/${questionId}`, patch);
    load();
  }

  async function removeQuestion(questionId) {
    const ok = await toast.confirm({
      title: "Remove this question?",
      message: "Use this when the extraction is wrong or the question shouldn't be included.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    await api.delete(`/pyq/paper/${testId}/question/${questionId}`);
    load();
    onChanged();
  }

  async function publish() {
    setPublishing(true);
    setPublishError("");
    try {
      await api.patch(`/pyq/paper/${testId}/publish`);
      onChanged();
      onClose();
    } catch (err) {
      setPublishError(err.response?.data?.message || "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  const unanswered = test?.questions?.filter((q) => q.correctIndex === null || q.correctIndex === undefined).length || 0;

  return (
    <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-border-soft flex items-center justify-between">
          <div>
            <p className="font-display text-lg font-bold text-ink">{test?.title || "Review"}</p>
            {test && (
              <p className="text-xs text-slate mt-0.5">
                {test.questions?.length || 0} questions
                {unanswered > 0 && <span className="text-danger font-medium"> · {unanswered} missing answer</span>}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-soft hover:text-ink-soft text-xl">
            <RiCloseLine size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <p className="text-slate-soft">Loading...</p>
          ) : (
            test?.questions?.map((q, idx) => (
              <QuestionCard key={q._id} q={q} idx={idx} onSave={(patch) => saveQuestion(q._id, patch)} onRemove={() => removeQuestion(q._id)} />
            ))
          )}
        </div>

        <div className="p-5 border-t border-border-soft flex items-center justify-between gap-4">
          {publishError && <p className="text-sm text-danger flex-1">{publishError}</p>}
          {test?.publishStatus === "published" ? (
            <span className="text-sm text-success font-medium flex items-center gap-1.5 ml-auto">
              <RiCheckLine size={16} /> Published
            </span>
          ) : (
            <button
              onClick={publish}
              disabled={publishing}
              className="ml-auto px-5 py-2.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium disabled:opacity-60"
            >
              {publishing ? "Publishing..." : "Publish Paper"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionCard({ q, idx, onSave, onRemove }) {
  const [text, setText] = useState(q.text);
  const [options, setOptions] = useState(q.options);
  const [correctIndex, setCorrectIndex] = useState(q.correctIndex);
  const [solution, setSolution] = useState(q.solution || "");
  const [dirty, setDirty] = useState(false);

  const missing = correctIndex === null || correctIndex === undefined;

  function commit() {
    onSave({ text, options, correctIndex, solution });
    setDirty(false);
  }

  return (
    <div className={`border rounded-xl p-4 ${missing ? "border-danger-border bg-danger-light/40" : "border-border-soft"}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-xs font-semibold text-slate-soft">Q{idx + 1}</p>
        <div className="flex items-center gap-2">
          {missing && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-danger bg-danger-light px-2 py-0.5 rounded-full">
              <RiAlertLine size={11} /> NO ANSWER
            </span>
          )}
          <button onClick={onRemove} className="text-slate-soft hover:text-danger">
            <RiDeleteBinLine size={15} />
          </button>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setDirty(true);
        }}
        className="w-full text-sm border border-border rounded-lg p-2.5 mb-2.5 focus:border-brand outline-none resize-none"
        rows={2}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5">
        {options.map((opt, i) => (
          <label
            key={i}
            className={`flex items-center gap-2 text-sm border rounded-lg px-2.5 py-2 cursor-pointer ${
              correctIndex === i ? "border-success bg-success-light" : "border-border"
            }`}
          >
            <input
              type="radio"
              checked={correctIndex === i}
              onChange={() => {
                setCorrectIndex(i);
                setDirty(true);
              }}
            />
            <input
              value={opt}
              onChange={(e) => {
                const next = [...options];
                next[i] = e.target.value;
                setOptions(next);
                setDirty(true);
              }}
              className="flex-1 bg-transparent outline-none"
            />
          </label>
        ))}
      </div>

      <textarea
        value={solution}
        onChange={(e) => {
          setSolution(e.target.value);
          setDirty(true);
        }}
        placeholder="Solution (optional)"
        className="w-full text-sm border border-border rounded-lg p-2.5 focus:border-brand outline-none resize-none"
        rows={2}
      />

      {dirty && (
        <button onClick={commit} className="mt-2 text-xs font-medium text-brand hover:underline">
          Save changes
        </button>
      )}
    </div>
  );
}