import { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { useToast } from "./Toast";

// AI audit of a chapter's LIVE questions. Each one is solved again; an
// answer the checker disputes twice leaves the bank and its test gets a
// replacement. It walks the chapter a batch at a time and remembers where it
// got to, so a stop for the day's AI allowance carries on later from there.
const BATCH = 12;
const key = (chapter) => `rv-audit:${chapter}`;

function readSaved(chapter) {
  try {
    return JSON.parse(localStorage.getItem(key(chapter)) || "null");
  } catch {
    return null;
  }
}
function save(chapter, value) {
  try {
    localStorage.setItem(key(chapter), JSON.stringify(value));
  } catch {
    // only the resume point is lost
  }
}

const EMPTY = { next: null, looked: 0, kept: 0, repaired: 0, secondOpinionKept: 0, removed: 0, replaced: 0, retired: [], done: false };

export default function ChapterAudit() {
  const toast = useToast();
  const [chapter, setChapter] = useState("Number System");
  const [run, setRun] = useState(() => readSaved("Number System") || EMPTY);
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState("");
  const stopRef = useRef(false);

  useEffect(() => {
    setRun(readSaved(chapter) || EMPTY);
    setNote("");
  }, [chapter]);

  async function start() {
    stopRef.current = false;
    setRunning(true);
    let state = run.done ? EMPTY : run;
    try {
      while (!stopRef.current) {
        const res = await api.post("/questions/audit", { chapter, after: state.next || undefined, limit: BATCH });
        const r = res.data;
        const replaced = (r.refilled || []).reduce((n, t) => n + (t.added || 0), 0);
        state = {
          next: r.next || state.next,
          looked: state.looked + r.looked,
          kept: state.kept + r.kept,
          repaired: state.repaired + r.repaired,
          secondOpinionKept: state.secondOpinionKept + r.secondOpinionKept,
          removed: state.removed + r.deleted + r.keptForHistory,
          replaced: state.replaced + replaced,
          retired: [...state.retired, ...(r.retired || [])].slice(-200),
          done: r.done,
        };
        setRun(state);
        save(chapter, state);
        setNote(r.message || "");
        if (r.done) {
          toast.success(`${chapter}: audit finished`);
          break;
        }
        if (r.stopped) {
          toast.error("The AI could not check more right now - press Start again later to carry on");
          break;
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "The audit stopped on an error - press Start to carry on");
    } finally {
      setRunning(false);
    }
  }

  function reset() {
    setRun(EMPTY);
    save(chapter, EMPTY);
    setNote("");
  }

  return (
    <div className="rv-card p-5 mb-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <p className="font-semibold text-ink">AI audit of live questions</p>
          <p className="text-xs text-slate-soft">
            Solves every live question of the chapter again. A question the AI disputes twice is removed and its
            test gets a new one.
          </p>
        </div>
        <input
          value={chapter}
          onChange={(e) => setChapter(e.target.value)}
          disabled={running}
          placeholder="Chapter"
          className="rv-input max-w-[200px]"
        />
        {running ? (
          <button onClick={() => (stopRef.current = true)} className="rv-btn-secondary">
            Stop after this batch
          </button>
        ) : (
          <button onClick={start} disabled={!chapter.trim()} className="rv-btn-primary disabled:opacity-60">
            {run.done ? "Audit again" : run.looked ? "Carry on" : "Start audit"}
          </button>
        )}
        {!running && run.looked > 0 && (
          <button onClick={reset} className="text-xs text-slate-soft hover:text-ink">
            Start over
          </button>
        )}
      </div>

      {run.looked > 0 && (
        <div className="mt-4 text-sm text-ink-soft flex flex-wrap gap-x-5 gap-y-1">
          <span>Checked {run.looked}</span>
          <span>Sound {run.kept}</span>
          {run.repaired > 0 && <span>Mended {run.repaired}</span>}
          {run.secondOpinionKept > 0 && <span>Kept after 2nd check {run.secondOpinionKept}</span>}
          <span className={run.removed ? "text-danger font-medium" : ""}>Removed {run.removed}</span>
          <span>Replacements added {run.replaced}</span>
          {running && <span className="text-brand">Checking...</span>}
          {run.done && <span className="text-success font-medium">Finished</span>}
        </div>
      )}
      {note && <p className="mt-2 text-xs text-slate-soft">{note}</p>}

      {run.retired.length > 0 && (
        <details className="mt-3">
          <summary className="text-sm cursor-pointer text-ink">Removed questions ({run.retired.length})</summary>
          <ul className="mt-2 space-y-2 text-xs text-ink-soft max-h-72 overflow-y-auto">
            {run.retired.map((q) => (
              <li key={q._id} className="border-l-2 border-danger pl-2">
                <p>{q.text}</p>
                <p className="text-slate-soft">{q.reason}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
