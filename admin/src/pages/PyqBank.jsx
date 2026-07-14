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

export default function PyqBank() {
  const [patterns, setPatterns] = useState([]);
  const [examStage, setExamStage] = useState("");
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [subject, setSubject] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [shift, setShift] = useState("");
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

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
      alert("Pehle PDF chuno");
      return;
    }
    setUploading(true);
    setUploadMsg(null);
    try {
      const pdfBase64 = await fileToBase64(file);
      const res = await api.post("/pyq/upload", { examStage, subject, year, shift, pdfBase64 });
      setUploadMsg({ type: "success", text: res.data.message });
      setFile(null);
      setSubject("");
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
    if (!confirm("Ye paper permanently delete karna hai?")) return;
    await api.delete(`/pyq/paper/${testId}`);
    loadPapers();
  }

  const drafts = papers.filter((p) => p.publishStatus === "draft");
  const published = papers.filter((p) => p.publishStatus === "published");
  const archived = papers.filter((p) => p.publishStatus === "archived");

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">PYQ Bank</h1>
      <p className="text-slate-500 mb-8">
        Real previous-year papers PDF form mein upload karo — Gemini us PDF se genuine questions nikaal ke deta hai
        (kuch banata nahi). Answer key nahi mili to review mein khud bharni hogi, publish tab hi hoga jab har
        question ka jawab confirm ho.
      </p>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 mb-8">
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Exam</label>
          <select
            value={examStage}
            onChange={(e) => setExamStage(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none min-w-[220px]"
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
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Subject <span className="text-slate-400">(optional, agar paper mixed hai to khaali chodo)</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Reasoning"
              className="px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none w-48"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Year</label>
            <input
              type="number"
              required
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none w-28"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Shift <span className="text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              placeholder="e.g. Shift 1"
              className="px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none w-32"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">PDF</label>
            <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-slate-300 hover:border-brand cursor-pointer text-sm text-slate-600">
              <RiUploadCloud2Line size={16} />
              {file ? file.name : "PDF chuno"}
              <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
            </label>
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="px-5 py-2.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {uploading ? "Extract ho raha hai..." : "Upload & Extract"}
          </button>
        </form>

        {uploading && (
          <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3 flex items-center gap-3">
            <span className="inline-block w-4 h-4 border-2 border-amber-300 border-t-amber-700 rounded-full animate-spin" />
            PDF padha ja raha hai aur questions extract ho rahe hain — bade paper mein 1-2 min lag sakta hai. Page
            band mat karo.
          </div>
        )}

        {uploadMsg && (
          <div
            className={`mt-4 text-sm rounded-lg px-4 py-3 border ${
              uploadMsg.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {uploadMsg.text}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : (
        <>
          <PaperSection title={`📝 Draft / Needs Review (${drafts.length})`}>
            {drafts.map((p) => (
              <PaperRow key={p._id} paper={p} onReview={() => setReviewing(p._id)} onDelete={() => deletePaper(p._id)} />
            ))}
            {drafts.length === 0 && <Empty text="Koi draft paper nahi." />}
          </PaperSection>

          <PaperSection title={`✅ Published (${published.length})`}>
            {published.map((p) => (
              <PaperRow key={p._id} paper={p} onReview={() => setReviewing(p._id)} onArchive={() => archivePaper(p._id)} />
            ))}
            {published.length === 0 && <Empty text="Abhi koi paper published nahi." />}
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
      <h2 className="text-sm font-semibold text-slate-500 mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Empty({ text }) {
  return <p className="text-slate-400 text-sm bg-white border border-slate-100 rounded-xl p-5">{text}</p>;
}

function PaperRow({ paper, onReview, onArchive, onDelete }) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
          <RiFileTextLine size={18} />
        </div>
        <div>
          <p className="font-semibold text-ink">{paper.title}</p>
          <p className="text-xs text-slate-500">
            {paper.questions?.length || 0} questions
            {paper.subject ? ` · ${paper.subject}` : ""}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onReview}
          className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 flex items-center gap-1.5"
        >
          <RiEyeLine size={14} /> Review
        </button>
        {onArchive && (
          <button onClick={onArchive} className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100">
            Hide
          </button>
        )}
        {onDelete && (
          <button onClick={onDelete} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100">
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewModal({ testId, onClose, onChanged }) {
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
    if (!confirm("Ye question hata do? (galat extraction hai)")) return;
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="font-display text-lg font-bold text-ink">{test?.title || "Review"}</p>
            {test && (
              <p className="text-xs text-slate-500 mt-0.5">
                {test.questions?.length || 0} questions
                {unanswered > 0 && <span className="text-red-500 font-medium"> · {unanswered} missing answer</span>}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl">
            <RiCloseLine size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <p className="text-slate-400">Loading...</p>
          ) : (
            test?.questions?.map((q, idx) => (
              <QuestionCard key={q._id} q={q} idx={idx} onSave={(patch) => saveQuestion(q._id, patch)} onRemove={() => removeQuestion(q._id)} />
            ))
          )}
        </div>

        <div className="p-5 border-t border-slate-100 flex items-center justify-between gap-4">
          {publishError && <p className="text-sm text-red-600 flex-1">{publishError}</p>}
          {test?.publishStatus === "published" ? (
            <span className="text-sm text-emerald-600 font-medium flex items-center gap-1.5 ml-auto">
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
    <div className={`border rounded-xl p-4 ${missing ? "border-red-200 bg-red-50/40" : "border-slate-100"}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-xs font-semibold text-slate-400">Q{idx + 1}</p>
        <div className="flex items-center gap-2">
          {missing && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
              <RiAlertLine size={11} /> NO ANSWER
            </span>
          )}
          <button onClick={onRemove} className="text-slate-400 hover:text-red-500">
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
        className="w-full text-sm border border-slate-200 rounded-lg p-2.5 mb-2.5 focus:border-brand outline-none resize-none"
        rows={2}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5">
        {options.map((opt, i) => (
          <label
            key={i}
            className={`flex items-center gap-2 text-sm border rounded-lg px-2.5 py-2 cursor-pointer ${
              correctIndex === i ? "border-emerald-400 bg-emerald-50" : "border-slate-200"
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
        className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:border-brand outline-none resize-none"
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