import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "./AuthContext";
import { useToast } from "../components/Toast";

// What the Generation queue is doing, for every page of the panel.
//
// The queue runs on the server, but its news used to live only on the
// Generation page: press "Build" on Subject Practice and the only sign was a
// toast that vanished in four seconds - nothing said the test was waiting,
// being built, done, or failed. This polls GET /generation/activity and:
//
//  - keeps the running job and the waiting list, so any page can show the
//    jobs that concern it ("Topping up...", "3rd in line");
//  - raises a notification, wherever the admin is, for every job that
//    finishes - built, or failed with its reason - with a link to it;
//  - tells pages a job of theirs finished, so they refresh themselves.

const Ctx = createContext(null);

function linkFor(job) {
  if (job.kind === "practice" || job.kind === "top_up") {
    if (!job.subject || !job.chapter) return "/practice-series";
    const p = new URLSearchParams({ subject: job.subject, chapter: job.chapter });
    if (job.subtopic) p.set("sub", job.subtopic);
    if (job.difficulty) p.set("level", job.difficulty);
    return `/practice-series?${p}`;
  }
  if (job.kind === "mock") return job.examType ? `/exam-series/${job.examType}` : "/exam-series";
  if (job.kind === "daily_quiz") return job.quizDate ? `/daily-quiz?date=${job.quizDate}` : "/daily-quiz";
  return "/generation";
}

const shortResult = (s) => String(s || "").replace(/\s+/g, " ").slice(0, 160);

export function GenerationActivityProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const since = useRef(null);
  const listeners = useRef(new Set());
  const timer = useRef(null);
  // Held in refs: both change identity on every render, and the poll loop
  // must not restart each time a toast appears.
  const toastRef = useRef(toast);
  const navigateRef = useRef(navigate);
  toastRef.current = toast;
  navigateRef.current = navigate;

  const poll = useCallback(async () => {
    try {
      const res = await api.get("/generation/activity", { params: since.current ? { since: since.current } : {} });
      const a = res.data;
      // The first answer only sets the clock: jobs that finished before the
      // panel was opened are not news.
      if (since.current) {
        for (const job of a.finished || []) {
          const ok = job.status === "done";
          const what = job.kind === "top_up" ? "Topped up" : job.kind === "mock" ? "Mock built" : job.kind === "daily_quiz" ? "Daily quiz ready" : "Test built";
          toastRef.current.notify({
            variant: ok ? "success" : "error",
            title: ok ? what : "Generation failed",
            message: `${job.testTitle || job.label}${ok ? (job.result ? ` - ${shortResult(job.result)}` : "") : ` - ${shortResult(job.lastError) || "no reason given"}`}`,
            sticky: !ok,
            duration: 9000,
            actionLabel: ok ? "Open" : "See the queue",
            onAction: () => navigateRef.current(ok ? linkFor(job) : "/generation"),
          });
          listeners.current.forEach((fn) => fn(job));
        }
      }
      since.current = a.serverTime;
      setActivity(a);
      return a;
    } catch {
      return null;
    }
  }, []);

  // Quick while something is happening, slow when idle, none when signed
  // out or the tab is hidden.
  useEffect(() => {
    if (!user) {
      setActivity(null);
      since.current = null;
      return undefined;
    }
    let stopped = false;
    const loop = async () => {
      if (stopped) return;
      const a = document.hidden ? null : await poll();
      const busy = a && (a.running || a.waiting?.length);
      timer.current = setTimeout(loop, busy ? 5000 : 20000);
    };
    loop();
    const onVisible = () => !document.hidden && poll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, poll]);

  const onFinished = useCallback((fn) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);

  return <Ctx.Provider value={{ activity, refresh: poll, onFinished, linkFor }}>{children}</Ctx.Provider>;
}

export function useGenerationActivity() {
  return useContext(Ctx) || { activity: null, refresh: async () => null, onFinished: () => () => {}, linkFor };
}

/** Calls fn(job) whenever a job finishes; fn should check whether it cares. */
export function useGenerationFinished(fn) {
  const { onFinished } = useGenerationActivity();
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => onFinished((job) => ref.current(job)), [onFinished]);
}

/** The running and waiting jobs that pass `match`, with their place in line. */
export function useJobs(match) {
  const { activity } = useGenerationActivity();
  if (!activity) return [];
  const list = [];
  if (activity.running && match(activity.running)) list.push({ ...activity.running, position: 0 });
  (activity.waiting || []).forEach((j, i) => match(j) && list.push({ ...j, position: i + 1 + (activity.running ? 1 : 0) }));
  return list;
}
