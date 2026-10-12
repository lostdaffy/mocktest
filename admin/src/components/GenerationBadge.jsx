import { Link } from "react-router-dom";
import { useGenerationActivity } from "../context/GenerationActivity";

// The queue at a glance, in the topbar of every page: what is being built
// and how much is waiting, or that the queue is paused. Nothing when idle.
export default function GenerationBadge() {
  const { activity } = useGenerationActivity();
  if (!activity) return null;
  const waiting = activity.waiting?.length || 0;
  const running = activity.running;
  if (!running && !waiting && !activity.paused) return null;

  if (activity.paused && waiting) {
    return (
      <Link
        to="/generation"
        title={activity.pausedReason || "The queue is paused"}
        className="h-9 px-3 rounded-xs border border-warn-border bg-warn-light text-warn text-[12.5px] font-semibold inline-flex items-center gap-2 max-w-[46vw]"
      >
        <span className="w-2 h-2 rounded-full bg-warn shrink-0" />
        <span className="truncate">Queue paused · {waiting} waiting</span>
      </Link>
    );
  }

  return (
    <Link
      to="/generation"
      title={running ? `Building: ${running.testTitle || running.label}` : "Waiting to start"}
      className="h-9 px-3 rounded-xs border border-brand/30 bg-brand/10 text-brand text-[12.5px] font-semibold inline-flex items-center gap-2 max-w-[46vw]"
    >
      <span className="inline-block w-3.5 h-3.5 border-2 border-brand/30 border-t-brand rounded-full animate-spin shrink-0" />
      <span className="truncate">
        {running ? `Building: ${running.testTitle || running.label}` : "Starting"}
        {waiting ? ` · ${waiting} waiting` : ""}
      </span>
    </Link>
  );
}
