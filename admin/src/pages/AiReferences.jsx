import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { PageHeader, Card, Button, Badge, Field, Input, Select, Textarea, Alert, EmptyState, LoadingState } from "../components/ui";
import { useToast } from "../components/Toast";
import { RiBrainLine, RiUploadCloud2Line, RiAddLine } from "@remixicon/react";

// Reference papers the AI learns the level and style from. The AI reads each
// one once and writes down how it is built; only that goes into its prompts.
// The reference's own questions are kept only to throw out any new question
// that copies one.

function readFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("The file could not be read"));
    r.readAsDataURL(file);
  });
}

const STATUS = {
  queued: { tone: "neutral", label: "Waiting to be read" },
  reading: { tone: "info", label: "Reading..." },
  ready: { tone: "success", label: "Learned" },
  failed: { tone: "danger", label: "Could not read" },
};

export default function AiReferences() {
  const toast = useToast();
  const [refs, setRefs] = useState(null);
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({ examType: "", subject: "", title: "", mode: "pdf", text: "" });
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState("own");
  const [openId, setOpenId] = useState(null);
  const [busy, setBusy] = useState("");
  const fileInput = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/references");
      setRefs(res.data.references);
    } catch {
      setRefs([]);
    }
  }, []);

  useEffect(() => {
    load();
    api.get("/exams").then((r) => setExams(r.data.patterns || [])).catch(() => {});
    api.get("/subjects").then((r) => setSubjects(r.data.subjects || r.data || [])).catch(() => {});
  }, [load]);

  // Keep checking while something is still being read.
  useEffect(() => {
    if (!refs?.some((r) => r.status === "queued" || r.status === "reading")) return;
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [refs, load]);

  async function add(e) {
    e.preventDefault();
    if (!form.examType) return toast.error("Choose the exam first");
    setSaving(true);
    try {
      const body = { examType: form.examType, subject: form.subject, title: form.title };
      if (form.mode === "pdf") {
        if (!files[0]) throw new Error("Choose a PDF");
        body.pdf = await readFile(files[0]);
        body.fileName = files[0].name;
        if (!body.title) body.title = files[0].name.replace(/\.pdf$/i, "");
      } else if (form.mode === "images") {
        if (!files.length) throw new Error("Choose one or more pictures");
        body.images = await Promise.all(files.map(readFile));
        body.fileName = files.map((f) => f.name).join(", ").slice(0, 120);
      } else {
        if (!form.text.trim()) throw new Error("Paste some text");
        body.text = form.text;
      }
      const res = await api.post("/references", body);
      toast.success(res.data.message || "Reference added");
      setForm((f) => ({ ...f, title: "", text: "" }));
      setFiles([]);
      if (fileInput.current) fileInput.current.value = "";
      setShowAdd(false);
      setTab("own");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Could not add it");
    } finally {
      setSaving(false);
    }
  }

  async function quick(r, kind, fn) {
    setBusy(r._id + kind);
    try {
      const res = await fn();
      toast.success(res.data.message || "Done");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setBusy("");
    }
  }

  const examName = (t) => (t === "ALL" ? "All exams" : exams.find((x) => x.examType === t)?.displayName || t);
  const own = (refs || []).filter((r) => r.kind !== "lessons");
  const lessons = (refs || []).filter((r) => r.kind === "lessons");
  const shown = tab === "own" ? own : lessons;
  const learned = own.filter((r) => r.status === "ready" && r.active).length;
  const attention = own.filter((r) => r.status === "failed" || !r.active).length;
  const opened = (refs || []).find((r) => r._id === openId);

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="AI References"
        subtitle="Papers that show the level you want. The AI learns how they are built - level, topic weight, formats, traps - and writes new questions to that standard. It never copies them."
        actions={
          <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
            <RiAddLine size={16} /> {showAdd ? "Close" : "Add reference"}
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <Tile label="References" value={refs ? own.length : null} tone="bg-brand" />
        <Tile label="Learned and on" value={refs ? learned : null} tone="bg-success" />
        <Tile label="Off or could not read" value={refs ? attention : null} tone={attention ? "bg-warn" : "bg-slate-soft"} />
        <Tile label="Lessons from its own mistakes" value={refs ? lessons.length : null} tone="bg-info" />
      </div>

      {showAdd && (
        <Card className="mb-5">
          <Alert tone="info" className="mb-4">
            What the AI keeps from a reference is a description of how it is built - you can read and edit it. The reference's own questions
            are never given to the AI to write from; they only block any new question that copies one, even with the numbers changed.
          </Alert>
          <form onSubmit={add} className="grid gap-4 md:grid-cols-2">
            <Field label="Exam">
              <Select value={form.examType} onChange={(e) => setForm({ ...form, examType: e.target.value })}>
                <option value="">Choose...</option>
                <option value="ALL">All exams</option>
                {exams.map((x) => (
                  <option key={x.examType} value={x.examType}>
                    {x.displayName}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Subject" hint="Leave empty if the reference covers the whole paper">
              <Select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
                <option value="">Whole paper</option>
                {subjects.map((s) => (
                  <option key={s._id || s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Name" hint="So you can recognise it later">
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Coaching mock - PET set 3" />
            </Field>
            <Field label="What are you giving">
              <Select
                value={form.mode}
                onChange={(e) => {
                  setForm({ ...form, mode: e.target.value });
                  setFiles([]);
                }}
              >
                <option value="pdf">A PDF</option>
                <option value="images">Screenshots / photos (up to 12)</option>
                <option value="text">Pasted text</option>
              </Select>
            </Field>
            <div className="md:col-span-2">
              {form.mode === "text" ? (
                <Textarea rows={8} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Paste the questions or notes here" />
              ) : (
                <label className="flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-border-strong hover:border-brand cursor-pointer text-sm text-slate">
                  <RiUploadCloud2Line size={18} className="text-brand" />
                  <span className="truncate">{files.length ? files.map((f) => f.name).join(", ") : form.mode === "pdf" ? "Choose a PDF" : "Choose pictures"}</span>
                  <input
                    ref={fileInput}
                    type="file"
                    accept={form.mode === "pdf" ? "application/pdf" : "image/png,image/jpeg,image/webp"}
                    multiple={form.mode === "images"}
                    onChange={(e) => setFiles([...e.target.files])}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <div className="md:col-span-2">
              <Button type="submit" loading={saving} icon={RiUploadCloud2Line}>
                Add reference
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-1 border-b border-border mb-4">
        {[
          ["own", "Your references", own.length],
          ["lessons", "Learned from its own mistakes", lessons.length],
        ].map(([key, label, n]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 -mb-px text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              tab === key ? "border-brand text-brand" : "border-transparent text-slate hover:text-ink"
            }`}
          >
            {label}
            <span className="text-[11px] px-1.5 py-0.5 rounded-full tabular-nums bg-slate-light text-slate">{n}</span>
          </button>
        ))}
      </div>

      {tab === "lessons" && (
        <p className="text-sm text-slate mb-3">
          Once a day the AI reads why its questions were thrown out - by the checks, by you, or by students' answers - and writes lessons for
          itself, subject by subject.
        </p>
      )}

      {refs === null ? (
        <LoadingState />
      ) : shown.length === 0 ? (
        tab === "own" ? (
          <EmptyState icon={RiBrainLine} title="No references yet" text='Press "Add reference" to give it a mock or past paper that sets the standard.' />
        ) : (
          <p className="text-sm text-slate-soft">Nothing yet - lessons appear once a subject has a few rejected questions.</p>
        )
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-light/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Exam</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Status</th>
                  {tab === "own" && <th className="px-4 py-3 text-right whitespace-nowrap">Kept to block copies</th>}
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {shown.map((r) => {
                  const st = STATUS[r.status] || STATUS.queued;
                  return (
                    <tr key={r._id} className={`align-middle hover:bg-slate-light/40 transition-colors ${r.active ? "" : "opacity-70"}`}>
                      <td className="px-4 py-3 min-w-[220px]">
                        <button onClick={() => setOpenId(r._id)} className="font-semibold text-ink hover:text-brand text-left">
                          {r.title}
                        </button>
                        {r.blueprint?.summary && <p className="text-xs text-slate-soft line-clamp-1 mt-0.5">{r.blueprint.summary}</p>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink-soft">{examName(r.examType)}</td>
                      <td className="px-4 py-3 text-slate">{r.subject || "Whole paper"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge tone={st.tone} dot>
                          {st.label}
                        </Badge>
                        {!r.active && (
                          <Badge tone="warn" className="ml-1">
                            Off
                          </Badge>
                        )}
                      </td>
                      {tab === "own" && <td className="px-4 py-3 text-right tabular-nums text-slate">{r.stemCount || 0}</td>}
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          {r.status === "ready" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              loading={busy === r._id + "toggle"}
                              onClick={() => quick(r, "toggle", () => api.patch(`/references/${r._id}`, { active: !r.active }))}
                            >
                              {r.active ? "Switch off" : "Switch on"}
                            </Button>
                          )}
                          {r.status === "failed" && (
                            <Button size="sm" variant="secondary" loading={busy === r._id + "retry"} onClick={() => quick(r, "retry", () => api.post(`/references/${r._id}/retry`))}>
                              Try again
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => setOpenId(r._id)}>
                            Open
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {opened && (
        <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setOpenId(null)}>
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button onClick={() => setOpenId(null)} className="text-white/80 hover:text-white text-sm font-semibold">
                Close ✕
              </button>
            </div>
            <ReferenceCard
              r={opened}
              examName={examName}
              onChange={load}
              onRemoved={() => {
                setOpenId(null);
                load();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, tone }) {
  return (
    <Card className="!p-4 flex items-center gap-3">
      <span className={`w-1.5 self-stretch rounded-full ${tone}`} />
      <div className="min-w-0">
        {value == null ? <div className="h-6 w-10 rounded bg-slate-light animate-pulse" /> : <p className="font-display text-xl font-extrabold text-ink tabular-nums">{value}</p>}
        <p className="text-xs text-slate truncate">{label}</p>
      </div>
    </Card>
  );
}

function ReferenceCard({ r, examName, onChange, onRemoved }) {
  const toast = useToast();
  const [text, setText] = useState(r.guideText || "");
  const [busy, setBusy] = useState("");
  const st = STATUS[r.status] || STATUS.queued;
  const b = r.blueprint || {};

  useEffect(() => setText(r.guideText || ""), [r.guideText]);

  async function act(kind, fn, after = onChange) {
    setBusy(kind);
    try {
      const res = await fn();
      toast.success(res.data.message || "Done");
      after();
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    const ok = await toast.confirm({ title: `Remove "${r.title}"?`, message: "New questions stop following it. Questions already made stay.", confirmLabel: "Remove", danger: true });
    if (ok) act("delete", () => api.delete(`/references/${r._id}`), onRemoved);
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="font-semibold text-ink">{r.title}</span>
        <Badge tone={st.tone} dot>
          {st.label}
        </Badge>
        <Badge tone="brand">{examName(r.examType)}</Badge>
        {r.subject && <Badge>{r.subject}</Badge>}
        {!r.active && <Badge tone="warn">Switched off</Badge>}
      </div>
      {r.status === "failed" && <p className="text-sm text-danger mb-2">{r.error}</p>}
      {r.status === "ready" && (
        <>
          {b.summary && <p className="text-sm text-slate mb-2">{b.summary}</p>}
          {r.kind !== "lessons" && (
            <p className="text-xs text-slate-soft mb-3">{r.stemCount || 0} question(s) from it are kept only to block copies - the AI never writes from them.</p>
          )}
          <Field label="What the AI follows" hint="Edit it if something is off - your wording is kept">
            <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
        </>
      )}
      <div className="flex flex-wrap gap-2 mt-3">
        {r.status === "ready" && (
          <Button size="sm" loading={busy === "save"} disabled={text === (r.guideText || "")} onClick={() => act("save", () => api.patch(`/references/${r._id}`, { guideText: text }))}>
            Save changes
          </Button>
        )}
        {r.status === "ready" && (
          <Button size="sm" variant="secondary" loading={busy === "toggle"} onClick={() => act("toggle", () => api.patch(`/references/${r._id}`, { active: !r.active }))}>
            {r.active ? "Switch off" : "Switch on"}
          </Button>
        )}
        {r.status === "failed" && (
          <Button size="sm" variant="secondary" loading={busy === "retry"} onClick={() => act("retry", () => api.post(`/references/${r._id}/retry`))}>
            Try again
          </Button>
        )}
        <Button size="sm" variant="danger" loading={busy === "delete"} onClick={remove}>
          Remove
        </Button>
      </div>
    </Card>
  );
}
