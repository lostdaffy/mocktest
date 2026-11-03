import { useEffect, useState } from "react";
import {
  RiCheckLine,
  RiCloseLine,
  RiEdit2Line,
  RiDeleteBin6Line,
  RiAlertLine,
  RiSparkling2Line,
  RiRefreshLine,
  RiHistoryLine,
  RiShieldCheckLine,
  RiSearchLine,
  RiArrowDownSLine,
} from "@remixicon/react";
import api from "../api/axios";
import { PageHeader, Card } from "../components/ui";
import { useToast } from "../components/Toast";
import QuestionEditor from "../components/QuestionEditor";
import QuestionVisual from "../components/QuestionVisual";
import ChapterAudit from "../components/ChapterAudit";
import QualityDesk from "../components/QualityDesk";
import QuestionHistory from "../components/QuestionHistory";

const PAGE_SIZE = 20;

// The queue comes first on purpose: this page's real job is clearing the
// questions the quality gate held back, not browsing the whole bank.
const TABS = [
  { key: "under_review", label: "Needs review" },
  { key: "published", label: "Live" },
  { key: "rejected", label: "Rejected" },
  { key: "", label: "All" },
];

const SECTIONS = [
  ["questions", "Questions"],
  ["desk", "Quality desk"],
  ["audit", "Chapter audit"],
];

export default function ManageQuestions() {
  const toast = useToast();
  const [section, setSection] = useState("questions");
  const [questions, setQuestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("under_review");
  const [filters, setFilters] = useState({ subject: "", topic: "" });
  const [counts, setCounts] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState("");
  const [rechecking, setRechecking] = useState(false);
  const [historyOf, setHistoryOf] = useState(null);
  const [deskKey, setDeskKey] = useState(0);
  const [openId, setOpenId] = useState(null);

  async function load(targetPage = page, targetStatus = status) {
    setLoading(true);
    try {
      const params = { page: targetPage, limit: PAGE_SIZE };
      if (filters.subject) params.subject = filters.subject;
      if (filters.topic) params.topic = filters.topic;
      if (targetStatus) params.status = targetStatus;
      const res = await api.get("/questions", { params });
      setQuestions(res.data.questions || []);
      setTotal(res.data.total ?? 0);
      setPage(res.data.page ?? targetPage);
    } catch (err) {
      toast.error("Couldn't load questions: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }

  async function loadCounts() {
    try {
      const res = await api.get("/questions/stats");
      setCounts(res.data);
    } catch {
      // the tiles just won't show numbers
    }
  }

  useEffect(() => {
    setOpenId(null);
    load(1, status);
    loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function act(id, action) {
    setBusy(id);
    try {
      if (action === "approve") await api.patch(`/questions/${id}/approve`);
      if (action === "reject") await api.patch(`/questions/${id}/reject`);
      setQuestions((qs) => qs.filter((q) => q._id !== id));
      setTotal((t) => Math.max(0, t - 1));
      loadCounts();
      toast.success(action === "approve" ? "Approved — it can be used in tests now" : "Rejected — it stays out of every test");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't update that question");
    } finally {
      setBusy("");
    }
  }

  // Put the queue back through the gate that filled it. Whatever passes goes
  // live, whatever can be mended is mended, and whatever still fails leaves
  // circulation. Twenty at a time, because each one costs an AI call.
  async function recheckQueue() {
    setRechecking(true);
    try {
      const res = await api.post("/questions/recheck", {
        limit: 20,
        subject: filters.subject || undefined,
        topic: filters.topic || undefined,
      });
      toast.success(res.data?.message || "Re-checked");
      load(1, status);
      loadCounts();
    } catch (err) {
      toast.error(err.response?.data?.message || "The re-check couldn't finish");
    } finally {
      setRechecking(false);
    }
  }

  async function handleDelete(id) {
    const ok = await toast.confirm({
      title: "Delete this question?",
      message:
        "If it is live, in a test or answered by students, it is retired instead: taken out of its tests, a replacement put in, and kept in the history. A copy of anything deleted is kept and can be brought back.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      const r = await api.delete(`/questions/${id}`);
      setQuestions((prev) => prev.filter((q) => q._id !== id));
      setTotal((t) => Math.max(0, t - 1));
      loadCounts();
      toast.success(r.data?.message || "Question deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  }

  // The AI on one question: check it (and correct or replace what is wrong),
  // improve its solution and Hindi, or build a new one for its place. In
  // approval mode the result waits in the quality desk.
  async function ai(id, what) {
    setBusy(id);
    try {
      const r = what === "check" ? await api.post("/quality/check", { ids: [id] }) : await api.post(`/quality/questions/${id}/${what}`);
      toast.success(r.data?.message || "Done");
      setDeskKey((k) => k + 1);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "The AI couldn't do that right now");
    } finally {
      setBusy("");
    }
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const icon = "w-7 h-7 rounded-md grid place-items-center transition-colors disabled:opacity-50";

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Question Review"
        subtitle="Questions the quality gate held back land here. Fix them, approve them, or keep them out — nothing reaches a student until you decide."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <Tile label="Waiting for review" value={counts?.reviewQueue} tone={counts?.reviewQueue ? "bg-warn" : "bg-slate-soft"} />
        <Tile label="Live in the bank" value={counts?.publishedQuestions} tone="bg-success" />
        <Tile label="Total questions" value={counts?.totalQuestions} tone="bg-brand" />
        <Tile label="Open student reports" value={counts?.openReports} tone={counts?.openReports ? "bg-danger" : "bg-slate-soft"} />
      </div>

      <div className="flex flex-wrap items-center gap-1 border-b border-border mb-5">
        {SECTIONS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            className={`px-4 py-2.5 -mb-px text-sm font-semibold border-b-2 transition-colors ${
              section === key ? "border-brand text-brand" : "border-transparent text-slate hover:text-ink"
            }`}
          >
            {label}
            {key === "questions" && counts?.reviewQueue ? (
              <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded-full bg-warn-light text-warn tabular-nums">{counts.reviewQueue}</span>
            ) : null}
          </button>
        ))}
      </div>

      {section === "desk" && <QualityDesk refreshKey={deskKey} />}
      {section === "audit" && <ChapterAudit />}

      {section === "questions" && (
        <>
          {/* Status + filters on one line */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setStatus(t.key)}
                  className={`px-3 py-1.5 text-[13px] font-semibold rounded-md transition-colors ${status === t.key ? "bg-brand text-white" : "text-slate hover:text-ink"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <RiSearchLine size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-soft" />
              <input
                value={filters.subject}
                onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && load(1)}
                placeholder="Subject (e.g. Maths)"
                className="rv-input !py-1.5 !pl-9 text-sm w-44"
              />
            </div>
            <input
              value={filters.topic}
              onChange={(e) => setFilters({ ...filters, topic: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && load(1)}
              placeholder="Topic / chapter"
              className="rv-input !py-1.5 text-sm w-44"
            />
            <button onClick={() => load(1)} className="rv-btn-secondary !py-1.5 !text-[13px]">
              Apply
            </button>
            {status === "under_review" && total > 0 && (
              <button
                onClick={recheckQueue}
                disabled={rechecking}
                className="rv-btn-primary !py-1.5 !text-[13px] disabled:opacity-60 ml-auto"
                title="Solves each again: sound ones go live, thin solutions and missing Hindi are filled in, the rest leave the bank."
              >
                {rechecking ? "Re-checking..." : `Re-check next ${Math.min(20, total)}`}
              </button>
            )}
          </div>

          <Card className="!p-0 overflow-hidden">
            {loading ? (
              <p className="text-slate-soft text-center py-10">Loading...</p>
            ) : questions.length === 0 ? (
              <div className="p-10 text-center">
                <p className="font-medium text-ink">{status === "under_review" ? "Nothing waiting — the queue is clear." : "No questions here."}</p>
                {status === "under_review" && <p className="text-sm text-slate-soft mt-1">Anything the AI or the rules doubt will show up here.</p>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-light/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate">
                      <th className="px-4 py-3 w-10">#</th>
                      <th className="px-4 py-3">Question</th>
                      <th className="px-4 py-3">Answer</th>
                      <th className="px-4 py-3">Where</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft">
                    {questions.map((q, i) => {
                      const open = openId === q._id;
                      return (
                        <tr key={q._id} className={`align-top transition-colors ${open ? "bg-brand/[0.03]" : "hover:bg-slate-light/40"}`}>
                          <td className="px-4 py-3 text-slate-soft tabular-nums">{(page - 1) * PAGE_SIZE + i + 1}</td>
                          <td className="px-4 py-3 min-w-[320px]">
                            {q.flagReason && (
                              <p className="flex items-start gap-1.5 text-xs text-warn mb-1">
                                <RiAlertLine size={13} className="shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{q.flagReason}</span>
                              </p>
                            )}
                            <button onClick={() => setOpenId(open ? null : q._id)} className="text-left font-medium text-ink hover:text-brand flex items-start gap-1">
                              <span className={open ? "" : "line-clamp-2"}>{q.text}</span>
                              <RiArrowDownSLine size={16} className={`shrink-0 mt-0.5 text-slate-soft transition-transform ${open ? "rotate-180" : ""}`} />
                            </button>
                            {open && (
                              <div className="mt-2 space-y-2">
                                {q.textHi && <p className="text-sm text-slate">{q.textHi}</p>}
                                <QuestionVisual q={q} />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {(q.options || []).map((opt, k) => (
                                    <div key={k} className={`text-xs px-2 py-1 rounded ${k === q.correctIndex ? "bg-success-light text-success font-medium" : "bg-slate-light/60 text-slate"}`}>
                                      {String.fromCharCode(65 + k)}. {opt}
                                    </div>
                                  ))}
                                </div>
                                {q.solution && (
                                  <p className="text-xs text-slate">
                                    <b className="text-ink-soft">Solution:</b> {q.solution}
                                  </p>
                                )}
                                {q.solutionHi && <p className="text-xs text-slate">{q.solutionHi}</p>}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 min-w-[120px]">
                            <span className="text-success font-medium">
                              {String.fromCharCode(65 + (q.correctIndex ?? 0))}. {q.options?.[q.correctIndex]}
                            </span>
                          </td>
                          <td className="px-4 py-3 min-w-[150px] text-xs text-slate">
                            <p className="text-ink-soft font-medium">{q.subject}</p>
                            <p>{q.topic}</p>
                            <p className="text-slate-soft">
                              {q.difficulty} · {q.source === "pyq" ? "real paper" : q.source === "manual" || q.createdBy === "admin" ? "hand-written" : "AI"}
                              {typeof q.aiConfidenceScore === "number" && ` · ${Math.round(q.aiConfidenceScore * 100)}%`}
                            </p>
                            {q.reportCount > 0 && <p className="text-danger font-semibold">{q.reportCount} report(s)</p>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1 flex-wrap max-w-[220px] ml-auto">
                              {q.status !== "published" && (
                                <button onClick={() => act(q._id, "approve")} disabled={busy === q._id} className={`${icon} bg-success-light text-success hover:opacity-80`} title="Approve">
                                  <RiCheckLine size={15} />
                                </button>
                              )}
                              {q.status !== "rejected" && (
                                <button onClick={() => act(q._id, "reject")} disabled={busy === q._id} className={`${icon} bg-slate-light text-ink-soft hover:bg-border-strong`} title="Reject">
                                  <RiCloseLine size={15} />
                                </button>
                              )}
                              <button onClick={() => setEditing({ ...q })} className={`${icon} bg-slate-light text-ink-soft hover:bg-border-strong`} title="Fix">
                                <RiEdit2Line size={15} />
                              </button>
                              <button onClick={() => ai(q._id, "check")} disabled={busy === q._id} className={`${icon} bg-brand/10 text-brand hover:bg-brand/20`} title="AI check">
                                <RiShieldCheckLine size={15} />
                              </button>
                              <button onClick={() => ai(q._id, "improve")} disabled={busy === q._id} className={`${icon} bg-brand/10 text-brand hover:bg-brand/20`} title="Improve solution and Hindi">
                                <RiSparkling2Line size={15} />
                              </button>
                              <button onClick={() => ai(q._id, "regenerate")} disabled={busy === q._id} className={`${icon} bg-brand/10 text-brand hover:bg-brand/20`} title="Regenerate">
                                <RiRefreshLine size={15} />
                              </button>
                              <button onClick={() => setHistoryOf(q._id)} className={`${icon} bg-slate-light text-ink-soft hover:bg-border-strong`} title="History">
                                <RiHistoryLine size={15} />
                              </button>
                              <button onClick={() => handleDelete(q._id)} className={`${icon} bg-danger-light text-danger hover:opacity-80`} title="Delete">
                                <RiDeleteBin6Line size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-5">
              <button onClick={() => load(page - 1)} disabled={page <= 1} className="rv-btn-secondary !py-1.5 disabled:opacity-40">
                Previous
              </button>
              <span className="text-sm text-slate tabular-nums">
                Page {page} of {pages} · {total.toLocaleString("en-IN")} questions
              </span>
              <button onClick={() => load(page + 1)} disabled={page >= pages} className="rv-btn-secondary !py-1.5 disabled:opacity-40">
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* The same editor the mock review modal opens - one implementation,
          so a fix made in one place is a fix made in both. */}
      {historyOf && (
        <QuestionHistory
          questionId={historyOf}
          onClose={() => setHistoryOf(null)}
          onChanged={() => {
            load();
            loadCounts();
          }}
        />
      )}

      {editing && (
        <QuestionEditor
          question={editing}
          canApprove
          onClose={() => setEditing(null)}
          onSaved={() => {
            load();
            loadCounts();
          }}
        />
      )}
    </div>
  );
}

function Tile({ label, value, tone }) {
  return (
    <Card className="!p-4 flex items-center gap-3">
      <span className={`w-1.5 self-stretch rounded-full ${tone}`} />
      <div className="min-w-0">
        {value == null ? (
          <div className="h-6 w-12 rounded bg-slate-light animate-pulse" />
        ) : (
          <p className="font-display text-xl font-extrabold text-ink tabular-nums">{Number(value).toLocaleString("en-IN")}</p>
        )}
        <p className="text-xs text-slate truncate">{label}</p>
      </div>
    </Card>
  );
}
