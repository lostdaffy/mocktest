import { useCallback, useEffect, useState } from "react";
import api from "../api/axios";
import { PageHeader, Badge, Button, EmptyState, LoadingState } from "../components/ui";
import { useToast } from "../components/Toast";
import { imageUrl } from "../components/QuestionVisual";
import { RiImageLine } from "@remixicon/react";

// Figure questions waiting for their picture.
//
// Each card has the exact prompt for an image AI (copy it, generate the
// picture elsewhere, upload it here) and a reference drawing made by code
// from the same description - put the two side by side and check every box
// before uploading. A test holding any of these cannot be published.
//
// "Use the reference drawing" uploads the code-drawn picture itself, which
// is always exactly right, if the AI's picture is not.

const MAX_SIDE = 1200;

// Shrinks a picture in the browser before it is sent: longest side at most
// MAX_SIDE, WebP (or JPEG where the browser cannot write WebP). A phone
// screenshot of several MB becomes tens of KB.
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That file could not be read as a picture"));
    img.src = src;
  });
}

async function toUpload(img, { lossless = false } = {}) {
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  const w = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
  const h = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  let dataUrl = lossless ? canvas.toDataURL("image/png") : canvas.toDataURL("image/webp", 0.85);
  if (!lossless && !dataUrl.startsWith("data:image/webp")) dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { dataUrl, width: w, height: h, kb: Math.round((dataUrl.length * 3) / 4 / 1024) };
}

const svgSrc = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

function FigureCard({ q, onChanged }) {
  const toast = useToast();
  const [showPrompt, setShowPrompt] = useState(false);
  const [busy, setBusy] = useState(null);
  const [preview, setPreview] = useState(null); // a picture chosen but not yet uploaded

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(q.prompt);
      toast.success("Prompt copied - paste it into the image AI");
    } catch {
      setShowPrompt(true);
      toast.error("Couldn't copy automatically - select the prompt below and copy it");
    }
  }

  async function choose(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\//.test(file.type)) return toast.error("Choose a picture file");
    try {
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      URL.revokeObjectURL(url);
      setPreview(await toUpload(img));
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function useReference() {
    try {
      const img = await loadImage(svgSrc(q.svg));
      setPreview(await toUpload(img, { lossless: true }));
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function upload() {
    setBusy("upload");
    try {
      const res = await api.post(`/question-images/question/${q._id}`, preview);
      toast.success(res.data?.message || "Uploaded");
      setPreview(null);
      onChanged(res.data.question);
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    const ok = await toast.confirm({
      title: "Remove this picture?",
      message: "The question goes back on the pending list, and its tests cannot be published until a new one is uploaded.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    setBusy("remove");
    try {
      const res = await api.delete(`/question-images/question/${q._id}`);
      toast.success(res.data?.message || "Removed");
      onChanged({ ...q, imageId: null, uploadedAt: null });
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't remove it");
    } finally {
      setBusy(null);
    }
  }

  const current = preview?.dataUrl || (q.imageId ? imageUrl(q.imageId) : null);

  return (
    <div className="rv-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-ink">{q.text}</p>
          {q.textHi && <p className="text-sm text-slate mt-0.5">{q.textHi}</p>}
          <p className="text-xs text-slate-soft mt-1.5">
            {q.subject} · {q.chapter || q.topic} · answer <b className="text-ink">{q.options?.[q.correctIndex]}</b>
            {q.answerCheck === "checked" ? (
              <span className="text-success"> · answer checked by computer</span>
            ) : (
              <span className="text-warn"> · check the answer by eye</span>
            )}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {q.tests.length ? (
              q.tests.map((t) => (
                <Badge key={t._id} tone={t.publishStatus === "published" ? "success" : "warn"}>
                  {t.title}
                  {t.publishStatus !== "published" ? " (draft)" : ""}
                </Badge>
              ))
            ) : (
              <Badge tone="neutral">Not in a test yet</Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button size="sm" variant="secondary" onClick={copyPrompt} disabled={!q.prompt}>
            Copy prompt
          </Button>
          <label className="rv-btn-primary !py-1.5 !px-3 text-xs cursor-pointer">
            {q.imageId ? "Replace picture" : "Choose picture"}
            <input type="file" accept="image/*" className="hidden" onChange={choose} />
          </label>
        </div>
      </div>

      {q.specProblem && (
        <p className="mt-3 text-sm text-danger bg-danger-light rounded-lg px-3 py-2">This figure's description is broken ({q.specProblem}). Delete the question instead.</p>
      )}

      <button onClick={() => setShowPrompt((s) => !s)} className="text-xs text-brand hover:underline mt-3">
        {showPrompt ? "Hide prompt" : "Show prompt"}
      </button>
      {showPrompt && (
        <pre className="mt-2 text-xs whitespace-pre-wrap bg-slate-light rounded-lg p-3 max-h-72 overflow-auto text-ink-soft select-all">{q.prompt}</pre>
      )}

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div>
          <p className="text-xs font-semibold text-slate-soft uppercase tracking-wide mb-1.5">Reference (drawn by code - always correct)</p>
          {q.svg ? <img src={svgSrc(q.svg)} alt="Reference drawing" className="w-full rounded border border-border-soft bg-white" /> : null}
          {q.svg && !q.imageId && (
            <button onClick={useReference} className="text-xs text-brand hover:underline mt-1.5">
              Use the reference drawing as the picture
            </button>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-soft uppercase tracking-wide mb-1.5">
            {preview ? `Ready to upload (${preview.width}×${preview.height}, ${preview.kb} KB)` : q.imageId ? "Uploaded picture" : "Picture"}
          </p>
          {current ? (
            <img src={current} alt="Uploaded figure" className="w-full rounded border border-border-soft bg-white" />
          ) : (
            <div className="h-40 rounded border-2 border-dashed border-border-soft flex items-center justify-center text-sm text-slate-soft text-center px-4">
              Copy the prompt, make the picture with an image AI, then choose it here. Compare it box by box with the reference.
            </div>
          )}
          {preview && (
            <div className="flex gap-2 mt-2">
              <Button size="sm" loading={busy === "upload"} onClick={upload}>
                Upload - it matches the reference
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>
                Cancel
              </Button>
            </div>
          )}
          {!preview && q.imageId && (
            <button onClick={remove} disabled={busy === "remove"} className="text-xs text-danger hover:underline mt-1.5">
              Remove picture
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ImagesPending() {
  const toast = useToast();
  const [status, setStatus] = useState("pending");
  const [data, setData] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (skip = 0) => {
      const res = await api.get("/question-images/figures", { params: { status, skip, limit: 20 } });
      setData((d) => (skip && d ? { ...res.data, questions: [...d.questions, ...res.data.questions] } : res.data));
    },
    [status]
  );

  useEffect(() => {
    setData(null);
    load().catch(() => toast.error("Couldn't load the figure questions"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function changed(updated) {
    setData((d) => {
      if (!d) return d;
      const moved = status === "pending" ? !!updated.imageId : !updated.imageId;
      return {
        ...d,
        pendingCount: d.pendingCount + (moved ? (status === "pending" ? -1 : 1) : 0),
        uploadedCount: d.uploadedCount + (moved ? (status === "pending" ? 1 : -1) : 0),
        questions: moved ? d.questions.filter((q) => q._id !== updated._id) : d.questions.map((q) => (q._id === updated._id ? updated : q)),
      };
    });
  }

  async function more() {
    setLoadingMore(true);
    try {
      await load(data.questions.length);
    } finally {
      setLoadingMore(false);
    }
  }

  const total = status === "pending" ? data?.pendingCount : data?.uploadedCount;

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Images pending"
        subtitle="Figure-reasoning questions need a picture. Copy each prompt into an image AI, check the result box by box against the reference drawing, then upload it. A test with a missing picture cannot be published."
      />

      <div className="flex gap-2 mb-6">
        {[
          ["pending", "Waiting for a picture", data?.pendingCount],
          ["uploaded", "Uploaded", data?.uploadedCount],
        ].map(([key, label, n]) => (
          <button
            key={key}
            onClick={() => setStatus(key)}
            className={`px-4 py-2 rounded-full text-sm border ${
              status === key ? "bg-brand text-white border-brand" : "bg-surface text-ink-soft border-border-soft hover:border-brand"
            }`}
          >
            {label}
            {typeof n === "number" && <span className="ml-1.5 opacity-80">{n}</span>}
          </button>
        ))}
      </div>

      {!data ? (
        <LoadingState />
      ) : data.questions.length === 0 ? (
        <EmptyState
          icon={RiImageLine}
          title={status === "pending" ? "No picture is missing" : "No pictures uploaded yet"}
          text={
            status === "pending"
              ? "Every figure question has its picture. New ones appear here when a figure chapter's test is built."
              : "Uploaded pictures appear here, newest first."
          }
        />
      ) : (
        <div className="space-y-5">
          {data.questions.map((q) => (
            <FigureCard key={q._id} q={q} onChanged={changed} />
          ))}
          {data.questions.length < (total || 0) && (
            <div className="text-center">
              <Button variant="secondary" loading={loadingMore} onClick={more}>
                Show more ({total - data.questions.length} left)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
