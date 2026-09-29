import { useState } from "react";
import api from "../api/axios";
import { useToast } from "./Toast";

// One editor for a question, wherever it is being looked at.
//
// The review queue had a perfectly good one and the mock review modal had
// none at all - a bad question inside a mock could only be removed, which
// meant regenerating a replacement for something that was one wrong digit
// away from correct. Rather than write a second editor that would drift from
// the first, both open this.
//
// It saves through PUT /questions/:id, the one endpoint that already knows
// how to validate a question, so "save" means the same thing on every page.
export default function QuestionEditor({ question, onClose, onSaved, canApprove = false, note }) {
  const toast = useToast();
  const [draft, setDraft] = useState({ ...question });
  const [saving, setSaving] = useState(false);
  // What the quality gate would have said. The save has already happened -
  // these are here so a wrong answer key does not leave this screen unseen.
  const [warnings, setWarnings] = useState([]);

  const set = (patch) => {
    setWarnings([]);
    setDraft((d) => ({ ...d, ...patch }));
  };

  async function save({ approve } = {}) {
    if (!String(draft.text || "").trim()) return toast.error("The question needs some text");
    if ((draft.options || []).some((o) => !String(o || "").trim()))
      return toast.error("Every option needs an answer in it");

    setSaving(true);
    try {
      const res = await api.put(`/questions/${draft._id}`, draft);
      const found = res.data?.warnings || [];
      if (approve) await api.patch(`/questions/${draft._id}/approve`);
      onSaved?.(res.data?.question || draft);

      // Saved either way - the admin has the last word. But if the checks
      // found something, stay open and say so rather than closing over it.
      if (found.length) {
        setWarnings(found);
        toast.error("Saved, but have a look at this");
        return;
      }
      toast.success(approve ? "Fixed and approved" : "Question saved");
      onClose();
    } catch (err) {
      toast.error("Save failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-surface rounded-lg w-full max-w-2xl max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border-soft">
          <h3 className="font-semibold text-ink">Fix question</h3>
          <button onClick={onClose} className="text-slate-soft hover:text-slate text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {warnings.length > 0 && (
            <div className="text-xs bg-danger-light text-danger rounded-lg px-3 py-2 space-y-1">
              <p className="font-semibold">Saved — but these still look wrong:</p>
              {warnings.map((w, i) => (
                <p key={i}>• {w}</p>
              ))}
            </div>
          )}

          {draft.flagReason && (
            <p className="text-xs bg-warn-light text-warn rounded-lg px-3 py-2">{draft.flagReason}</p>
          )}
          {/* A question belongs to the bank, not to the test it is being read
              in, so a fix made here shows up everywhere it is used. */}
          {note && <p className="text-xs bg-slate-light text-slate rounded-lg px-3 py-2">{note}</p>}

          <Field label="Question (English)" value={draft.text} onChange={(v) => set({ text: v })} textarea />
          <Field label="Question (Hindi)" value={draft.textHi || ""} onChange={(v) => set({ textHi: v })} textarea />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(draft.options || []).map((opt, i) => (
              <Field
                key={i}
                label={`Option ${String.fromCharCode(65 + i)}${i === draft.correctIndex ? " (correct)" : ""}`}
                value={opt}
                onChange={(v) => {
                  const options = [...draft.options];
                  options[i] = v;
                  set({ options });
                }}
              />
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1.5">Correct option</label>
            <select
              value={draft.correctIndex ?? 0}
              onChange={(e) => set({ correctIndex: Number(e.target.value) })}
              className="rv-input"
            >
              {[0, 1, 2, 3].map((i) => (
                <option key={i} value={i}>
                  {String.fromCharCode(65 + i)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(draft.optionsHi || ["", "", "", ""]).map((opt, i) => (
              <Field
                key={i}
                label={`Hindi option ${String.fromCharCode(65 + i)}`}
                value={opt}
                onChange={(v) => {
                  const optionsHi = [...(draft.optionsHi || ["", "", "", ""])];
                  optionsHi[i] = v;
                  set({ optionsHi });
                }}
              />
            ))}
          </div>

          <Field label="Solution (English)" value={draft.solution || ""} onChange={(v) => set({ solution: v })} textarea />
          <Field label="Solution (Hindi)" value={draft.solutionHi || ""} onChange={(v) => set({ solutionHi: v })} textarea />
        </div>

        <div className="p-5 border-t border-border-soft flex gap-3">
          {canApprove ? (
            <>
              <button onClick={() => save({ approve: true })} disabled={saving} className="flex-1 rv-btn-primary disabled:opacity-60">
                {saving ? "Saving..." : "Save & approve"}
              </button>
              <button onClick={() => save()} disabled={saving} className="rv-btn-secondary disabled:opacity-60">
                Save only
              </button>
            </>
          ) : (
            <button onClick={() => save()} disabled={saving} className="flex-1 rv-btn-primary disabled:opacity-60">
              {saving ? "Saving..." : "Save changes"}
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-light text-slate text-sm font-medium">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, textarea }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink-soft mb-1.5">{label}</label>
      {textarea ? (
        <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} className="rv-input !py-2" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="rv-input" />
      )}
    </div>
  );
}
