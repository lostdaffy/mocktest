import { useEffect, useMemo, useState } from "react";
import { RiSendPlaneLine, RiNotification3Line, RiSmartphoneLine, RiGroupLine } from "@remixicon/react";
import api from "../api/axios";
import { PageHeader, Card, Field, Input, Select, Textarea, Button, Badge, EmptyState, SectionTitle } from "../components/ui";
import { useToast } from "../components/Toast";

// A message from the admin to many students at once: a push notification,
// and the same message in the app's Notifications list for 14 days (so a
// phone that missed the push still shows it). Never to blocked students.
const TITLE_MAX = 65;
const BODY_MAX = 240;
const SCREENS = [
  ["", "Nothing (just the message)"],
  ["HomeTab", "Home"],
  ["LiveTab", "Live exams"],
  ["Subscription", "Upgrade / plans"],
  ["ExamSeries", "That exam's mock series"],
];
const AUDIENCE_LABEL = (a, examName) =>
  a?.kind === "exam" ? `${examName(a.exam)} students` : a?.kind === "paid" ? "Paid students" : a?.kind === "free" ? "Free students" : "All students";

export default function Broadcasts() {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState("all");
  const [exam, setExam] = useState("");
  const [screen, setScreen] = useState("");
  const [reach, setReach] = useState(null);
  const [exams, setExams] = useState([]);
  const [names, setNames] = useState({});
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const examName = (code) => names[code] || code;
  const audience = useMemo(() => (kind === "exam" ? { kind, exam } : { kind }), [kind, exam]);

  async function loadHistory() {
    try {
      const res = await api.get("/admin/broadcasts");
      setHistory(res.data.items || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
    api
      .get("/exams")
      .then((res) => setNames(Object.fromEntries((res.data.patterns || []).map((p) => [p.examType, p.displayName]))))
      .catch(() => {});
  }, []);

  // How many it will reach, whenever the audience changes.
  useEffect(() => {
    if (kind === "exam" && !exam) {
      setReach(null);
      return;
    }
    let live = true;
    api
      .post("/admin/broadcasts/preview", { audience })
      .then((res) => {
        if (!live) return;
        setReach(res.data);
        setExams(res.data.exams || []);
      })
      .catch(() => live && setReach(null));
    return () => {
      live = false;
    };
  }, [audience, kind, exam]);

  // While a message is still going out, refresh its counts.
  useEffect(() => {
    if (!history.some((h) => h.status === "sending")) return;
    const t = setTimeout(loadHistory, 3000);
    return () => clearTimeout(t);
  }, [history]);

  useEffect(() => {
    if (screen === "ExamSeries" && kind !== "exam") setScreen("");
  }, [kind, screen]);

  async function send(e) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return toast.error("Write both a title and a message");
    if (kind === "exam" && !exam) return toast.error("Choose the exam");
    const who = AUDIENCE_LABEL(audience, examName);
    const ok = await toast.confirm({
      title: `Send to ${reach?.students ?? "?"} student(s)?`,
      message: `${who}. "${title.trim()}" goes to ${reach?.phones ?? 0} phone(s) with notifications on, and stays in the app's Notifications list for 14 days. A sent message cannot be taken back.`,
      confirmLabel: "Send now",
    });
    if (!ok) return;
    setSending(true);
    try {
      const res = await api.post("/admin/broadcasts", { title, body, audience, screen });
      toast.success(res.data.message || "Sending");
      setTitle("");
      setBody("");
      setScreen("");
      loadHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Students"
        title="Notifications"
        subtitle="Send a message to all students, one exam's students, or paid or free students — new mocks, form dates, results. Nothing is sent until you press Send and confirm."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        {[
          ["Messages sent", history.length, "bg-brand"],
          ["Phones reached", history.reduce((n, h) => n + (h.delivered || 0), 0), "bg-success"],
          ["Sending now", history.filter((h) => h.status === "sending").length, "bg-info"],
          ["Failed", history.filter((h) => h.status === "failed").length, history.some((h) => h.status === "failed") ? "bg-danger" : "bg-slate-soft"],
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

      <form onSubmit={send}>
        <Card className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Send to">
                  <Select value={kind} onChange={(e) => setKind(e.target.value)}>
                    <option value="all">All students</option>
                    <option value="exam">Students of one exam</option>
                    <option value="paid">Paid students</option>
                    <option value="free">Free students</option>
                  </Select>
                </Field>
                {kind === "exam" && (
                  <Field label="Exam">
                    <Select value={exam} onChange={(e) => setExam(e.target.value)}>
                      <option value="">Choose an exam</option>
                      {exams.map((x) => (
                        <option key={x.exam} value={x.exam}>
                          {examName(x.exam)} ({x.students})
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
              </div>

              <Field label="Title" hint={`${title.length}/${TITLE_MAX} — longer titles are cut off on the phone`}>
                <Input value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="New SSC CGL mocks are live" />
              </Field>
              <Field label="Message" hint={`${body.length}/${BODY_MAX}`}>
                <Textarea
                  rows={3}
                  value={body}
                  maxLength={BODY_MAX}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Five full-length mocks with all-India rank. Try one today."
                />
              </Field>
              <Field label="When tapped in the app's Notifications list, open">
                <Select value={screen} onChange={(e) => setScreen(e.target.value)}>
                  {SCREENS.filter(([v]) => v !== "ExamSeries" || kind === "exam").map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {/* What the student sees, and how many it reaches */}
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-slate-light/50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-soft mb-2">On the phone</p>
                <div className="rounded-md bg-surface border border-border p-3 shadow-sm">
                  <div className="flex items-center gap-2 text-[11px] text-slate-soft mb-1">
                    <RiNotification3Line size={13} /> Rankveer · now
                  </div>
                  <p className="text-sm font-semibold text-ink break-words">{title.trim() || "Title"}</p>
                  <p className="text-xs text-slate mt-0.5 break-words line-clamp-3">{body.trim() || "Your message"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[11px] text-slate-soft flex items-center gap-1">
                    <RiGroupLine size={13} /> Students
                  </p>
                  <p className="text-xl font-bold text-ink">{reach ? reach.students : "—"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[11px] text-slate-soft flex items-center gap-1">
                    <RiSmartphoneLine size={13} /> Phones
                  </p>
                  <p className="text-xl font-bold text-ink">{reach ? reach.phones : "—"}</p>
                </div>
              </div>
              <p className="text-xs text-slate-soft">
                Phones = students with notifications on. Everyone in the audience also sees it in the app's Notifications list for 14 days.
                Blocked students never get it.
              </p>
              <Button type="submit" icon={RiSendPlaneLine} loading={sending} disabled={!reach?.students} className="w-full justify-center">
                Send
              </Button>
            </div>
          </div>
        </Card>
      </form>

      <SectionTitle title="Sent" hint="The last 50 messages" />
      {loading ? (
        <p className="text-slate-soft text-center py-10">Loading...</p>
      ) : history.length === 0 ? (
        <EmptyState icon={RiNotification3Line} title="No message sent yet" text="Your messages and how many phones they reached will show here." />
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-light/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate">
                  <th className="px-4 py-3 whitespace-nowrap">Sent</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3 min-w-[150px]">Reached</th>
                  <th className="px-4 py-3">Opens</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {history.map((h) => {
                  const pct = h.phones ? Math.round((h.delivered / h.phones) * 100) : 0;
                  return (
                    <tr key={h._id} className="align-top hover:bg-slate-light/40">
                      <td className="px-4 py-3 whitespace-nowrap text-slate tabular-nums text-xs">
                        {new Date(h.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 min-w-[260px]">
                        <p className="font-semibold text-ink break-words">{h.title}</p>
                        <p className="text-xs text-slate mt-0.5 break-words line-clamp-2">{h.body}</p>
                        {h.problems?.length > 0 && <p className="text-xs text-danger mt-1">{h.problems.join("; ")}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate whitespace-nowrap">
                        {AUDIENCE_LABEL(h.audience, examName)}
                        <p className="text-slate-soft">{h.students} student(s)</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-light overflow-hidden min-w-[60px]">
                            <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs tabular-nums text-slate whitespace-nowrap">
                            {h.delivered}/{h.phones}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate whitespace-nowrap">{h.screen ? SCREENS.find(([v]) => v === h.screen)?.[1] || h.screen : "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge tone={h.status === "done" ? "success" : h.status === "failed" ? "danger" : "info"} dot>
                          {h.status === "done" ? "Sent" : h.status === "failed" ? "Failed" : "Sending"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
