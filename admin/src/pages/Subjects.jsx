import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // subject being edited, or null

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/subjects");
      setSubjects(res.data.subjects);
    } catch (err) {
      // fail quietly
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setEditing({ name: "", nameHi: "", icon: "📘", displayOrder: subjects.length + 1, chapters: [] });
  }

  function addChapter() {
    setEditing((e) => ({ ...e, chapters: [...e.chapters, { name: "", topics: [] }] }));
  }

  function updateChapter(idx, field, value) {
    setEditing((e) => {
      const chapters = [...e.chapters];
      if (field === "topics") chapters[idx] = { ...chapters[idx], topics: value.split(",").map((t) => t.trim()).filter(Boolean) };
      else chapters[idx] = { ...chapters[idx], [field]: value };
      return { ...e, chapters };
    });
  }

  function removeChapter(idx) {
    setEditing((e) => ({ ...e, chapters: e.chapters.filter((_, i) => i !== idx) }));
  }

  async function save() {
    if (!editing.name) {
      alert("Subject name daalo");
      return;
    }
    try {
      await api.post("/subjects", editing);
      setEditing(null);
      load();
    } catch (err) {
      alert("Save failed: " + (err.response?.data?.message || err.message));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl font-bold text-ink">Subjects & Chapters</h1>
        <button
          onClick={startNew}
          className="px-4 py-2 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium transition-colors"
        >
          + Add Subject
        </button>
      </div>
      <p className="text-slate-500 mb-8">
        Ye subjects aur chapters students ke "Chapter-wise Practice" mein dikhte hain. Har chapter ke topics wahi hone
        chahiye jo questions pe tag kiye gaye hain.
      </p>

      {editing && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 mb-8">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject Name</label>
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Maths"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Hindi Name</label>
              <input
                value={editing.nameHi || ""}
                onChange={(e) => setEditing({ ...editing, nameHi: e.target.value })}
                placeholder="गणित"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Icon (emoji)</label>
              <input
                value={editing.icon || ""}
                onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                placeholder="🔢"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-700">Chapters</label>
            <button type="button" onClick={addChapter} className="text-sm text-brand hover:underline">
              + Add Chapter
            </button>
          </div>
          <div className="space-y-2">
            {editing.chapters.map((ch, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-3 rounded-lg">
                <input
                  placeholder="Chapter name (e.g. Percentage)"
                  value={ch.name}
                  onChange={(e) => updateChapter(idx, "name", e.target.value)}
                  className="col-span-5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm"
                />
                <input
                  placeholder="Topics (comma-separated, must match question tags)"
                  value={(ch.topics || []).join(", ")}
                  onChange={(e) => updateChapter(idx, "topics", e.target.value)}
                  className="col-span-6 px-3 py-1.5 rounded-lg border border-slate-200 text-sm"
                />
                <button type="button" onClick={() => removeChapter(idx)} className="col-span-1 text-red-500 text-sm">
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-5">
            <button onClick={save} className="px-5 py-2.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium">
              Save Subject
            </button>
            <button onClick={() => setEditing(null)} className="px-5 py-2.5 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {subjects.map((s) => (
            <div key={s._id} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-ink text-lg">
                  {s.icon} {s.name}
                </p>
                <button onClick={() => setEditing(s)} className="text-sm text-brand hover:underline">
                  Edit
                </button>
              </div>
              <p className="text-xs text-slate-400 mb-3">{s.chapters?.length || 0} chapters</p>
              <div className="flex flex-wrap gap-1.5">
                {(s.chapters || []).map((ch, i) => (
                  <span key={i} className="text-xs bg-brand-light text-brand-dark px-2 py-0.5 rounded-full">
                    {ch.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}