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

export default function PyqBank() {
  const toast = useToast();
  const [patterns, setPatterns] = useState([]);
  const [examStage, setExamStage] = useState("");
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [subject, setSubject] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [shift, setShift] = useState("");
  const [examDate, setExamDate] = useState("");
  const [language, setLanguage] = useState("bilingual");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null); // { type: 'success'|'error', text }

  const [reviewing, setReviewing] = useState(null); // testId being reviewed

  async function loadPatterns() {
    const res = await api.get("/exams");
    setPatterns(res.data.patterns || []);
    if (!examStage && res.data.patterns?.length) setExamStage(res.data.patterns[0].examType);
  }

  async function loadPapers() {
    if (!examStage) return;
    setLoading(true);
    try {
      const res = await api.get(`/pyq/${examStage}`);
      setPapers(res.data.papers || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatterns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadPapers();
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
      const res = await api.post("/pyq/upload", { examStage, subject, year, shift, examDate, language, pdfBase64 });
      setUploadMsg({ type: "success", text: res.data.message });
      setFile(null);
      setSubject("");
      setExamDate("");
      setShift("");
      loadPapers();
    } catch (err) {
      setUploadMsg({ type: "error", text: err.response?.data?.message || "Upload fail hua" });
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

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="PYQ Bank"
        subtitle="Upload real previous-year papers as PDFs — Gemini extracts genuine questions straight from the PDF (it doesn't invent anything). If an answer key is missing you'll fill it in during review; publishing is only possible once every question's answer is confirmed."
      />

      <div className="rv-card p-6 mb-8">
        <div className="mb-4">
          <label className="block text-sm font-medium text-ink-soft mb-1.5">Exam</label>
          <select
            value={examStage}
            onChange={(e) => setExamStage(e.target.value)}
            className="rv-input min-w-[220px]"
          >
            {patterns.map((p) => (
              <option key={p._id} value={p.examType}>
                {p.displayName}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleUpload} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1.5">
              Subject <span className="text-slate-soft">(optional — leave blank for a mixed-subject paper)</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Reasoning"
              className="rv-input w-48"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1.5">
              Exam Date <span className="text-slate-soft">(optional, sirf year se zyada exact)</span>
            </label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="rv-input w-40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1.5">Year</label>
            <input
              type="number"
              required
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="rv-input w-24"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1.5">
              Shift <span className="text-slate-soft">(optional)</span>
            </label>
            <input
              type="text"
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              placeholder="e.g. Shift 1"
              className="rv-input w-32"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1.5">PDF Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rv-input w-36"
            >
              <option value="bilingual">Bilingual (EN + HI)</option>
              <option value="english">English only</option>
              <option value="hindi">Hindi only</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1.5">PDF</label>
            <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border-strong hover:border-brand cursor-pointer text-sm text-slate">
              <RiUploadCloud2Line size={16} />
              {file ? file.name : "Choose PDF"}
              <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
            </label>
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="rv-btn-primary"
          >
            {uploading ? "Extracting..." : "Upload & Extract"}
          </button>
        </form>

        {uploading && (
          <div className="mt-4 bg-warn-light border border-warn-border text-warn text-sm rounded-lg px-4 py-3 flex items-center gap-3">
            <span className="inline-block w-4 h-4 border-2 border-warn-border border-t-warn rounded-full animate-spin" />
            Reading the PDF and extracting questions — a large paper can take 1-2 minutes. Please don't close this
            page.
          </div>
        )}

        {uploadMsg && (
          <div
            className={`mt-4 text-sm rounded-lg px-4 py-3 border ${
              uploadMsg.type === "success"
                ? "bg-success-light border-success-border text-success"
                : "bg-danger-light border-danger-border text-danger"
            }`}
          >
            {uploadMsg.text}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-slate-soft">Loading...</p>
      ) : (
        <>
          <PaperSection title={`📝 Draft / Needs Review (${drafts.length})`}>
            {drafts.map((p) => (
              <PaperRow key={p._id} paper={p} onReview={() => setReviewing(p._id)} onDelete={() => deletePaper(p._id)} />
            ))}
            {drafts.length === 0 && <Empty text="No draft papers." />}
          </PaperSection>

          <PaperSection title={`✅ Published (${published.length})`}>
            {published.map((p) => (
              <PaperRow key={p._id} paper={p} onReview={() => setReviewing(p._id)} onArchive={() => archivePaper(p._id)} />
            ))}
            {published.length === 0 && <Empty text="No papers published yet." />}
          </PaperSection>

          {archived.length > 0 && (
            <PaperSection title={`🗄 Archived (${archived.length})`}>
              {archived.map((p) => (
                <PaperRow key={p._id} paper={p} onReview={() => setReviewing(p._id)} />
              ))}
            </PaperSection>
          )}
        </>
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

function PaperSection({ title, children }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-slate mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Empty({ text }) {
  return <p className="text-slate-soft text-sm bg-surface border border-border-soft rounded-xl p-5">{text}</p>;
}

function PaperRow({ paper, onReview, onArchive, onDelete }) {
  return (
    <div className="rv-card p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
          <RiFileTextLine size={18} />
        </div>
        <div>
          <p className="font-semibold text-ink">{paper.title}</p>
          <p className="text-xs text-slate flex items-center gap-1.5 mt-0.5">
            {paper.questions?.length || 0} questions
            {paper.subject ? ` · ${paper.subject}` : ""}
            {paper.pyqLanguage && (
              <span className="text-[10px] font-semibold bg-slate-light text-slate px-1.5 py-0.5 rounded">
                {paper.pyqLanguage === "bilingual" ? "EN + HI" : paper.pyqLanguage === "hindi" ? "HI" : "EN"}
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onReview}
          className="px-3 py-1.5 rounded-lg bg-slate-light text-ink-soft text-sm font-medium hover:bg-border-strong flex items-center gap-1.5"
        >
          <RiEyeLine size={14} /> Review
        </button>
        {onArchive && (
          <button onClick={onArchive} className="px-3 py-1.5 rounded-lg bg-warn-light text-warn text-sm font-medium hover:bg-warn-light">
            Hide
          </button>
        )}
        {onDelete && (
          <button onClick={onDelete} className="px-3 py-1.5 rounded-lg bg-danger-light text-danger text-sm font-medium hover:bg-danger-light">
            Delete
          </button>
        )}
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
      setPublishError(err.response?.data?.message || "Publish fail hua");
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