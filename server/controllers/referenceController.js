const ReferenceGuide = require("../models/ReferenceGuide");
const GenerationJob = require("../models/GenerationJob");
const QueueState = require("../models/QueueState");
const { createReference } = require("../services/referenceLearning");

// Reading a reference goes through the generation queue, ahead of new
// content - it shapes everything generated after it.
async function queueRead(guide) {
  const job = { kind: "reference_read", reference: guide._id, label: `Learn from reference: ${guide.title}` };
  if (!(await GenerationJob.exists({ ...job, status: { $in: ["queued", "running"] } }))) {
    await GenerationJob.create({ ...job, status: "queued", priority: 20 });
  }
  const state = await QueueState.findOne({ key: "generation" }).lean();
  return state?.paused ? " It will be read when the generation queue is resumed." : " It is being read now - this takes a minute or two.";
}

// POST /api/references (admin) { examType, subject?, title?, pdf? | images? | text?, fileName? }
async function addReference(req, res) {
  try {
    const guide = await createReference({ ...req.body, createdBy: req.user?.name || "admin" });
    const note = await queueRead(guide);
    res.status(201).json({ message: `Reference added.${note}`, reference: { _id: guide._id, title: guide.title, status: guide.status } });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

// GET /api/references?examType= (admin)
async function listReferences(req, res) {
  const filter = req.query.examType ? { examType: req.query.examType } : {};
  const references = await ReferenceGuide.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ references });
}

// PATCH /api/references/:id (admin) { active?, guideText?, title?, subject? }
async function updateReference(req, res) {
  const guide = await ReferenceGuide.findById(req.params.id);
  if (!guide) return res.status(404).json({ message: "Reference not found" });
  const { active, guideText, title, subject } = req.body || {};
  if (typeof active === "boolean") guide.active = active;
  if (typeof title === "string" && title.trim()) guide.title = title.trim().slice(0, 120);
  if (typeof subject === "string") guide.subject = subject.trim();
  if (typeof guideText === "string") {
    guide.guideText = guideText.slice(0, 4000);
    guide.guideEdited = true;
  }
  await guide.save();
  res.json({ message: "Saved", reference: guide });
}

// POST /api/references/:id/retry (admin) - read a failed one again
async function retryReference(req, res) {
  const guide = await ReferenceGuide.findById(req.params.id).select("+payload");
  if (!guide) return res.status(404).json({ message: "Reference not found" });
  if (!guide.payload) return res.status(400).json({ message: "The file is no longer kept - add the reference again" });
  guide.status = "queued";
  guide.error = undefined;
  await guide.save();
  const note = await queueRead(guide);
  res.json({ message: `Queued again.${note}` });
}

// DELETE /api/references/:id (admin)
async function deleteReference(req, res) {
  const guide = await ReferenceGuide.findByIdAndDelete(req.params.id);
  if (!guide) return res.status(404).json({ message: "Reference not found" });
  await GenerationJob.deleteMany({ kind: "reference_read", reference: guide._id, status: "queued" });
  res.json({ message: "Reference removed - new questions no longer follow it" });
}

module.exports = { addReference, listReferences, updateReference, retryReference, deleteReference };
