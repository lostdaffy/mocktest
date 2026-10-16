import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { PageHeader, Card, Button, Badge, Field, Input, Select, Textarea, Alert, EmptyState, LoadingState } from "../components/ui";
import { useToast } from "../components/Toast";
import { RiBrainLine, RiUploadCloud2Line } from "@remixicon/react";

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
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Could not add it");
    } finally {
      setSaving(false);
    }
  }

  const examName = (t) => (t === "ALL" ? "All exams" : exams.find((x) => x.examType === t)?.displayName || t);
  const own = (refs || []).filter((r) => r.kind !== "lessons");
  const lessons = (refs || []).filter((r) => r.kind === "lessons");

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="AI References"
        subtitle="Give the AI papers that show the level you want. It learns how they are built - the level, the topic weight, the formats, the traps - and writes new questions to that standard. It never copies them."
      />

      <Alert tone="info" className="mb-6">
        What the AI keeps from a reference is a description of how it is built (shown on each card below - you can edit it). The
        reference's own questions are never given to the AI to write from; they are kept only to throw out any new question that
        copies one, even with the numbers changed.
      </Alert>

      <Card className="mb-8">
        <form onSubmit={add} className="grid gap-4 md:grid-cols-2">
          <Field label="Exam">
            <Select value={form.examType} onChange={(e) => setForm({ ...form, examType: e.target.value })}>
              <option value="">Choose...</option>
              <option value="ALL">All exams</option>
              {exams.map((x) => (
                <option key={x.examType} value={x.examType}>{x.displayName}</option>
              ))}
            </Select>
          </Field>
          <Field label="Subject" hint="Leave empty if the reference covers the whole paper">
            <Select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
              <option value="">Whole paper</option>
              {subjects.map((s) => (
                <option key={s._id || s.name} value={s.name}>{s.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Name" hint="So you can recognise it later">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Coaching mock - PET set 3" />
          </Field>
          <Field label="What are you giving">
            <Select value={form.mode} onChange={(e) => { setForm({ ...form, mode: e.target.value }); setFiles([]); }}>
              <option value="pdf">A PDF</option>
              <option value="images">Screenshots / photos (up to 12)</option>
              <option value="text">Pasted text</option>
            </Select>
          </Field>
          <div className="md:col-span-2">
            {form.mode === "text" ? (
              <Textarea rows={8} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Paste the questions or notes here" />
            ) : (
              <input
                ref={fileInput}
                type="file"
                accept={form.mode === "pdf" ? "application/pdf" : "image/png,image/jpeg,image/webp"}
                multiple={form.mode === "images"}
                onChange={(e) => setFiles([...e.target.files])}
                className="block w-full text-sm"
              />
            )}
          </div>
          <div className="md:col-span-2">
            <Button type="submit" loading={saving} icon={RiUploadCloud2Line}>Add reference</Button>
          </div>
        </form>
      </Card>

      {refs === null ? (
        <LoadingState />
      ) : (
        <>
          <h2 className="text-lg font-semibold text-ink mb-3">Your references ({own.length})</h2>
          {own.length === 0 ? (
            <EmptyState icon={RiBrainLine} title="No references yet" text="Add a mock or past paper above to set the standard." />
          ) : (
            <div className="space-y-4 mb-10">
              {own.map((r) => <ReferenceCard key={r._id} r={r} examName={examName} onChange={load} />)}
            </div>
          )}

          <h2 className="text-lg font-semibold text-ink mb-1">Learned from its own mistakes</h2>
          <p className="text-sm text-slate mb-3">
            Once a day the AI reads why its questions were thrown out - by the checks, by you, or by students' answers - and writes
            lessons for itself, subject by subject.
          </p>
          {lessons.length === 0 ? (
            <p className="text-sm text-slate-soft mb-6">Nothing yet - lessons appear once a subject has a few rejected questions.</p>
          ) : (
            <div className="space-y-4">
              {lessons.map((r) => <ReferenceCard key={r._id} r={r} examName={examName} onChange={load} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReferenceCard({ r, examName, onChange }) {
  const toast = useToast();
  const [text, setText] = useState(r.guideText || "");
  const [busy, setBusy] = useState("");
  const st = STATUS[r.status] || STATUS.queued;
  const b = r.blueprint || {};

  useEffect(() => setText(r.guideText || ""), [r.guideText]);

  async function act(kind, fn) {
    setBusy(kind);
    try {
      const res = await fn();
      toast.success(res.data.message || "Done");
      onChange();
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    const ok = await toast.confirm({ title: `Remove "${r.title}"?`, message: "New questions stop following it. Questions already made stay.", confirmLabel: "Remove", danger: true });
    if (ok) act("delete", () => api.delete(`/references/${r._id}`));
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="font-semibold text-ink">{r.title}</span>
        <Badge tone={st.tone} dot>{st.label}</Badge>
        <Badge tone="brand">{examName(r.examType)}</Badge>
        {r.subject && <Badge>{r.subject}</Badge>}
        {!r.active && <Badge tone="warn">Switched off</Badge>}
      </div>
      {r.status === "failed" && <p className="text-sm text-danger mb-2">{r.error}</p>}
      {r.status === "ready" && (
        <>
          {b.summary && <p className="text-sm text-slate mb-2">{b.summary}</p>}
          {r.kind !== "lessons" && (
            <p className="text-xs text-slate-soft mb-3">
              {r.stemCount || 0} question(s) from it are kept only to block copies - the AI never writes from them.
            </p>
          )}
          <Field label="What the AI follows" hint="Edit it if something is off - your wording is kept">
            <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} />
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
        <Button size="sm" variant="danger" loading={busy === "delete"} onClick={remove}>Remove</Button>
      </div>
    </Card>
  );
}
