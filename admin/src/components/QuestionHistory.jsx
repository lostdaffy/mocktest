import { useEffect, useState } from "react";
import api from "../api/axios";
import { useToast } from "./Toast";
import { Modal } from "./ui";

// Every change to one question - who made it, what changed - and an Undo for
// each. An undo is itself recorded, so nothing is ever lost.
const ACTIONS = {
  create: "Created",
  edit: "Edited",
  ai_fix: "Corrected by the AI",
  ai_replace: "AI replacement",
  replaced: "Replaced",
  status: "Status changed",
  retire: "Retired",
  delete: "Deleted",
  restore: "Undo",
};
const SHOWN = ["text", "options", "correctIndex", "solution", "textHi", "optionsHi", "solutionHi", "status", "difficulty", "topic"];

export default function QuestionHistory({ questionId, onClose, onChanged }) {
  const toast = useToast();
  const [rows, setRows] = useState(null);

  async function load() {
    try {
      const r = await api.get(`/quality/questions/${questionId}/history`);
      setRows(r.data.history || []);
    } catch (err) {
      toast.error("Couldn't load the history");
      setRows([]);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId]);

  async function undo(rev) {
    const ok = await toast.confirm({
      title: "Undo this change?",
      message: "The question goes back to how it was just before it. This is recorded too, so it can be undone again.",
      confirmLabel: "Undo",
    });
    if (!ok) return;
    try {
      const r = await api.post(`/quality/questions/${questionId}/restore`, { revisionId: rev._id });
      toast.success(r.data.message || "Done");
      load();
      onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't undo it");
    }
  }

  return (
    <Modal open onClose={onClose} title="Question history" subtitle="Every change, newest first">
      {rows === null && <p className="text-sm text-slate-soft">Loading...</p>}
      {rows?.length === 0 && <p className="text-sm text-slate-soft">No changes recorded yet.</p>}
      <div className="space-y-3">
        {(rows || []).map((h) => {
          const changed = SHOWN.filter((f) => JSON.stringify(h.before?.[f]) !== JSON.stringify(h.after?.[f]) && (h.before?.[f] !== undefined || h.after?.[f] !== undefined));
          return (
            <div key={h._id} className="border border-border-soft rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">
                  {ACTIONS[h.action] || h.action} <span className="text-xs text-slate-soft font-normal">by {h.by} · {new Date(h.createdAt).toLocaleString("en-IN")}</span>
                </p>
                {h.before && (
                  <button onClick={() => undo(h)} className="rv-btn-secondary !text-xs shrink-0">
                    Undo this
                  </button>
                )}
              </div>
              {h.note && <p className="text-xs text-slate mt-1">{h.note}</p>}
              {changed.length > 0 && h.before && h.after && (
                <div className="mt-2 space-y-1">
                  {changed.map((f) => (
                    <div key={f} className="text-xs">
                      <span className="text-slate-soft">{f}: </span>
                      <span className="line-through text-danger">{show(h.before[f])}</span>
                      <span className="text-slate-soft"> → </span>
                      <span className="text-success">{show(h.after[f])}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function show(v) {
  if (v === undefined || v === null || v === "") return "(empty)";
  if (Array.isArray(v)) return v.join(" | ");
  const s = String(v);
  return s.length > 300 ? s.slice(0, 300) + "…" : s;
}
