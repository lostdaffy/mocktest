import { useEffect, useState } from "react";
import api from "../api/axios";
import { PageHeader } from "../components/ui";
import { useToast } from "../components/Toast";

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

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/questions/reports");
      setReports(res.data.reports);
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      toast.error("Something went wrong");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Students"
        title="Student Reports"
        subtitle="Questions students have flagged as wrong or confusing — review and resolve or hide each one."
      />

      {loading ? (
        <p className="text-slate-soft">Loading...</p>
      ) : reports.length === 0 ? (
        <div className="bg-success-light border border-success-border text-success rounded-lg px-6 py-10 text-center">
          <p className="text-2xl mb-2">✅</p>
          <p className="font-medium">No pending reports — all clear.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <div key={r._id} className="rv-card p-6">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs font-medium bg-danger-light text-danger px-2.5 py-1 rounded-full">
                  {REASON_LABELS[r.reason] || r.reason}
                </span>
                {r.reportedBy && (
                  <span className="text-xs text-slate-soft">
                    {r.reportedBy.name} ({r.reportedBy.phone})
                  </span>
                )}
              </div>

              {r.question ? (
                <>
                  <p className="font-medium text-ink mb-2">{r.question.text}</p>
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {r.question.options.map((opt, idx) => (
                      <div
                        key={idx}
                        className={`text-sm px-2 py-1 rounded ${
                          idx === r.question.correctIndex ? "bg-success-light text-success font-medium" : "text-slate"
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}. {opt} {idx === r.question.correctIndex && "✓"}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-slate mb-4">
                    <b className="text-ink-soft">Solution:</b> {r.question.solution}
                  </p>
                </>
              ) : (
                <p className="text-slate-soft mb-4">(This question has already been deleted)</p>
              )}

              <div className="flex gap-3">
                <button onClick={() => resolve(r._id)} className="px-4 py-2 rounded-lg bg-success hover:bg-success text-white text-sm font-medium">
                  Looks fine — Resolve
                </button>
                {r.question && (
                  <button
                    onClick={() => rejectQuestion(r.question._id)}
                    className="px-4 py-2 rounded-lg bg-danger-light hover:bg-danger-light text-danger text-sm font-medium"
                  >
                    Hide this question
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}