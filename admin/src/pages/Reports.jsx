import { useEffect, useMemo, useState } from "react";
import { RiArrowDownSLine } from "@remixicon/react";
import api from "../api/axios";
import { PageHeader, Card } from "../components/ui";
import { useToast } from "../components/Toast";
import TimeSensitive from "../components/TimeSensitive";

const REASON_LABELS = {
  wrong_answer: "Wrong answer",
  unclear_question: "Unclear question",
  typo: "Typo",
  duplicate_options: "Duplicate options",
  other: "Other",
};

export default function Reports() {
  const toast = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [openId, setOpenId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/questions/reports");
      setReports(res.data.reports);
    } catch {
      // fail quietly
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function resolve(id) {
    try {
      await api.patch(`/questions/reports/${id}/resolve`);
      setReports((prev) => prev.filter((r) => r._id !== id));
      toast.success("Report resolved");
    } catch {
      toast.error("Something went wrong");
    }
  }

  async function rejectQuestion(questionId) {
    const ok = await toast.confirm({
      title: "Reject this question?",
      message: "It will be hidden from students immediately.",
      confirmLabel: "Reject & hide",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.patch(`/questions/${questionId}/reject`, { reason: "Rejected via student report" });
      toast.success("Question hidden from students");
    } catch {
      toast.error("Something went wrong");
    }
  }

  const counts = useMemo(() => {
    const c = {};
    for (const r of reports) c[r.reason] = (c[r.reason] || 0) + 1;
    return c;
  }, [reports]);
  const shown = reason ? reports.filter((r) => r.reason === reason) : reports;

  return (
    <div>
      <PageHeader
        eyebrow="Students"
        title="Student Reports"
        subtitle="Questions students have flagged as wrong or confusing — check each one, then resolve it or hide the question."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        {[
          ["Open reports", reports.length, reports.length ? "bg-danger" : "bg-success"],
          ["Wrong answer", counts.wrong_answer || 0, "bg-warn"],
          ["Unclear or typo", (counts.unclear_question || 0) + (counts.typo || 0), "bg-info"],
          ["Other", (counts.duplicate_options || 0) + (counts.other || 0), "bg-slate-soft"],
        ].map(([label, value, tone]) => (
          <Card key={label} className="!p-4 flex items-center gap-3">
            <span className={`w-1.5 self-stretch rounded-full ${tone}`} />
            <div>
              <p className="font-display text-xl font-extrabold text-ink tabular-nums">{loading ? "—" : value}</p>
              <p className="text-xs text-slate">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="inline-flex flex-wrap rounded-lg border border-border bg-surface p-0.5 mb-4">
        {[["", "All"], ...Object.entries(REASON_LABELS)].map(([key, label]) => (
          <button
            key={key || "all"}
            onClick={() => setReason(key)}
            className={`px-3 py-1.5 text-[13px] font-semibold rounded-md transition-colors ${reason === key ? "bg-brand text-white" : "text-slate hover:text-ink"}`}
          >
            {label}
            {key && counts[key] ? ` (${counts[key]})` : ""}
          </button>
        ))}
      </div>

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <p className="text-slate-soft text-center py-10">Loading...</p>
        ) : shown.length === 0 ? (
          <p className="text-success text-center py-10 font-medium">No pending reports — all clear.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-light/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate">
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Question</th>
                  <th className="px-4 py-3">Our answer</th>
                  <th className="px-4 py-3">Reported by</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {shown.map((r) => {
                  const q = r.question;
                  const open = openId === r._id;
                  return (
                    <tr key={r._id} className="align-top hover:bg-slate-light/40">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[11px] font-semibold bg-danger-light text-danger px-2 py-0.5 rounded-full">{REASON_LABELS[r.reason] || r.reason}</span>
                        {r.createdAt && <p className="text-[11px] text-slate-soft mt-1">{new Date(r.createdAt).toLocaleDateString("en-IN")}</p>}
                      </td>
                      <td className="px-4 py-3 min-w-[300px]">
                        {q ? (
                          <>
                            <button onClick={() => setOpenId(open ? null : r._id)} className="text-left font-medium text-ink hover:text-brand flex items-start gap-1">
                              <span className={open ? "" : "line-clamp-2"}>{q.text}</span>
                              <RiArrowDownSLine size={16} className={`shrink-0 mt-0.5 text-slate-soft transition-transform ${open ? "rotate-180" : ""}`} />
                            </button>
                            {open && (
                              <div className="mt-2 space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {q.options.map((opt, idx) => (
                                    <div key={idx} className={`text-xs px-2 py-1 rounded ${idx === q.correctIndex ? "bg-success-light text-success font-medium" : "bg-slate-light/60 text-slate"}`}>
                                      {String.fromCharCode(65 + idx)}. {opt}
                                    </div>
                                  ))}
                                </div>
                                {q.solution && (
                                  <p className="text-xs text-slate">
                                    <b className="text-ink-soft">Solution:</b> {q.solution}
                                  </p>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-soft">(This question has already been deleted)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 min-w-[110px] text-success font-medium">
                        {q ? `${String.fromCharCode(65 + (q.correctIndex ?? 0))}. ${q.options?.[q.correctIndex] ?? ""}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate whitespace-nowrap">
                        {r.reportedBy ? (
                          <>
                            <p className="text-ink-soft font-medium">{r.reportedBy.name}</p>
                            <p className="tabular-nums">{r.reportedBy.phone}</p>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => resolve(r._id)} className="px-2.5 py-1 rounded-md bg-success text-white text-xs font-semibold whitespace-nowrap hover:opacity-90">
                            Looks fine
                          </button>
                          {q && (
                            <button onClick={() => rejectQuestion(q._id)} className="px-2.5 py-1 rounded-md bg-danger-light text-danger text-xs font-semibold whitespace-nowrap hover:opacity-80">
                              Hide question
                            </button>
                          )}
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

      <div className="mt-6">
        <TimeSensitive />
      </div>
    </div>
  );
}
